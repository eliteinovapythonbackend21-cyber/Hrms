from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy.exc import IntegrityError
from extensions import db
from models import BaseUser, Department, Designation, LeaveType
from utils import paginate_query, apply_search_filters

master_bp = Blueprint("master_bp", __name__)


def _is_admin(user):
    return user and user.role == "admin"


def _fetch_department(department_id):
    if department_id is None:
        return None, (jsonify({"message": "department_id is required"}), 400)
    try:
        department_id = int(department_id)
    except (TypeError, ValueError):
        return None, (jsonify({"message": "Invalid department_id"}), 400)

    department = Department.query.get(department_id)
    if not department:
        return None, (jsonify({"message": "Department not found for the provided id"}), 404)
    return department, None


def _fetch_designation(designation_id):
    if designation_id is None:
        return None, (jsonify({"message": "designation_id is required"}), 400)
    try:
        designation_id = int(designation_id)
    except (TypeError, ValueError):
        return None, (jsonify({"message": "Invalid designation_id"}), 400)

    designation = Designation.query.get(designation_id)
    if not designation:
        return None, (jsonify({"message": "Designation not found for the provided id"}), 404)
    return designation, None


def _fetch_leave_type(leave_type_id):
    if leave_type_id is None:
        return None, (jsonify({"message": "leave_type_id is required"}), 400)
    try:
        leave_type_id = int(leave_type_id)
    except (TypeError, ValueError):
        return None, (jsonify({"message": "Invalid leave_type_id"}), 400)

    leave_type = LeaveType.query.get(leave_type_id)
    if not leave_type:
        return None, (jsonify({"message": "Leave type not found for the provided id"}), 404)
    return leave_type, None


def _get_current_user():
    user_id = int(get_jwt_identity())
    return BaseUser.query.get(user_id)


def _handle_integrity_error(exc, duplicates=None):
    db.session.rollback()
    orig = str(exc.orig).lower() if getattr(exc, "orig", None) else str(exc).lower()
    if duplicates:
        for key, message in duplicates.items():
            if key in orig:
                return jsonify({"message": message}), 409
    return jsonify({"message": "Database integrity error"}), 400


from functools import wraps


