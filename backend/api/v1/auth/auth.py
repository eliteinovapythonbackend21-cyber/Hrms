import re
import random
import secrets
from datetime import timedelta, datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from sqlalchemy.exc import IntegrityError
from extensions import db
from models import BaseUser, Role, Department, Designation, Employee
from utils import hash_password, verify_password

auth_bp = Blueprint("auth_bp", __name__)

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


ROLE_MAP = {
    1: "admin",
    2: "employee",
    3: "hr",
    4: "finance",
}
VALID_ROLES = tuple(ROLE_MAP.values())


EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
MOBILE_RE = re.compile(r"^[0-9+\-\s]{10,15}$")
NAME_RE = re.compile(r"^[A-Za-z][A-Za-z\s'-]*$")

OTP_TTL_MINUTES = 10
OTP_LENGTH = 6


def _parse_int(value):
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _validate_user_data(data, require_password=True):
    errors = []
    if not data.get("username"):
        errors.append("username is required")
    elif len(data.get("username").strip()) < 3:
        errors.append("username must be at least 3 characters")
    if not data.get("email"):
        errors.append("email is required")
    elif not EMAIL_RE.match(data.get("email")):
        errors.append("email must be a valid email address")
    if data.get("mobile") and not MOBILE_RE.match(data.get("mobile")):
        errors.append("mobile must be a valid phone number")
    if require_password:
        if not data.get("password"):
            errors.append("password is required")
        elif len(data.get("password")) < 6:
            errors.append("password must be at least 6 characters")
    if data.get("role") and data.get("role") not in VALID_ROLES:
        errors.append("role must be admin, employee, hr or finance")
    if data.get("role_id") is not None:
        try:
            role_id = int(data.get("role_id"))
            if role_id not in ROLE_MAP:
                errors.append("role_id must be 1 (admin), 2 (employee), 3 (hr) or 4 (finance)")
        except (ValueError, TypeError):
            errors.append("role_id must be an integer")

    # Registration always creates a linked Employee profile alongside the
    # login account so Department/Designation show up correctly everywhere
    # the account is listed (Users, Employees, dashboards). The employee
    # code itself is auto-generated, not user-supplied.
    if not data.get("first_name"):
        errors.append("first_name is required")
    elif not NAME_RE.match(data.get("first_name")):
        errors.append("first_name must contain only letters")
    if data.get("last_name") and not NAME_RE.match(data.get("last_name")):
        errors.append("last_name must contain only letters")
    if data.get("department_id") in (None, ""):
        errors.append("department_id is required")
    elif _parse_int(data.get("department_id")) is None:
        errors.append("department_id must be an integer")
    if data.get("designation_id") in (None, ""):
        errors.append("designation_id is required")
    elif _parse_int(data.get("designation_id")) is None:
        errors.append("designation_id must be an integer")
    return errors


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json or {}
    errors = _validate_user_data(data)
    if errors:
        return jsonify({"message": "Validation failed", "errors": errors}), 400

    if BaseUser.query.filter_by(username=data["username"]).first():
        return jsonify({"message": "Validation failed", "errors": ["username already exists"]}), 409
    if BaseUser.query.filter_by(email=data["email"]).first():
        return jsonify({"message": "Validation failed", "errors": ["email already exists"]}), 409

    if not Department.query.get(_parse_int(data.get("department_id"))):
        return jsonify({"message": "Department not found for the provided department_id"}), 404
    if not Designation.query.get(_parse_int(data.get("designation_id"))):
        return jsonify({"message": "Designation not found for the provided designation_id"}), 404

    role_name = "employee"
    if data.get("role_id") is not None:
        try:
            role_name = ROLE_MAP.get(int(data.get("role_id")), "employee")
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
        username=data["username"],
        email=data["email"],
        mobile=data.get("mobile"),
        password=hash_password(data["password"]),
        role=role_name,
        role_id=role_obj.id,
        is_active=True,
    )
    db.session.add(user)
    db.session.flush()

    # Both rows are committed together so the login account never ends up
    # without its Employee profile (department/designation stay in sync).
    employee = Employee(
        user_id=user.id,
        employee_code=Employee.generate_next_code(),
        department_id=_parse_int(data.get("department_id")),
        designation_id=_parse_int(data.get("designation_id")),
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
    )
    db.session.add(employee)

    try:
        db.session.commit()
    except IntegrityError as exc:
        db.session.rollback()
        orig = str(getattr(exc, "orig", exc)).lower()
        if "base_users_username_key" in orig or "username" in orig:
            return jsonify({"message": "Validation failed", "errors": ["username already exists"]}), 409
        if "base_users_email_key" in orig or "email" in orig:
            return jsonify({"message": "Validation failed", "errors": ["email already exists"]}), 409
        if "base_users_mobile_key" in orig or "mobile" in orig:
            return jsonify({"message": "Validation failed", "errors": ["mobile already exists"]}), 409
        if "employees_employee_code_key" in orig or "employee_code" in orig:
            return jsonify({"message": "Validation failed", "errors": ["employee_code already exists"]}), 409
        return jsonify({"message": "Database integrity error"}), 400

    return jsonify({"message": "User registered successfully", "user": user.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    if not data.get("email") or not data.get("password"):
        return jsonify({"message": "Email and password are required"}), 400

    user = BaseUser.query.filter_by(email=data.get("email")).first()
    if not user or not verify_password(data.get("password"), user.password):
        return jsonify({"message": "Invalid credentials"}), 401

    access_token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=8))
    user.last_login = db.func.now()
    db.session.commit()

    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": user.to_dict(),
    }), 200


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


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
@with_token
def get_profile(token_response):
    current_user_id = int(get_jwt_identity())
    user, error_response = _fetch_user(current_user_id)
    if error_response:
        return error_response
    return jsonify({"message": "Profile fetched", "user": user.to_dict(), "token_response": token_response}), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
