from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from functools import wraps

from extensions import db
from models import Training, Employee, BaseUser, Department
from utils import paginate_query

training_bp = Blueprint("training_bp", __name__)

ALLOWED_ROLES = ["admin", "HR Director", "HR Manager", "Training Coordinator"]


def with_token(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            token = get_jwt()
        except Exception:
            token = None
        return func(*args, token_response=token, **kwargs)
    return wrapper


def _get_current_user():
    user_id = int(get_jwt_identity())
    return BaseUser.query.get(user_id)


def _has_access(user):
    # ASSUMPTION: role is stored as a plain string on user.role.
    # Verify against your actual permission model.
    if not user:
        return False
    role = (user.role or "").strip().lower()
    return role in [r.lower() for r in ALLOWED_ROLES]


def _parse_date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _parse_int(value):
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _parse_bool(value):
    if value is None:
        return None
    return str(value).strip().lower() in ("true", "1", "yes")


@training_bp.route("/", methods=["GET"])
@jwt_required()
@with_token
def list_training(token_response):
    current_user = _get_current_user()
    if not _has_access(current_user):
        return jsonify({"message": "Access denied"}), 403

    query = Training.query

    # Active / Inactive / All record-status filter, used by the
    # Active/Deactivated/All tabs on TrainingProgramListPage.
    is_active_param = request.args.get("is_active")
    parsed_is_active = _parse_bool(is_active_param)
    if parsed_is_active is not None:
        query = query.filter_by(is_active=parsed_is_active)

    if request.args.get("employee_id"):
        query = query.filter_by(employee_id=request.args.get("employee_id"))

    if request.args.get("status"):
        query = query.filter_by(status=request.args.get("status"))

    # Day-to-day: a training program is "on" a given date if that date
    # falls within [start_date, end_date] inclusive.
    single_date_str = request.args.get("training_date")
    if single_date_str:
        single_date = _parse_date(single_date_str)
        if single_date is None:
            return jsonify({"message": "Invalid date format. Use YYYY-MM-DD."}), 400
        query = query.filter(Training.start_date <= single_date, Training.end_date >= single_date)

    # Monthly / Quarterly: overlap logic, identical to
    # Leave.generate_leave_report - a training program overlaps the
    # requested period if it starts on/before the period ends AND
    # ends on/after the period starts.
    from_date_str = request.args.get("from_date")
    to_date_str = request.args.get("to_date")
    if from_date_str or to_date_str:
        from_date = _parse_date(from_date_str)
        to_date = _parse_date(to_date_str)
        if from_date_str and from_date is None:
            return jsonify({"message": "Invalid from_date format. Use YYYY-MM-DD."}), 400
        if to_date_str and to_date is None:
            return jsonify({"message": "Invalid to_date format. Use YYYY-MM-DD."}), 400

        if from_date and to_date:
            query = query.filter(Training.start_date <= to_date, Training.end_date >= from_date)
        elif from_date:
            query = query.filter(Training.end_date >= from_date)
        elif to_date:
            query = query.filter(Training.start_date <= to_date)

    # Organization filters (Company -> Branch -> Department ->
    # Designation) via Training -> Employee -> Department ->
    # Branch/Company, same join pattern as leaves_bp.py /
    # attendance_bp.py.
    company_id = _parse_int(request.args.get("company_id"))
    branch_id = _parse_int(request.args.get("branch_id"))
    department_id = _parse_int(request.args.get("department_id"))
    designation_id = _parse_int(request.args.get("designation_id"))

    if company_id or branch_id or department_id or designation_id:
        query = query.join(Employee, Training.employee_id == Employee.id)

        if department_id:
            query = query.filter(Employee.department_id == department_id)

        if designation_id:
            query = query.filter(Employee.designation_id == designation_id)

        if company_id or branch_id:
            query = query.join(Department, Employee.department_id == Department.id)

            if company_id:
                query = query.filter(Department.company_id == company_id)

            if branch_id:
                query = query.filter(Department.branch_id == branch_id)

    return jsonify({
        "message": "Training list fetched",
        "data": paginate_query(query, request.args),
        "token_response": token_response,
    }), 200


@training_bp.route("/<int:training_id>", methods=["GET"])
@jwt_required()
@with_token
def get_training(training_id, token_response):
    current_user = _get_current_user()
    if not _has_access(current_user):
        return jsonify({"message": "Access denied"}), 403

    training = Training.query.get(training_id)
    if not training:
        return jsonify({"message": "Training program not found"}), 404
    return jsonify({"message": "Training program fetched", "data": training.to_dict(), "token_response": token_response}), 200


@training_bp.route("/", methods=["POST"])
@jwt_required()
@with_token
def create_training(token_response):
    current_user = _get_current_user()
    if not _has_access(current_user):
        return jsonify({"message": "Access denied"}), 403

    data = request.json or {}
    start_date = _parse_date(data.get("start_date"))
    end_date = _parse_date(data.get("end_date"))
    if not start_date or not end_date:
        return jsonify({"message": "start_date and end_date are required (YYYY-MM-DD)"}), 400
    if end_date < start_date:
        return jsonify({"message": "end_date cannot be before start_date"}), 400

    training = Training(
        employee_id=data.get("employee_id"),
        program_name=data.get("program_name"),
        start_date=start_date,
        end_date=end_date,
        status=data.get("status", "Scheduled"),
        is_active=True,
    )
    db.session.add(training)
    db.session.commit()

    return jsonify({"message": "Training program created", "data": training.to_dict(), "token_response": token_response}), 201


@training_bp.route("/<int:training_id>", methods=["PUT"])
@jwt_required()
@with_token
def update_training(training_id, token_response):
    current_user = _get_current_user()
    if not _has_access(current_user):
        return jsonify({"message": "Access denied"}), 403

    training = Training.query.get(training_id)
    if not training:
        return jsonify({"message": "Training program not found"}), 404

    data = request.json or {}
    for field in ["employee_id", "program_name", "status", "is_active"]:
        if field in data:
            setattr(training, field, data[field])

    if "start_date" in data:
        parsed = _parse_date(data["start_date"])
        if parsed is None:
            return jsonify({"message": "Invalid start_date format"}), 400
        training.start_date = parsed
    if "end_date" in data:
        parsed = _parse_date(data["end_date"])
        if parsed is None:
            return jsonify({"message": "Invalid end_date format"}), 400
        training.end_date = parsed

    db.session.commit()
    return jsonify({"message": "Training program updated", "data": training.to_dict(), "token_response": token_response}), 200


@training_bp.route("/<int:training_id>/deactivate", methods=["DELETE"])
@jwt_required()
@with_token
def deactivate_training(training_id, token_response):
    current_user = _get_current_user()
    if not _has_access(current_user):
        return jsonify({"message": "Access denied"}), 403

    training = Training.query.get(training_id)
    if not training:
        return jsonify({"message": "Training program not found"}), 404

    training.is_active = False
    db.session.commit()
    return jsonify({"message": "Training program deactivated", "data": training.to_dict(), "token_response": token_response}), 200