def with_token(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            token = get_jwt()
        except Exception:
            token = None
        return func(*args, token_response=token, **kwargs)

    return wrapper


@master_bp.route("/departments", methods=["GET"])
@jwt_required()
@with_token
def list_departments(token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403
    query = Department.query
    query = apply_search_filters(query, request.args, ["department_name", "department_code"])
    return jsonify({"message": "Departments fetched", "data": paginate_query(query, request.args), "token_response": token_response}), 200


@master_bp.route("/departments", methods=["POST"])
@jwt_required()
@with_token
def create_department(token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    data = request.json or {}
    department = Department(
        department_code=data.get("department_code"),
        department_name=data.get("department_name"),
        description=data.get("description"),
        status=data.get("status", True),
    )
    db.session.add(department)
    try:
        db.session.commit()
    except IntegrityError as exc:
        return _handle_integrity_error(exc, {
            "departments_department_code_key": "Department code already exists",
            "department_code": "Department code already exists",
            "departments_department_name_key": "Department name already exists",
            "department_name": "Department name already exists",
        })
    return jsonify({"message": "Department created", "data": department.to_dict(), "token_response": token_response}), 201


@master_bp.route("/departments/<int:department_id>", methods=["PUT"])
@jwt_required()
@with_token
def update_department(department_id, token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    department, error_response = _fetch_department(department_id)
    if error_response:
        return error_response
    data = request.json or {}
    for field in ["department_code", "department_name", "description", "status"]:
        if field in data:
            setattr(department, field, data[field])
    try:
        db.session.commit()
    except IntegrityError as exc:
        return _handle_integrity_error(exc, {
            "departments_department_code_key": "Department code already exists",
            "department_code": "Department code already exists",
            "departments_department_name_key": "Department name already exists",
            "department_name": "Department name already exists",
        })
    return jsonify({"message": "Department updated", "data": department.to_dict(), "token_response": token_response}), 200


@master_bp.route("/departments/<int:department_id>", methods=["DELETE"])
@jwt_required()
@with_token
def delete_department(department_id, token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    department, error_response = _fetch_department(department_id)
    if error_response:
        return error_response
    department.is_active = False
    db.session.commit()
    return jsonify({"message": "Department deactivated", "token_response": token_response}), 200


@master_bp.route("/designations", methods=["GET"])
@jwt_required()
@with_token
def list_designations(token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    query = Designation.query
    query = apply_search_filters(query, request.args, ["designation_name", "designation_code"])
    return jsonify({"message": "Designations fetched", "data": paginate_query(query, request.args), "token_response": token_response}), 200


@master_bp.route("/designations", methods=["POST"])
@jwt_required()
@with_token
def create_designation(token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    data = request.json or {}
    designation = Designation(
        designation_code=data.get("designation_code"),
        designation_name=data.get("designation_name"),
        department_id=data.get("department_id"),
        description=data.get("description"),
        status=data.get("status", True),
    )
    db.session.add(designation)
    try:
        db.session.commit()
    except IntegrityError as exc:
        return _handle_integrity_error(exc, {
            "designations_designation_code_key": "Designation code already exists",
            "designation_code": "Designation code already exists",
            "uq_designation_department": "Designation name already exists for this department",
            "designation_name": "Designation name already exists for this department",
        })
    return jsonify({"message": "Designation created", "data": designation.to_dict(), "token_response": token_response}), 201


@master_bp.route("/designations/<int:designation_id>", methods=["PUT"])
@jwt_required()
@with_token
def update_designation(designation_id, token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    designation, error_response = _fetch_designation(designation_id)
    if error_response:
        return error_response
    data = request.json or {}
    for field in ["designation_code", "designation_name", "department_id", "description", "status"]:
        if field in data:
            setattr(designation, field, data[field])
    try:
        db.session.commit()
    except IntegrityError as exc:
        return _handle_integrity_error(exc, {
            "designations_designation_code_key": "Designation code already exists",
            "designation_code": "Designation code already exists",
            "uq_designation_department": "Designation name already exists for this department",
            "designation_name": "Designation name already exists for this department",
        })
    return jsonify({"message": "Designation updated", "data": designation.to_dict(), "token_response": token_response}), 200


@master_bp.route("/designations/<int:designation_id>", methods=["DELETE"])
@jwt_required()
@with_token
def delete_designation(designation_id, token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    designation, error_response = _fetch_designation(designation_id)
    if error_response:
        return error_response
    designation.is_active = False
    db.session.commit()
    return jsonify({"message": "Designation deactivated", "token_response": token_response}), 200


@master_bp.route("/leave-types", methods=["GET"])
@jwt_required()
@with_token
def list_leave_types(token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    query = LeaveType.query
    query = apply_search_filters(query, request.args, ["name"])
    return jsonify({"message": "Leave types fetched", "data": paginate_query(query, request.args), "token_response": token_response}), 200


@master_bp.route("/leave-types", methods=["POST"])
@jwt_required()
@with_token
def create_leave_type(token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    data = request.json or {}
    leave_type = LeaveType(
        name=data.get("name"),
        is_active=data.get("is_active", True),
    )
    db.session.add(leave_type)
    try:
        db.session.commit()
    except IntegrityError as exc:
        return _handle_integrity_error(exc, {
            "leave_types_name_key": "Leave type already exists",
            "leave_types_name": "Leave type already exists",
            "name": "Leave type already exists",
        })

    return jsonify({"message": "Leave type created", "data": leave_type.to_dict(), "token_response": token_response}), 201


@master_bp.route("/leave-types/<int:leave_type_id>", methods=["PUT"])
@jwt_required()
@with_token
def update_leave_type(leave_type_id, token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    leave_type, error_response = _fetch_leave_type(leave_type_id)
    if error_response:
        return error_response
    data = request.json or {}
    for field in ["name", "is_active"]:
        if field in data:
            setattr(leave_type, field, data[field])
    try:
        db.session.commit()
    except IntegrityError as exc:
        return _handle_integrity_error(exc, {
            "leave_types_name_key": "Leave type already exists",
            "leave_types_name": "Leave type already exists",
            "name": "Leave type already exists",
        })
    return jsonify({"message": "Leave type updated", "data": leave_type.to_dict(), "token_response": token_response}), 200


@master_bp.route("/leave-types/<int:leave_type_id>", methods=["DELETE"])
@jwt_required()
@with_token
def delete_leave_type(leave_type_id, token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    leave_type, error_response = _fetch_leave_type(leave_type_id)
    if error_response:
        return error_response
    leave_type.is_active = False
    db.session.commit()
    return jsonify({"message": "Leave type deactivated", "token_response": token_response}), 200
