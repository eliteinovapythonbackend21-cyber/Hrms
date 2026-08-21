from datetime import date
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import Attendance, Employee, BaseUser
from utils import paginate_query

attendance_bp = Blueprint("attendance_bp", __name__)

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


def _get_current_user():
    user_id = int(get_jwt_identity())
    return BaseUser.query.get(user_id)


def _is_admin(user):
    return user and user.role == "admin"


def _parse_date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


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


def _authorize_employee(employee):
    current_user = _get_current_user()
    if not current_user:
        return False, None, (jsonify({"message": "Invalid token"}), 401)
    if _is_admin(current_user) or employee.user_id == current_user.id:
        return True, current_user, None
    return False, None, (jsonify({"message": "Access denied"}), 403)



@attendance_bp.route("/", methods=["GET"])
@jwt_required()
@with_token
def list_attendance(token_response):
    query = Attendance.query
    if request.args.get("employee_id"):
        employee, error_response = _fetch_employee(request.args.get("employee_id"))
        if error_response:
            return error_response
        authorized, current_user, error_response = _authorize_employee(employee)
        if not authorized:
            return error_response
        query = query.filter_by(employee_id=request.args.get("employee_id"))
    if request.args.get("attendance_date"):
        attendance_date = _parse_date(request.args.get("attendance_date"))
        if attendance_date is None:
            return jsonify({"message": "Invalid attendance_date format. Use YYYY-MM-DD."}), 400
        query = query.filter_by(attendance_date=attendance_date)
    return jsonify({"message": "Attendance list fetched", "data": paginate_query(query, request.args), "token_response": token_response}), 200


@attendance_bp.route("/monthly-summary", methods=["GET"])
@jwt_required()
@with_token
def monthly_summary(token_response):
    current_user = _get_current_user()

    today = date.today()
    month = request.args.get("month", type=int) or today.month
    year = request.args.get("year", type=int) or today.year
    if not (1 <= month <= 12):
        return jsonify({"message": "month must be between 1 and 12"}), 400

    employee_id = request.args.get("employee_id")

    if employee_id:
        employee, error_response = _fetch_employee(employee_id)
        if error_response:
            return error_response
        authorized, _, error_response = _authorize_employee(employee)
        if not authorized:
            return error_response
        data = [Attendance.get_monthly_summary(employee.id, month, year)]
    else:
        data = Attendance.get_monthly_summary_list(month, year)

    return jsonify({
        "message": "Monthly attendance summary fetched",
        "data": {"items": data, "month": month, "year": year},
        "token_response": token_response,
    }), 200


@attendance_bp.route("/report", methods=["GET"])
@jwt_required()
@with_token
def attendance_report(token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    from_date_str = request.args.get("from_date")
    to_date_str = request.args.get("to_date")
    from_date = _parse_date(from_date_str)
    to_date = _parse_date(to_date_str)
    if from_date_str and from_date is None:
        return jsonify({"message": "Invalid from_date format. Use YYYY-MM-DD."}), 400
    if to_date_str and to_date is None:
        return jsonify({"message": "Invalid to_date format. Use YYYY-MM-DD."}), 400

    employee_id = request.args.get("employee_id")
    workbook = Attendance.generate_attendance_report(from_date=from_date, to_date=to_date, employee_id=employee_id)
    filename = f"attendance_report_{from_date_str or 'all'}_{to_date_str or 'all'}.xlsx"
    return send_file(workbook, as_attachment=True, download_name=filename, mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


@attendance_bp.route("/salary-report", methods=["GET"])
@jwt_required()
@with_token
def salary_report(token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    from_date_str = request.args.get("from_date")
    to_date_str = request.args.get("to_date")
    from_date = _parse_date(from_date_str)
    to_date = _parse_date(to_date_str)
    if from_date_str and from_date is None:
        return jsonify({"message": "Invalid from_date format. Use YYYY-MM-DD."}), 400
    if to_date_str and to_date is None:
        return jsonify({"message": "Invalid to_date format. Use YYYY-MM-DD."}), 400

    employee_id = request.args.get("employee_id")
    workbook = Attendance.generate_salary_report(from_date=from_date, to_date=to_date, employee_id=employee_id)
    filename = f"salary_report_{from_date_str or 'all'}_{to_date_str or 'all'}.xlsx"
    return send_file(workbook, as_attachment=True, download_name=filename, mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")