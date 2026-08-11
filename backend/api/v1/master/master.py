import re

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy.exc import IntegrityError
from extensions import db
from models import BaseUser, Department, Designation, LeaveType, Company, Branch
from utils import paginate_query, apply_search_filters

master_bp = Blueprint("master_bp", __name__)


def _is_admin(user):
    return user and user.role == "admin"


def _initials(name):
    letters = re.sub(r"[^A-Za-z]", "", name or "")[:2].upper()
    return letters.ljust(2, "X")


def _generate_department_code(department_name):
    base = _initials(department_name)
    code = base
    suffix = 1
    while Department.query.filter_by(department_code=code).first():
        code = f"{base}{suffix}"
        suffix += 1
    return code


def _generate_designation_code(department, designation_name):
    base = f"{department.department_code}-{_initials(designation_name)}"
    code = base
    suffix = 1
    while Designation.query.filter_by(designation_code=code).first():
        code = f"{base}{suffix}"
        suffix += 1
    return code


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


def _fetch_company(company_id):
    if company_id is None:
        return None, (jsonify({"message": "company_id is required"}), 400)
    try:
        company_id = int(company_id)
    except (TypeError, ValueError):
        return None, (jsonify({"message": "Invalid company_id"}), 400)

    company = Company.query.get(company_id)
    if not company:
        return None, (
            jsonify({"message": "Company not found for the provided id"}),
            404,
        )
    return company, None


def _fetch_branch(branch_id):
    if branch_id is None:
        return None, (jsonify({"message": "branch_id is required"}), 400)
    try:
        branch_id = int(branch_id)
    except (TypeError, ValueError):
        return None, (jsonify({"message": "Invalid branch_id"}), 400)

    branch = Branch.query.get(branch_id)
    if not branch:
        return None, (
            jsonify({"message": "Branch not found for the provided id"}),
            404,
        )

    return branch, None


def _generate_company_code(company_name):
    base = _initials(company_name)
    code = base
    suffix = 1
    while Company.query.filter_by(code=code).first():
        code = f"{base}{suffix}"
        suffix += 1

    return code


def _generate_branch_code(company, branch_name):
    base = f"{company.code}-{_initials(branch_name)}"

    code = base
    suffix = 1

    while Branch.query.filter_by(
        company_id=company.id,
        code=code
    ).first():
        code = f"{base}{suffix}"
        suffix += 1

    return code



