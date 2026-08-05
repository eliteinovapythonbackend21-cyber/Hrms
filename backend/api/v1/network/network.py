from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import NetworkStatus, BaseUser, Employee
from utils import paginate_query

network_bp = Blueprint("network_bp", __name__)


def _get_current_user():
    user_id = int(get_jwt_identity())
    return BaseUser.query.get(user_id)


def _is_admin(user):
    return user and user.role == "admin"


def _authorize_employee(employee):
    current_user = _get_current_user()
    if not current_user:
        return False, None, (jsonify({"message": "Invalid token"}), 401)
    if _is_admin(current_user) or employee.user_id == current_user.id:
        return True, current_user, None
    return False, None, (jsonify({"message": "Access denied"}), 403)


def _fetch_employee(employee_id):
    if employee_id is None:
        return None, (jsonify({"message": "employee_id is required"}), 400)
    try:
        employee_id = int(employee_id)
    except (TypeError, ValueError):
        return None, (jsonify({"message": "Invalid employee_id"}), 400)

    employee = Employee.query.get(employee_id)
    if not employee:
        return None, (jsonify({"message": "Employee not found for the provided id"}), 404)
    return employee, None


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


@network_bp.route("/", methods=["GET"])
@jwt_required()
@with_token
def list_network_status(token_response):
    query = NetworkStatus.query
    if request.args.get("employee_id"):
        employee, error_response = _fetch_employee(request.args.get("employee_id"))
        if error_response:
            return error_response
        authorized, current_user, error_response = _authorize_employee(employee)
        if not authorized:
            return error_response
        query = query.filter_by(employee_id=request.args.get("employee_id"))
    return jsonify({"message": "Network statuses fetched", "data": paginate_query(query, request.args), "token_response": token_response}), 200
