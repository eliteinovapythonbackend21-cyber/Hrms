from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from extensions import db
from models import BaseUser, Employee, Leave, LeaveType
from utils import paginate_query, apply_search_filters

leave_bp = Blueprint("leave_bp", __name__)


def _is_admin(user):
    return user and user.role == "admin"


def _get_current_user():
    current_user_id = int(get_jwt_identity())
    return BaseUser.query.get(current_user_id)


def _get_request_data():
    if request.is_json:
        return request.get_json(silent=True) or {}
    return request.form.to_dict()


def _parse_date(date_str):
    if not date_str:
        return None
    if isinstance(date_str, date):
        return date_str
    try:
        return datetime.fromisoformat(date_str).date()
    except ValueError:
        return None


def _fetch_leave(leave_id):
    if leave_id is None:
        return None, (jsonify({"message": "leave_id is required"}), 400)
    try:
        leave_id = int(leave_id)
    except (TypeError, ValueError):
        return None, (jsonify({"message": "Invalid leave_id"}), 400)

    leave = Leave.query.get(leave_id)
    if not leave:
        return None, (jsonify({"message": "Leave record not found for the provided id"}), 404)
    return leave, None


def _authorize_leave_action(leave):
    current_user = _get_current_user()
    if not current_user:
        return False, None, (jsonify({"message": "Invalid token"}), 401)
    if _is_admin(current_user) or (leave.employee and leave.employee.user_id == current_user.id):
        return True, current_user, None
    return False, None, (jsonify({"message": "Leave is not associated with this user"}), 403)


ALLOWED_LEAVE_STATUSES = {"Pending", "Approved", "Rejected"}


def _define_total_days(from_date, to_date, provided_total_days=None):
    if from_date is None or to_date is None:
        return None
    if to_date < from_date:
        return None
    if provided_total_days is not None:
        try:
            return int(provided_total_days)
        except (TypeError, ValueError):
            return None
    return (to_date - from_date).days + 1


def _validate_leave_type_eligibility(leave_type):
    if not leave_type or not leave_type.is_active:
        return False, "Leave type not found or inactive"
    return True, None


def _leave_overlaps_existing(employee_id, from_date, to_date, exclude_leave_id=None):
    if from_date is None or to_date is None:
        return False
    query = Leave.query.filter(
        Leave.employee_id == employee_id,
        Leave.is_active == True,
        Leave.status.in_(["Pending", "Approved"]),
        Leave.from_date <= to_date,
        Leave.to_date >= from_date,
    )
    if exclude_leave_id is not None:
        query = query.filter(Leave.id != exclude_leave_id)
    return query.first() is not None


@leave_bp.route("/", methods=["GET"])
@jwt_required()
def list_leaves():
    current_user = _get_current_user()
    query = Leave.query.join(LeaveType, isouter=True)

    if not _is_admin(current_user):
        if not current_user.employee:
            return jsonify({"message": "Employee record not found for current user"}), 404
        query = query.filter(Leave.employee_id == current_user.employee.id)

    leave_type_filter = request.args.get("leave_type")
    if leave_type_filter:
        if leave_type_filter.isdigit():
            query = query.filter(Leave.leave_type_id == int(leave_type_filter))
        else:
            query = query.filter(LeaveType.name.ilike(f"%{leave_type_filter}%"))

    query = apply_search_filters(query, request.args, ["status"])
    return jsonify({"message": "Leaves fetched", "data": paginate_query(query, request.args), "token_response": get_jwt()}), 200


@leave_bp.route("/<int:leave_id>", methods=["GET"])
@jwt_required()
def get_leave(leave_id):
    leave, error_response = _fetch_leave(leave_id)
    if error_response:
        return error_response

    authorized, current_user, error_response = _authorize_leave_action(leave)
    if not authorized:
        return error_response

    return jsonify({"message": "Leave fetched", "data": leave.to_dict(), "token_response": get_jwt()}), 200


@leave_bp.route("/", methods=["POST"])
@jwt_required()
def create_leave():
    current_user = _get_current_user()
    data = _get_request_data()

    employee_id = data.get("employee_id")
    if not employee_id:
        if not current_user.employee:
            return jsonify({"message": "Employee record not found for current user"}), 404
        employee_id = current_user.employee.id

    if not _is_admin(current_user) and current_user.employee and int(employee_id) != current_user.employee.id:
        return jsonify({"message": "Admin privileges required to create leave for another employee"}), 403

    employee = Employee.query.get(employee_id)
    if not employee:
        return jsonify({"message": "Employee not found"}), 404

    leave_type_id = data.get("leave_type_id")
    if leave_type_id is None:
        return jsonify({"message": "leave_type_id is required"}), 400

    try:
        leave_type_id = int(leave_type_id)
    except (TypeError, ValueError):
        return jsonify({"message": "leave_type_id must be an integer"}), 400

    leave_type = LeaveType.query.get(leave_type_id)
    if not leave_type or not leave_type.is_active:
        return jsonify({"message": "Leave type not found or inactive"}), 404

    from_date = _parse_date(data.get("from_date"))
    to_date = _parse_date(data.get("to_date"))
    if from_date is None or to_date is None:
        return jsonify({"message": "from_date and to_date are required and must be valid ISO dates"}), 400

    total_days = _define_total_days(from_date, to_date, data.get("total_days"))
    if total_days is None:
        return jsonify({"message": "Invalid total_days or date range"}), 400

    status = data.get("status", "Pending")
    if status not in ALLOWED_LEAVE_STATUSES:
        return jsonify({"message": f"status must be one of {sorted(ALLOWED_LEAVE_STATUSES)}"}), 400
    if not _is_admin(current_user) and status != "Pending":
        return jsonify({"message": "Admin privileges required to set leave status"}), 403

    if _leave_overlaps_existing(employee.id, from_date, to_date):
        return jsonify({"message": "Leave request overlaps an existing pending or approved leave"}), 409

    leave = Leave(
        employee_id=employee_id,
        leave_type_id=leave_type.id,
        from_date=from_date,
        to_date=to_date,
        total_days=total_days,
        reason=data.get("reason"),
        status=status,
        is_active=True,
    )
    db.session.add(leave)
    db.session.commit()

    return jsonify({"message": "Leave created", "data": leave.to_dict(), "token_response": get_jwt()}), 201