@master_bp.route("/departments", methods=["GET"])
@jwt_required()
@with_token
def list_departments(token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403
    query = Department.query.filter_by(is_active=True)
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
        department_code=_generate_department_code(data.get("department_name")),
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


# @master_bp.route("/departments/<int:department_id>", methods=["PUT"])
# @jwt_required()
# @with_token
# def update_department(department_id, token_response):
#     return jsonify({"message": "Editing is not permitted for this resource"}), 405


# @master_bp.route("/departments/<int:department_id>", methods=["DELETE"])
# @jwt_required()
# @with_token
# def delete_department(department_id, token_response):
#     return jsonify({"message": "Deleting is not permitted for this resource"}), 405


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
    # department_code is auto-generated on create and left untouched here so
    # existing references to it stay stable across renames.
    for field in ["department_name", "description", "status"]:
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
    query = Designation.query.filter_by(is_active=True)
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
    department, error_response = _fetch_department(data.get("department_id"))
    if error_response:
        return error_response

    designation = Designation(
        designation_code=_generate_designation_code(department, data.get("designation_name")),
        designation_name=data.get("designation_name"),
        department_id=department.id,
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


# @master_bp.route("/designations/<int:designation_id>", methods=["PUT"])
# @jwt_required()
# @with_token
# def update_designation(designation_id, token_response):
#     return jsonify({"message": "Editing is not permitted for this resource"}), 405


# @master_bp.route("/designations/<int:designation_id>", methods=["DELETE"])
# @jwt_required()
# @with_token
# def delete_designation(designation_id, token_response):
#     return jsonify({"message": "Deleting is not permitted for this resource"}), 405

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
    # designation_code is auto-generated on create and left untouched here so
    # existing references to it stay stable across renames.
    for field in ["designation_name", "department_id", "description", "status"]:
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


@master_bp.route("/companies", methods=["GET"])
@jwt_required()
@with_token
def list_companies(token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    query = Company.query.filter_by(is_active=True)
    query = apply_search_filters(
        query,
        request.args,
        ["name", "code", "email", "phone"]
    )

    return jsonify({
        "message": "Companies fetched",
        "data": paginate_query(query, request.args),
        "token_response": token_response,
    }), 200


@master_bp.route("/companies/<int:company_id>", methods=["GET"])
@jwt_required()
@with_token
def get_company(company_id, token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    company, error_response = _fetch_company(company_id)
    if error_response:
        return error_response

    return jsonify({
        "message": "Company fetched",
        "data": company.to_dict(),
        "token_response": token_response,
    }), 200


@master_bp.route("/companies", methods=["POST"])
@jwt_required()
@with_token
def create_company(token_response):
    current_user = _get_current_user()

    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    data = request.json or {}
    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({
            "message": "Company name is required"
        }), 400

    company = Company(
        name=name,
        code=data.get("code") or _generate_company_code(name),
        email=data.get("email"),
        phone=data.get("phone"),
        website=data.get("website"),
        address=data.get("address"),
        city=data.get("city"),
        state=data.get("state"),
        country=data.get("country"),
        pincode=data.get("pincode"),
        status=data.get("status", True),
        is_active=True,
    )

    db.session.add(company)
    try:
        db.session.commit()

    except IntegrityError as exc:
        return _handle_integrity_error(exc, {
            "companies_name_key": "Company name already exists",
            "companies_code_key": "Company code already exists",
            "company_name": "Company name already exists",
            "company_code": "Company code already exists",
        })
    return jsonify({
        "message": "Company created",
        "data": company.to_dict(),
        "token_response": token_response,
    }), 201



@master_bp.route("/companies/<int:company_id>", methods=["PUT"])
@jwt_required()
@with_token
def update_company(company_id, token_response):
    current_user = _get_current_user()

    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403
    company, error_response = _fetch_company(company_id)
    if error_response:
        return error_response

    data = request.json or {}
    fields = [
        "name",
        "code",
        "email",
        "phone",
        "website",
        "address",
        "city",
        "state",
        "country",
        "pincode",
        "status",
    ]
    for field in fields:
        if field in data:
            setattr(company, field, data[field])

    try:
        db.session.commit()

    except IntegrityError as exc:
        return _handle_integrity_error(exc, {
            "companies_name_key": "Company name already exists",
            "companies_code_key": "Company code already exists",
            "company_name": "Company name already exists",
            "company_code": "Company code already exists",
        })

    return jsonify({
        "message": "Company updated",
        "data": company.to_dict(),
        "token_response": token_response,
    }), 200


@master_bp.route("/companies/<int:company_id>", methods=["DELETE"])
@jwt_required()
@with_token
def delete_company(company_id, token_response):
    current_user = _get_current_user()

    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    company, error_response = _fetch_company(company_id)

    if error_response:
        return error_response
    company.is_active = False
    for branch in company.branches:
        branch.is_active = False

    db.session.commit()

    return jsonify({
        "message": "Company deactivated",
        "token_response": token_response,
    }), 200







@master_bp.route("/branches", methods=["GET"])
@jwt_required()
@with_token
def list_branches(token_response):
    current_user = _get_current_user()

    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    query = Branch.query.filter_by(is_active=True)
    company_id = request.args.get("company_id")

    if company_id:
        try:
            company_id = int(company_id)
        except (TypeError, ValueError):
            return jsonify({
                "message": "Invalid company_id"
            }), 400

        query = query.filter(
            Branch.company_id == company_id
        )

    query = apply_search_filters(
        query,
        request.args,
        ["name", "code", "email", "phone"]
    )

    return jsonify({
        "message": "Branches fetched",
        "data": paginate_query(query, request.args),
        "token_response": token_response,
    }), 200


@master_bp.route("/branches/<int:branch_id>", methods=["GET"])
@jwt_required()
@with_token
def get_branch(branch_id, token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    branch, error_response = _fetch_branch(branch_id)

    if error_response:
        return error_response

    return jsonify({
        "message": "Branch fetched",
        "data": branch.to_dict(),
        "token_response": token_response,
    }), 200


@master_bp.route("/companies/<int:company_id>/branches", methods=["GET"])
@jwt_required()
@with_token
def list_company_branches(company_id, token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    company, error_response = _fetch_company(company_id)

    if error_response:
        return error_response

    query = Branch.query.filter_by(
        company_id=company.id,
        is_active=True,
    )

    query = apply_search_filters(
        query,
        request.args,
        ["name", "code", "email", "phone"]
    )

    return jsonify({
        "message": "Company branches fetched",
        "data": paginate_query(query, request.args),
        "token_response": token_response,
    }), 200


@master_bp.route("/companies/<int:company_id>/branches", methods=["POST"])
@jwt_required()
@with_token
def create_branch(company_id, token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    company, error_response = _fetch_company(company_id)

    if error_response:
        return error_response

    data = request.json or {}
    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({
            "message": "Branch name is required"
        }), 400

    branch = Branch(
        company_id=company.id,
        name=name,
        code=data.get("code") or _generate_branch_code(
            company,
            name
        ),
        email=data.get("email"),
        phone=data.get("phone"),
        address=data.get("address"),
        city=data.get("city"),
        state=data.get("state"),
        country=data.get("country"),
        pincode=data.get("pincode"),
        status=data.get("status", True),
        is_active=True,
    )

    db.session.add(branch)

    try:
        db.session.commit()
    except IntegrityError as exc:
        return _handle_integrity_error(exc, {
            "uq_branch_company_code":
                "Branch code already exists for this company",
            "uq_branch_company_name":
                "Branch name already exists for this company",
            "branches_company_id_code_key":
                "Branch code already exists for this company",
            "branches_company_id_name_key":
                "Branch name already exists for this company",
        })

    return jsonify({
        "message": "Branch created",
        "data": branch.to_dict(),
        "token_response": token_response,
    }), 201


@master_bp.route("/branches/<int:branch_id>", methods=["PUT"])
@jwt_required()
@with_token
def update_branch(branch_id, token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403
    branch, error_response = _fetch_branch(branch_id)

    if error_response:
        return error_response
    data = request.json or {}

    fields = [
        "name",
        "code",
        "email",
        "phone",
        "address",
        "city",
        "state",
        "country",
        "pincode",
        "status",
    ]

    for field in fields:
        if field in data:
            setattr(branch, field, data[field])

    if "company_id" in data:
        company, error_response = _fetch_company(
            data.get("company_id")
        )

        if error_response:
            return error_response

        branch.company_id = company.id

    try:
        db.session.commit()

    except IntegrityError as exc:
        return _handle_integrity_error(exc, {
            "uq_branch_company_code":
                "Branch code already exists for this company",
            "uq_branch_company_name":
                "Branch name already exists for this company",
            "branches_company_id_code_key":
                "Branch code already exists for this company",
            "branches_company_id_name_key":
                "Branch name already exists for this company",
        })

    return jsonify({
        "message": "Branch updated",
        "data": branch.to_dict(),
        "token_response": token_response,
    }), 200


@master_bp.route("/branches/<int:branch_id>", methods=["DELETE"])
@jwt_required()
@with_token
def delete_branch(branch_id, token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    branch, error_response = _fetch_branch(branch_id)

    if error_response:
        return error_response

    branch.is_active = False
    db.session.commit()

    return jsonify({
        "message": "Branch deactivated",
        "token_response": token_response,
    }), 200



@master_bp.route("/leave-types", methods=["GET"])
@jwt_required()
@with_token
def list_leave_types(token_response):
    current_user = _get_current_user()
    if not current_user:
        return jsonify({"message": "Invalid token"}), 401

    # Every authenticated user (not just admins) needs to read leave types —
    # employees pick from this list on the Request Leave form and the leave
    # list filter.
    query = LeaveType.query
    if request.args.get("is_active") is not None:
        query = query.filter(LeaveType.is_active == (request.args.get("is_active").lower() in {"true", "1", "yes"}))
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
