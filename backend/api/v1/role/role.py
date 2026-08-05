from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError
from extensions import db
from models import BaseUser, Role
from utils import paginate_query, apply_search_filters

role_bp = Blueprint("role_bp", __name__)


def _get_current_user():
    user_id = int(get_jwt_identity())
    return BaseUser.query.get(user_id)


def _is_admin(user):
    return user and user.role == "admin"


@role_bp.route("/", methods=["GET"])
@jwt_required()
def list_roles():
    query = Role.query
    query = apply_search_filters(query, request.args, ["name", "actions"])
    result = paginate_query(query, request.args)
    return jsonify({"message": "Roles fetched", "data": result}), 200


@role_bp.route("/", methods=["POST"])
@jwt_required()
def create_role():
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    data = request.json or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"message": "Role name is required"}), 400

    if Role.query.filter_by(name=name).first():
        return jsonify({"message": "Role already exists"}), 409

    role = Role(
        name=name,
        is_active=data.get("is_active", True),
        actions=data.get("actions", ""),
    )
    db.session.add(role)
    try:
        db.session.commit()
    except IntegrityError as exc:
        db.session.rollback()
        orig = str(getattr(exc, "orig", exc)).lower()
        if "roles_name_key" in orig or "name" in orig:
            return jsonify({"message": "Role already exists"}), 409
        return jsonify({"message": "Database integrity error"}), 400
    return jsonify({"message": "Role created", "data": role.to_dict()}), 201


def _fetch_role(role_id):
    if role_id is None:
        return None, (jsonify({"message": "role_id is required"}), 400)
    try:
        role_id = int(role_id)
    except (TypeError, ValueError):
        return None, (jsonify({"message": "Invalid role_id"}), 400)

    role = Role.query.get(role_id)
    if not role:
        return None, (jsonify({"message": "Role not found for the provided id"}), 404)
    return role, None


@role_bp.route("/<int:role_id>", methods=["GET"])
@jwt_required()
def get_role(role_id):
    role, error_response = _fetch_role(role_id)
    if error_response:
        return error_response
    return jsonify({"message": "Role fetched", "data": role.to_dict()}), 200


@role_bp.route("/<int:role_id>", methods=["PUT"])
@jwt_required()
def update_role(role_id):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    role, error_response = _fetch_role(role_id)
    if error_response:
        return error_response
    data = request.json or {}

    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"message": "Role name is required"}), 400
        if Role.query.filter(Role.id != role_id, Role.name == name).first():
            return jsonify({"message": "Role already exists"}), 409
        role.name = name

    if "is_active" in data:
        role.is_active = data.get("is_active")

    if "actions" in data:
        role.actions = data.get("actions", "")

    try:
        db.session.commit()
    except IntegrityError as exc:
        db.session.rollback()
        orig = str(getattr(exc, "orig", exc)).lower()
        if "roles_name_key" in orig or "name" in orig:
            return jsonify({"message": "Role already exists"}), 409
        return jsonify({"message": "Database integrity error"}), 400
    return jsonify({"message": "Role updated", "data": role.to_dict()}), 200


@role_bp.route("/<int:role_id>", methods=["DELETE"])
@jwt_required()
def delete_role(role_id):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    role, error_response = _fetch_role(role_id)
    if error_response:
        return error_response
    role.is_active = False
    db.session.commit()
    return jsonify({"message": "Role deactivated"}), 200
