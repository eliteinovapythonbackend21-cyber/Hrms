import re
from datetime import date
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy.exc import IntegrityError
from extensions import db
from models import BaseUser, Employee, Leave, Attendance, Role
from utils import paginate_query, apply_search_filters, handle_image_upload, hash_password, verify_password

user_bp = Blueprint("user_bp", __name__)


def _get_request_data():
    """Accept form-data and raw JSON payloads."""
    if request.is_json:
        return request.get_json(silent=True) or {}
    return request.form.to_dict()



def _is_admin(user):
    return user.role == "admin"


def _get_current_user():
    current_user_id = int(get_jwt_identity())
    return BaseUser.query.get(current_user_id)


EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
MOBILE_RE = re.compile(r"^[0-9+\-\s]{10,15}$")


def _validate_user_fields(data, require_password=False):
    errors = []
    if "username" in data and data.get("username") is not None:
        if not data.get("username") or len(data.get("username").strip()) < 3:
            errors.append("username must be at least 3 characters")
    if "email" in data and data.get("email") is not None:
        if not data.get("email") or not EMAIL_RE.match(data.get("email")):
            errors.append("email must be a valid email address")
    if data.get("mobile") and not MOBILE_RE.match(data.get("mobile")):
        errors.append("mobile must be a valid phone number")
    if require_password:
        password = data.get("password")
        if not password or len(password) < 6:
            errors.append("password must be at least 6 characters")
    elif data.get("password") and len(data.get("password")) < 6:
        errors.append("password must be at least 6 characters")
    if data.get("role") and data.get("role") not in ("admin", "employee", "hr", "finance"):
        errors.append("role must be admin, employee, hr or finance")
    return errors


def _handle_integrity_error(exc, duplicates=None):
    db.session.rollback()
    orig = str(getattr(exc, "orig", exc)).lower()
    if duplicates:
        for key, message in duplicates.items():
            if key in orig:
                return jsonify({"message": message}), 409
    return jsonify({"message": "Database integrity error"}), 400


def _fetch_user(user_id):
    if user_id is None:
        return None, (jsonify({"message": "user_id is required"}), 400)
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None, (jsonify({"message": "Invalid user_id"}), 400)

    user = BaseUser.query.get(user_id)
    if not user:
        return None, (jsonify({"message": "User not found for the provided id"}), 404)
    return user, None


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


@user_bp.route("/", methods=["GET"])
@jwt_required()
@with_token
def list_users(token_response):
    current_user = _get_current_user()
    if not current_user or not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    query = BaseUser.query
    role_filter = request.args.get("role")
    if role_filter:
        query = query.filter(BaseUser.role == role_filter)
    query = apply_search_filters(query, request.args, ["username", "email", "role"])
    result = paginate_query(query, request.args)
    return jsonify({"message": "Users fetched", "data": result, "token_response": token_response}), 200


@user_bp.route("/count", methods=["GET"])
@jwt_required()
@with_token
def count(token_response):
    current_user = _get_current_user()
    if not current_user or not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    logged_in_users_count = BaseUser.query.filter(BaseUser.last_login.isnot(None)).count()
    total_employees_count = Employee.query.filter_by(is_active=True).count()
    leaves_count = Leave.query.filter_by(is_active=True).count()

    today = date.today()
    checkin_users_count = db.session.query(db.func.count(db.distinct(Attendance.employee_id)))\
        .filter(Attendance.attendance_date == today, Attendance.check_in.isnot(None), Attendance.is_active == True)\
        .scalar() or 0

    not_checked_in_users_count = max(total_employees_count - checkin_users_count, 0)

    return jsonify({
        "message": "Dashboard counts fetched",
        "data": {
            "logged_in_users_count": logged_in_users_count,
            "total_employees_count": total_employees_count,
            "leaves_count": leaves_count,
            "checkin_users_count": checkin_users_count,
            "not_checked_in_users_count": not_checked_in_users_count,
        },
        "token_response": token_response
    }), 200


@user_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
@with_token
def get_user(user_id, token_response):
    current_user = _get_current_user()
    if not current_user:
        return jsonify({"message": "Invalid token"}), 401

    if current_user.id != user_id and not _is_admin(current_user):
        return jsonify({"message": "Access denied"}), 403

    user, error_response = _fetch_user(user_id)
    if error_response:
        return error_response
    return jsonify({"message": "User fetched", "data": user.to_dict(), "token_response": token_response}), 200


