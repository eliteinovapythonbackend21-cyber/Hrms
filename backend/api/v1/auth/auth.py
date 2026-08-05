import re
from datetime import timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from sqlalchemy.exc import IntegrityError
from extensions import db
from models import BaseUser, Role
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
    2: "employee"
}


EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
MOBILE_RE = re.compile(r"^[0-9+\-\s]{10,15}$")


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
    if data.get("role") and data.get("role") not in ["admin", "employee"]:
        errors.append("role must be admin or employee")
    if data.get("role_id") is not None:
        try:
            role_id = int(data.get("role_id"))
            if role_id not in ROLE_MAP:
                errors.append("role_id must be 1 (admin) or 2 (employee)")
        except (ValueError, TypeError):
            errors.append("role_id must be an integer")
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