@with_token
def logout(token_response):
    return jsonify({"message": "Logout successful", "token_response": token_response}), 200


# Unauthenticated lookups for the Register page — it runs before any login,
# so it can't hit the admin-only /departments and /designations endpoints.
# Only id/name are exposed, not the full master-data record.
@auth_bp.route("/departments", methods=["GET"])
def list_public_departments():
    departments = Department.query.filter_by(is_active=True).order_by(Department.department_name).all()
    return jsonify({
        "message": "Departments fetched",
        "data": [{"id": d.id, "department_name": d.department_name} for d in departments],
    }), 200


@auth_bp.route("/designations", methods=["GET"])
def list_public_designations():
    department_id = _parse_int(request.args.get("department_id"))
    query = Designation.query.filter_by(is_active=True)
    if department_id is not None:
        query = query.filter_by(department_id=department_id)
    designations = query.order_by(Designation.designation_name).all()
    return jsonify({
        "message": "Designations fetched",
        "data": [
            {"id": d.id, "designation_name": d.designation_name, "department_id": d.department_id}
            for d in designations
        ],
    }), 200


# ============================================================
# FORGOT PASSWORD / OTP / RESET PASSWORD / CHANGE PASSWORD
# ============================================================

def _generate_otp():
    """Cryptographically secure 6-digit numeric OTP, zero-padded."""
    return "".join(secrets.choice("0123456789") for _ in range(OTP_LENGTH))


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.json or {}
    email = data.get("email")

    if not email:
        return jsonify({"message": "email is required"}), 400

    user = BaseUser.query.filter_by(email=email).first()

    # Intentionally vague response whether or not the email exists, so this
    # endpoint can't be used to enumerate registered accounts.
    generic_response = jsonify({
        "message": "If an account exists for this email, an OTP has been sent."
    })

    if not user or not user.is_active:
        return generic_response, 200

    otp_code = _generate_otp()

    try:
        send_otp_email(user.email, otp_code)
    except Exception as exc:
        # Don't touch the DB or leak SMTP errors to the client.
        return jsonify({"message": "Failed to send OTP email. Please try again later."}), 502

    user.otp = hash_password(otp_code)
    user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)
    user.smtp_verified = False
    db.session.commit()

    return generic_response, 200


@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    data = request.json or {}
    email = data.get("email")
    otp = data.get("otp")

    if not email or not otp:
        return jsonify({"message": "email and otp are required"}), 400

    user = BaseUser.query.filter_by(email=email).first()
    if not user or not user.otp or not user.otp_expires_at:
        return jsonify({"message": "Invalid or expired OTP"}), 400

    if datetime.now(timezone.utc) > user.otp_expires_at.replace(tzinfo=timezone.utc):
        return jsonify({"message": "OTP has expired. Please request a new one."}), 400

    if not verify_password(otp, user.otp):
        return jsonify({"message": "Invalid OTP"}), 400

    user.smtp_verified = True
    db.session.commit()

    return jsonify({"message": "OTP verified. You may now reset your password."}), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.json or {}
    email = data.get("email")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")

    if not email or not new_password or not confirm_password:
        return jsonify({"message": "email, new_password and confirm_password are required"}), 400

    if new_password != confirm_password:
        return jsonify({"message": "new_password and confirm_password do not match"}), 400

    if len(new_password) < 6:
        return jsonify({"message": "password must be at least 6 characters"}), 400

    user = BaseUser.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "User not found"}), 404

    if not user.smtp_verified:
        return jsonify({"message": "OTP verification is required before resetting the password"}), 403

    user.password = hash_password(new_password)

    # Consume the OTP so it can't be reused for a second reset.
    user.otp = None
    user.otp_expires_at = None
    user.smtp_verified = False

    db.session.commit()

    return jsonify({"message": "Password reset successfully"}), 200


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
@with_token
def change_password(token_response):
    data = request.json or {}
    current_password = data.get("current_password")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")

    if not current_password or not new_password or not confirm_password:
        return jsonify({"message": "current_password, new_password and confirm_password are required"}), 400

    if new_password != confirm_password:
        return jsonify({"message": "new_password and confirm_password do not match"}), 400

    if len(new_password) < 6:
        return jsonify({"message": "password must be at least 6 characters"}), 400

    current_user_id = int(get_jwt_identity())
    user, error_response = _fetch_user(current_user_id)
    if error_response:
        return error_response

    if not verify_password(current_password, user.password):
        return jsonify({"message": "Current password is incorrect"}), 401

    if verify_password(new_password, user.password):
        return jsonify({"message": "New password must be different from the current password"}), 400

    user.password = hash_password(new_password)
    db.session.commit()

    return jsonify({"message": "Password changed successfully", "token_response": token_response}), 200