@user_bp.route("/", methods=["POST"])
@jwt_required()
@with_token
def create_user(token_response):
    current_user = _get_current_user()
    if not current_user or not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    data = _get_request_data()

    if not data.get("username"):
        return jsonify({"message": "Validation failed", "errors": ["username is required"]}), 400
    if not data.get("email"):
        return jsonify({"message": "Validation failed", "errors": ["email is required"]}), 400

    errors = _validate_user_fields(data, require_password=True)
    if errors:
        return jsonify({"message": "Validation failed", "errors": errors}), 400

    password = data.get("password")

    if BaseUser.query.filter_by(username=data.get("username")).first():
        return jsonify({"message": "Username already exists"}), 409
    if BaseUser.query.filter_by(email=data.get("email")).first():
        return jsonify({"message": "Email already exists"}), 409
    if data.get("mobile") and BaseUser.query.filter_by(mobile=data.get("mobile")).first():
        return jsonify({"message": "Mobile already exists"}), 409

    role_name = "employee"
    if data.get("role_id") is not None:
        try:
            role_name = {1: "admin", 2: "employee"}.get(int(data.get("role_id")), "employee")
        except (ValueError, TypeError):
            role_name = "employee"
    elif data.get("role"):
        role_name = data.get("role")

    role_obj = Role.query.filter_by(name=role_name).first()
    if not role_obj:
        role_obj = Role(name=role_name, is_active=True, actions="")
        db.session.add(role_obj)
        db.session.flush()

    user = BaseUser(
        username=data.get("username"),
        email=data.get("email"),
        mobile=data.get("mobile"),
        password=hash_password(password),
        role=role_name,
        role_id=role_obj.id,
        is_active=data.get("is_active", True),
    )
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError as exc:
        return _handle_integrity_error(exc, {
            "base_users_username_key": "Username already exists",
            "username": "Username already exists",
            "base_users_email_key": "Email already exists",
            "email": "Email already exists",
            "base_users_mobile_key": "Mobile already exists",
            "mobile": "Mobile already exists",
        })

    if data.get("employee_code"):
        employee = Employee(
            user_id=user.id,
            employee_code=data.get("employee_code"),
            department_id=data.get("department_id"),
            designation_id=data.get("designation_id"),
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
        )
        db.session.add(employee)
        try:
            db.session.commit()
        except IntegrityError as exc:
            return _handle_integrity_error(exc, {
                "employees_employee_code_key": "Employee code already exists",
                "employee_code": "Employee code already exists",
            })

    return jsonify({"message": "User created", "data": user.to_dict(), "token_response": token_response}), 201


@user_bp.route("/<int:user_id>", methods=["PUT"])
@jwt_required()
@with_token
def update_user(user_id, token_response):
    current_user = _get_current_user()
    if not current_user:
        return jsonify({"message": "Invalid token"}), 401

    if current_user.id != user_id and not _is_admin(current_user):
        return jsonify({"message": "Access denied"}), 403

    user, error_response = _fetch_user(user_id)
    if error_response:
        return error_response
    data = _get_request_data()

    errors = _validate_user_fields(data)
    if errors:
        return jsonify({"message": "Validation failed", "errors": errors}), 400

    if "username" in data and data.get("username"):
        username = data.get("username")
        if BaseUser.query.filter(BaseUser.id != user.id, BaseUser.username == username).first():
            return jsonify({"message": "Username already exists"}), 409
        user.username = username

    if "email" in data and data.get("email"):
        email = data.get("email")
        if BaseUser.query.filter(BaseUser.id != user.id, BaseUser.email == email).first():
            return jsonify({"message": "Email already exists"}), 409
        user.email = email

    if "mobile" in data and data.get("mobile"):
        mobile = data.get("mobile")
        if BaseUser.query.filter(BaseUser.id != user.id, BaseUser.mobile == mobile).first():
            return jsonify({"message": "Mobile already exists"}), 409
        user.mobile = mobile

    if ("role" in data or data.get("role_id") is not None) and not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required to change role"}), 403

    for field in ["role"]:
        if field in data:
            setattr(user, field, data[field])

    if data.get("role_id") is not None:
        try:
            role_name = {1: "admin", 2: "employee"}.get(int(data.get("role_id")), user.role)
        except (ValueError, TypeError):
            role_name = user.role
        role_obj = Role.query.filter_by(name=role_name).first()
        if not role_obj:
            role_obj = Role(name=role_name, is_active=True, actions="")
            db.session.add(role_obj)
            db.session.flush()
        user.role = role_name
        user.role_id = role_obj.id

    if data.get("password"):
        user.password = hash_password(data.get("password"))

    user.is_active = data.get("is_active", user.is_active)
    try:
        db.session.commit()
    except IntegrityError as exc:
        return _handle_integrity_error(exc, {
            "base_users_username_key": "Username already exists",
            "username": "Username already exists",
            "base_users_email_key": "Email already exists",
            "email": "Email already exists",
            "base_users_mobile_key": "Mobile already exists",
            "mobile": "Mobile already exists",
        })
    return jsonify({"message": "User updated", "data": user.to_dict(), "token_response": token_response}), 200


