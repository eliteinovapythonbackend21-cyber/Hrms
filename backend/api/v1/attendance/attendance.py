from datetime import date
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import Attendance, Employee, BaseUser, Department, Designation, Branch, Company
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


def _parse_int(value):
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


@attendance_bp.route("/", methods=["GET"])
@jwt_required()
@with_token
def list_attendance(token_response):
    query = Attendance.query

    applied_filters = {}  # temporary debug trace - see note near the bottom

    if request.args.get("employee_id"):
        employee, error_response = _fetch_employee(request.args.get("employee_id"))
        if error_response:
            return error_response
        authorized, current_user, error_response = _authorize_employee(employee)
        if not authorized:
            return error_response
        query = query.filter_by(employee_id=request.args.get("employee_id"))
        applied_filters["employee_id"] = request.args.get("employee_id")

    if request.args.get("attendance_date"):
        attendance_date = _parse_date(request.args.get("attendance_date"))
        if attendance_date is None:
            return jsonify({"message": "Invalid attendance_date format. Use YYYY-MM-DD."}), 400
        query = query.filter_by(attendance_date=attendance_date)
        applied_filters["attendance_date"] = attendance_date.isoformat()

    # Monthly / Quarterly period range. Previously used
    # Attendance.attendance_date.between(from_date, to_date), which was
    # not filtering correctly. Replaced with the same straightforward,
    # explicit comparison style as the working attendance_date exact
    # match above - chained >= / <= filters instead of a single
    # between() call.
    from_date_str = request.args.get("from_date")
    to_date_str = request.args.get("to_date")
    if from_date_str or to_date_str:
        from_date = _parse_date(from_date_str)
        to_date = _parse_date(to_date_str)
        if from_date_str and from_date is None:
            return jsonify({"message": "Invalid from_date format. Use YYYY-MM-DD."}), 400
        if to_date_str and to_date is None:
            return jsonify({"message": "Invalid to_date format. Use YYYY-MM-DD."}), 400

        if from_date is not None:
            query = query.filter(Attendance.attendance_date >= from_date)
            applied_filters["from_date"] = from_date.isoformat()

        if to_date is not None:
            query = query.filter(Attendance.attendance_date <= to_date)
            applied_filters["to_date"] = to_date.isoformat()

    # Organization filters (Company -> Branch -> Department -> Designation).
    # Attendance itself has no org columns, so these require joining
    # through Employee -> Department -> Branch/Company. The join is only
    # added when at least one org filter is actually present, to avoid
    # needlessly joining on every plain request.
    company_id = _parse_int(request.args.get("company_id"))
    branch_id = _parse_int(request.args.get("branch_id"))
    department_id = _parse_int(request.args.get("department_id"))
    designation_id = _parse_int(request.args.get("designation_id"))

    if company_id or branch_id or department_id or designation_id:
        query = query.join(Employee, Attendance.employee_id == Employee.id)

        if department_id:
            query = query.filter(Employee.department_id == department_id)
            applied_filters["department_id"] = department_id

        if designation_id:
            query = query.filter(Employee.designation_id == designation_id)
            applied_filters["designation_id"] = designation_id

        if company_id or branch_id:
            query = query.join(Department, Employee.department_id == Department.id)

            if company_id:
                query = query.filter(Department.company_id == company_id)
                applied_filters["company_id"] = company_id

            if branch_id:
                query = query.filter(Department.branch_id == branch_id)
                applied_filters["branch_id"] = branch_id

    result_data = paginate_query(query, request.args)

    # TEMPORARY DEBUG FIELD — remove once monthly/quarterly filtering is
    # confirmed working end-to-end. Echoes back exactly which filters
    # were parsed and applied on this request, so it can be compared
    # directly against the frontend debug panel without needing a
    # separate direct-API test each time.
    result_data["_debug_applied_filters"] = applied_filters

    return jsonify(
        {
            "message": "Attendance list fetched",
            "data": result_data,
            "token_response": token_response,
        }
    ), 200


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