@leave_bp.route("/<int:leave_id>", methods=["PUT"])
@jwt_required()
def update_leave(leave_id):
    leave, error_response = _fetch_leave(leave_id)
    if error_response:
        return error_response

    authorized, current_user, error_response = _authorize_leave_action(leave)
    if not authorized:
        return error_response

    data = _get_request_data()
    if "from_date" in data or "to_date" in data:
        from_date = _parse_date(data.get("from_date") or leave.from_date)
        to_date = _parse_date(data.get("to_date") or leave.to_date)
        if from_date is None or to_date is None:
            return jsonify({"message": "from_date and to_date must be valid ISO dates"}), 400
        leave.total_days = _define_total_days(from_date, to_date, data.get("total_days"))
        if leave.total_days is None:
            return jsonify({"message": "Invalid total_days or date range"}), 400
        leave.from_date = from_date
        leave.to_date = to_date

    if "leave_type_id" in data:
        try:
            leave_type_id = int(data.get("leave_type_id"))
        except (TypeError, ValueError):
            return jsonify({"message": "leave_type_id must be an integer"}), 400

        leave_type = LeaveType.query.get(leave_type_id)
        valid, error_message = _validate_leave_type_eligibility(leave_type)
        if not valid:
            return jsonify({"message": error_message}), 404
        leave.leave_type_id = leave_type.id

    if "status" in data:
        status_value = data.get("status")
        if status_value not in ALLOWED_LEAVE_STATUSES:
            return jsonify({"message": f"status must be one of {sorted(ALLOWED_LEAVE_STATUSES)}"}), 400
        if not _is_admin(current_user):
            return jsonify({"message": "Admin privileges required to change leave status"}), 403
        leave.status = status_value

    if _leave_overlaps_existing(leave.employee_id, leave.from_date, leave.to_date, exclude_leave_id=leave.id) and leave.status != "Rejected":
        return jsonify({"message": "Leave request overlaps an existing pending or approved leave"}), 409

    if "employee_id" in data and _is_admin(current_user):
        try:
            employee_id = int(data.get("employee_id"))
        except (TypeError, ValueError):
            return jsonify({"message": "employee_id must be an integer"}), 400
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({"message": "Employee not found for provided employee_id"}), 404
        leave.employee_id = employee.id

    db.session.commit()
    return jsonify({"message": "Leave updated", "data": leave.to_dict(), "token_response": get_jwt()}), 200


def _set_leave_status(leave, status):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return None, (jsonify({"message": "Admin privileges required"}), 403)
    if status not in {"Approved", "Rejected"}:
        return None, (jsonify({"message": "Invalid leave status"}), 400)
    if status == "Approved" and _leave_overlaps_existing(leave.employee_id, leave.from_date, leave.to_date, exclude_leave_id=leave.id):
        return None, (jsonify({"message": "Leave approval overlaps another pending or approved leave"}), 409)
    leave.status = status
    db.session.commit()
    return leave, None


@leave_bp.route("/<int:leave_id>/approve", methods=["POST"])
@jwt_required()
def approve_leave(leave_id):
    leave, error_response = _fetch_leave(leave_id)
    if error_response:
        return error_response

    approved_leave, error_response = _set_leave_status(leave, "Approved")
    if error_response:
        return error_response
    return jsonify({"message": "Leave approved", "data": approved_leave.to_dict(), "token_response": get_jwt()}), 200


@leave_bp.route("/<int:leave_id>/reject", methods=["POST"])
@jwt_required()
def reject_leave(leave_id):
    leave, error_response = _fetch_leave(leave_id)
    if error_response:
        return error_response

    rejected_leave, error_response = _set_leave_status(leave, "Rejected")
    if error_response:
        return error_response
    return jsonify({"message": "Leave rejected", "data": rejected_leave.to_dict(), "token_response": get_jwt()}), 200


@leave_bp.route("/<int:leave_id>", methods=["DELETE"])
@jwt_required()
def delete_leave(leave_id):
    leave, error_response = _fetch_leave(leave_id)
    if error_response:
        return error_response

    authorized, current_user, error_response = _authorize_leave_action(leave)
    if not authorized:
        return error_response

    leave.is_active = False
    db.session.commit()
    return jsonify({"message": "Leave deactivated", "token_response": get_jwt()}), 200