@user_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
@with_token
def delete_user(user_id, token_response):
    current_user = _get_current_user()
    if not current_user or not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    user, error_response = _fetch_user(user_id)
    if error_response:
        return error_response
    user.is_active = False
    db.session.commit()
    return jsonify({"message": "User deactivated", "token_response": token_response}), 200


@user_bp.route("/login", methods=["POST"])
def login_user():
    data = request.json or {}
    identifier = data.get("username") or data.get("email")
    password = data.get("password")
    if not identifier or not password:
        return jsonify({"message": "Username/email and password are required"}), 400

    user = BaseUser.query.filter((BaseUser.username == identifier) | (BaseUser.email == identifier)).first()
    if not user or not verify_password(password, user.password):
        return jsonify({"message": "Invalid credentials"}), 401

    user.last_login = db.func.now()
    db.session.commit()
    return jsonify({"message": "Login successful", "data": {"user": user.to_dict(), "role": user.role}}), 200


@user_bp.route("/profile/<int:user_id>", methods=["PUT"])
@jwt_required()
@with_token
def update_profile(user_id, token_response):
    current_user = _get_current_user()
    if not current_user:
        return jsonify({"message": "Invalid token"}), 401
    if current_user.id != user_id and not _is_admin(current_user):
        return jsonify({"message": "Access denied"}), 403

    user, error_response = _fetch_user(user_id)
    if error_response:
        return error_response
    data = _get_request_data()

    errors = _validate_user_fields(data)
    if errors:
        return jsonify({"message": "Validation failed", "errors": errors}), 400

    profile_file = request.files.get("profile_picture")
    if profile_file:
        profile_picture = handle_image_upload(profile_file, current_app.config["ALLOWED_IMAGE_EXTENSIONS"])
        user.profile_picture = profile_picture

    if "username" in data and data.get("username"):
        username = data.get("username")
        if BaseUser.query.filter(BaseUser.id != user.id, BaseUser.username == username).first():
            return jsonify({"message": "Username already exists"}), 409
        user.username = username

    if "email" in data and data.get("email"):
        email = data.get("email")
        if BaseUser.query.filter(BaseUser.id != user.id, BaseUser.email == email).first():
            return jsonify({"message": "Email already exists"}), 409
        user.email = email

    if "mobile" in data and data.get("mobile"):
        mobile = data.get("mobile")
        if BaseUser.query.filter(BaseUser.id != user.id, BaseUser.mobile == mobile).first():
            return jsonify({"message": "Mobile already exists"}), 409
        user.mobile = mobile

    try:
        db.session.commit()
    except IntegrityError as exc:
        return _handle_integrity_error(exc, {
            "base_users_username_key": "Username already exists",
            "username": "Username already exists",
            "base_users_email_key": "Email already exists",
            "email": "Email already exists",
            "base_users_mobile_key": "Mobile already exists",
            "mobile": "Mobile already exists",
        })

    return jsonify({"message": "Profile updated", "data": user.to_dict(), "token_response": token_response}), 200


@user_bp.route("/profile/<int:user_id>", methods=["GET"])
@jwt_required()
@with_token
def get_profile(user_id, token_response):
    current_user = _get_current_user()
    if not current_user:
        return jsonify({"message": "Invalid token"}), 401
    if current_user.id != user_id and not _is_admin(current_user):
        return jsonify({"message": "Access denied"}), 403

    user, error_response = _fetch_user(user_id)
    if error_response:
        return error_response
    return jsonify({"message": "Profile fetched", "data": user.to_dict(), "token_response": token_response}), 200
