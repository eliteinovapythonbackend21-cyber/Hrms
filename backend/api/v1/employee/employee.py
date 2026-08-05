from datetime import datetime, date
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy.exc import IntegrityError
from extensions import db
from models import BaseUser, Employee, Attendance, ManualAttendance, NetworkStatus
from utils import paginate_query, apply_search_filters

employee_bp = Blueprint("employee_bp", __name__)


def _is_admin(user):
    return user and user.role == "admin"


def _get_current_user():
    current_user_id = int(get_jwt_identity())
    return BaseUser.query.get(current_user_id)


def _authorize_employee_action(employee):
    current_user = _get_current_user()
    if not current_user:
        return False, None, (jsonify({"message": "Invalid token"}), 401)
    if _is_admin(current_user) or employee.user_id == current_user.id:
        return True, current_user, None
    return False, None, (jsonify({"message": "Employee is not associated with this user id"}), 403)


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


def _get_request_data():
    """Accept both form-data and raw JSON payloads."""
    if request.is_json:
        return request.get_json(silent=True) or {}
    return request.form.to_dict()


def _parse_date(date_str):
    if not date_str:
        return None
    if isinstance(date_str, date):
        return date_str
    try:
        return datetime.fromisoformat(date_str).date()
    except ValueError:
        return None


def _parse_datetime(date_str, time_str):
    if not date_str or not time_str:
        return None
    date_part = _parse_date(date_str)
    if date_part is None:
        return None

    try:
        if isinstance(time_str, datetime):
            time_part = time_str.time()
        else:
            time_part = datetime.fromisoformat(f"{date_part}T{time_str}").time()
        return datetime.combine(date_part, time_part)
    except ValueError:
        return None


def _parse_bool(value):
    if isinstance(value, bool):
        return value
    if value is None:
        return None
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "y", "on"}:
            return True
        if normalized in {"false", "0", "no", "n", "off"}:
            return False
    return None


def _handle_integrity_error(exc, duplicates=None):
    db.session.rollback()
    orig = str(getattr(exc, "orig", exc)).lower()
    if duplicates:
        for key, message in duplicates.items():
            if key in orig:
                return jsonify({"message": message}), 409
    return jsonify({"message": "Database integrity error"}), 400


def _parse_float(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


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



@employee_bp.route("/", methods=["GET"])
@jwt_required()
@with_token
def list_employees(token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    query = Employee.query
    query = apply_search_filters(query, request.args, ["first_name", "last_name", "employee_code"])
    return jsonify({"message": "Employees fetched", "data": paginate_query(query, request.args), "token_response": get_jwt()}), 200


@employee_bp.route("/<int:employee_id>", methods=["GET"])
@jwt_required()
@with_token
def get_employee(employee_id, token_response):
    employee, error_response = _fetch_employee(employee_id)
    if error_response:
        return error_response
    authorized, current_user, error_response = _authorize_employee_action(employee)
    if not authorized:
        return error_response
    return jsonify({"message": "Employee fetched", "data": employee.to_dict(), "token_response": get_jwt()}), 200


@employee_bp.route("/", methods=["POST"])
@jwt_required()
@with_token
def create_employee(token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    data = _get_request_data()

    employee = Employee(
        user_id=data.get("user_id"),
        employee_code=data.get("employee_code"),
        department_id=data.get("department_id"),
        designation_id=data.get("designation_id"),
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        gender=data.get("gender"),
        dob=data.get("dob"),
        phone=data.get("phone"),
        emergency_contact=data.get("emergency_contact"),
        address=data.get("address"),
        city=data.get("city"),
        state=data.get("state"),
        country=data.get("country"),
        pincode=data.get("pincode"),
        joining_date=data.get("joining_date"),
        salary=_parse_float(data.get("salary")) if data.get("salary") is not None else 0,
        status=_parse_bool(data.get("status")) if data.get("status") is not None else True,
    )
    if data.get("user_id") and Employee.query.filter_by(user_id=data.get("user_id")).first():
        return jsonify({"message": "Employee already exists for this user"}), 409

    db.session.add(employee)
    try:
        db.session.commit()
    except IntegrityError as exc:
        return _handle_integrity_error(exc, {
            "employees_employee_code_key": "Employee code already exists",
            "employee_code": "Employee code already exists",
            "employees_user_id_key": "Employee already exists for this user",
            "user_id": "Employee already exists for this user",
        })
    except Exception:
        db.session.rollback()
        return jsonify({"message": "Failed to create employee"}), 500

    return jsonify({"message": "Employee created", "data": employee.to_dict(), "token_response": token_response}), 201


@employee_bp.route("/<int:employee_id>", methods=["PUT"])
@jwt_required()
@with_token
def update_employee(employee_id, token_response):
    employee, error_response = _fetch_employee(employee_id)
    if error_response:
        return error_response
    authorized, current_user, error_response = _authorize_employee_action(employee)
    if not authorized:
        return error_response

    data = _get_request_data()

    for field in ["employee_code", "department_id", "designation_id", "first_name", "last_name", "gender", "dob", "phone", "emergency_contact", "address", "city", "state", "country", "pincode", "joining_date"]:
        if field in data:
            setattr(employee, field, data[field])

    if "salary" in data:
        salary_value = _parse_float(data.get("salary"))
        if salary_value is None:
            return jsonify({"message": "Salary must be a valid number"}), 400
        employee.salary = salary_value

    if "status" in data:
        status_value = _parse_bool(data.get("status"))
        if status_value is None:
            return jsonify({"message": "Status must be a boolean value"}), 400
        employee.status = status_value

    try:
        db.session.commit()
    except IntegrityError as exc:
        return _handle_integrity_error(exc, {
            "employees_employee_code_key": "Employee code already exists",
            "employee_code": "Employee code already exists",
            "employees_user_id_key": "Employee already exists for this user",
            "user_id": "Employee already exists for this user",
        })
    except Exception:
        db.session.rollback()
        return jsonify({"message": "Failed to update employee"}), 500

    return jsonify({"message": "Employee updated", "data": employee.to_dict(), "token_response": token_response}), 200


@employee_bp.route("/<int:employee_id>", methods=["DELETE"])
@jwt_required()
@with_token
def delete_employee(employee_id, token_response):
    employee, error_response = _fetch_employee(employee_id)
    if error_response:
        return error_response
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    employee.is_active = False
    db.session.commit()
    return jsonify({"message": "Employee deactivated", "token_response": token_response}), 200


@employee_bp.route("/salary", methods=["GET"])
@jwt_required()
@with_token
def list_salaries(token_response):
    current_user = _get_current_user()
    query = Employee.query
    if not _is_admin(current_user):
        if not current_user.employee:
            return jsonify({"message": "Employee record not found for current user"}), 404
        query = query.filter_by(id=current_user.employee.id)

    return jsonify({"message": "Salaries fetched", "data": paginate_query(query, request.args), "token_response": token_response}), 200


@employee_bp.route("/<int:employee_id>/salary", methods=["GET"])
@jwt_required()
@with_token
def get_employee_salary(employee_id, token_response):
    employee, error_response = _fetch_employee(employee_id)
    if error_response:
        return error_response
    authorized, current_user, error_response = _authorize_employee_action(employee)
    if not authorized:
        return error_response

    return jsonify({
        "message": "Employee salary fetched",
        "data": {
            "employee_id": employee.id,
            "employee_code": employee.employee_code,
            "salary": float(employee.salary) if employee.salary is not None else None,
        },
        "token_response": token_response,
    }), 200


@employee_bp.route("/<int:employee_id>/salary", methods=["PUT"])
@jwt_required()
@with_token
def update_employee_salary(employee_id, token_response):
    employee, error_response = _fetch_employee(employee_id)
    if error_response:
        return error_response
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    data = _get_request_data()
    if "salary" not in data:
        return jsonify({"message": "Salary is required"}), 400

    try:
        salary_value = float(data.get("salary"))
    except (TypeError, ValueError):
        return jsonify({"message": "Salary must be a valid number"}), 400

    employee.salary = salary_value
    db.session.commit()

    return jsonify({"message": "Employee salary updated", "data": {"employee_id": employee.id, "salary": float(employee.salary)}, "token_response": token_response}), 200


@employee_bp.route("/<int:employee_id>/salary", methods=["DELETE"])
@jwt_required()
@with_token
def reset_employee_salary(employee_id, token_response):
    employee, error_response = _fetch_employee(employee_id)
    if error_response:
        return error_response
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    employee.salary = 0
    db.session.commit()

    return jsonify({"message": "Employee salary reset", "data": {"employee_id": employee.id, "salary": float(employee.salary)}, "token_response": token_response}), 200


@employee_bp.route("/checkin", methods=["POST"])
@jwt_required()
@with_token
def employee_checkin(token_response):
    data = _get_request_data()
    employee_id = data.get("employee_id")
    employee, error_response = _fetch_employee(employee_id)
    if error_response:
        return error_response
    authorized, current_user, error_response = _authorize_employee_action(employee)
    if not authorized:
        return error_response

    latitude = data.get("latitude")
    longitude = data.get("longitude")

    attendance_date_obj = _parse_date(data.get("attendance_date"))
    if attendance_date_obj is None:
        return jsonify({"message": "Invalid attendance_date format"}), 400
    if attendance_date_obj > date.today():
        return jsonify({"message": "attendance_date cannot be in the future"}), 400

    check_in_datetime = _parse_datetime(attendance_date_obj, data.get("check_in"))
    if check_in_datetime is None:
        return jsonify({"message": "Invalid check_in format"}), 400

    attendance = Attendance(
        employee_id=employee_id,
        attendance_date=attendance_date_obj,
        check_in=check_in_datetime,
        attendance_status="Present",
        description="user",
        checkin_latitude=latitude,
        checkin_longitude=longitude,
    )
    db.session.add(attendance)
    network_status = NetworkStatus(
        employee_id=employee_id,
        latitude=latitude,
        longitude=longitude,
        ip_address=data.get("ip_address"),
        network_type=data.get("network_type"),
        device_name=data.get("device_name"),
        battery_percentage=data.get("battery_percentage", 0),
        is_online=data.get("is_online", True),
    )
    db.session.add(network_status)
    db.session.commit()

    return jsonify({"message": "Check-in created", "token_response": token_response}), 201


@employee_bp.route("/checkout", methods=["POST"])
@jwt_required()
@with_token
def employee_checkout(token_response):
    data = _get_request_data()
    employee_id = data.get("employee_id")
    employee, error_response = _fetch_employee(employee_id)
    if error_response:
        return error_response
    authorized, current_user, error_response = _authorize_employee_action(employee)
    if not authorized:
        return error_response

    attendance_date = data.get("attendance_date")
    attendance_date_obj = _parse_date(attendance_date)
    if attendance_date_obj is None:
        return jsonify({"message": "Invalid attendance_date format"}), 400
    if attendance_date_obj > date.today():
        return jsonify({"message": "attendance_date cannot be in the future"}), 400

    attendance = Attendance.query.filter_by(employee_id=employee_id, attendance_date=attendance_date_obj).first()
    if not attendance:
        return jsonify({"message": "Attendance record not found for the specified employee and date"}), 404
    if attendance.check_in is None:
        return jsonify({"message": "Cannot checkout before check-in"}), 400

    check_out_datetime = _parse_datetime(attendance_date_obj, data.get("check_out"))
    if check_out_datetime is None:
        return jsonify({"message": "Invalid check_out format"}), 400
    if check_out_datetime <= attendance.check_in:
        return jsonify({"message": "check_out must be after check_in"}), 400
    if (check_out_datetime - attendance.check_in).total_seconds() < 60:
        return jsonify({"message": "Minimum attendance duration is 1 minute"}), 400

    attendance.check_out = check_out_datetime
    attendance.checkout_latitude = data.get("latitude")
    attendance.checkout_longitude = data.get("longitude")
    attendance.working_hours = round((check_out_datetime - attendance.check_in).total_seconds() / 3600, 2)
    db.session.commit()

    return jsonify({"message": "Check-out recorded", "data": attendance.to_dict(), "token_response": token_response}), 200


@employee_bp.route("/manual-attendance", methods=["POST"])
@jwt_required()
@with_token
def create_manual_attendance(token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    data = _get_request_data()
    employee_id = data.get("employee_id")
    employee, error_response = _fetch_employee(employee_id)
    if error_response:
        return error_response
    attendance_date_obj = _parse_date(data.get("attendance_date"))
    if attendance_date_obj is None:
        return jsonify({"message": "Invalid attendance_date format"}), 400
    if attendance_date_obj > date.today():
        return jsonify({"message": "attendance_date cannot be in the future"}), 400

    check_in_datetime = _parse_datetime(attendance_date_obj, data.get("check_in"))
    check_out_datetime = _parse_datetime(attendance_date_obj, data.get("check_out"))
    if check_in_datetime is None or check_out_datetime is None:
        return jsonify({"message": "Both check_in and check_out are required for manual attendance"}), 400
    if check_out_datetime <= check_in_datetime:
        return jsonify({"message": "check_out must be after check_in"}), 400
    if (check_out_datetime - check_in_datetime).total_seconds() < 60:
        return jsonify({"message": "Minimum attendance duration is 1 minute"}), 400

    manual_attendance = ManualAttendance(
        employee_id=employee_id,
        attendance_date=attendance_date_obj,
        check_in=check_in_datetime,
        check_out=check_out_datetime,
        working_hours=round((check_out_datetime - check_in_datetime).total_seconds() / 3600, 2),
        checkin_latitude=data.get("latitude"),
        checkin_longitude=data.get("longitude"),
        checkout_latitude=data.get("checkout_latitude"),
        checkout_longitude=data.get("checkout_longitude"),
        attendance_status=data.get("attendance_status", "Present"),
        description="admin",
    )
    db.session.add(manual_attendance)
    db.session.commit()

    return jsonify({"message": "Manual attendance recorded", "data": manual_attendance.to_dict(), "token_response": token_response}), 201


@employee_bp.route("/manual-attendance", methods=["GET"])
@jwt_required()
@with_token
def list_manual_attendance(token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    query = ManualAttendance.query
    if request.args.get("employee_id"):
        query = query.filter_by(employee_id=request.args.get("employee_id"))

    return jsonify({
        "message": "Manual attendance fetched",
        "data": paginate_query(query, request.args),
        "token_response": token_response,
    }), 200


def _fetch_manual_attendance(manual_attendance_id):
    manual_attendance = ManualAttendance.query.get(manual_attendance_id)
    if not manual_attendance:
        return None, (jsonify({"message": "Manual attendance record not found"}), 404)
    return manual_attendance, None


@employee_bp.route("/manual-attendance/<int:manual_attendance_id>", methods=["PUT"])
@jwt_required()
@with_token
def update_manual_attendance(manual_attendance_id, token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    manual_attendance, error_response = _fetch_manual_attendance(manual_attendance_id)
    if error_response:
        return error_response

    data = _get_request_data()
    attendance_date_obj = _parse_date(data.get("attendance_date")) if "attendance_date" in data else manual_attendance.attendance_date
    if attendance_date_obj is None:
        return jsonify({"message": "Invalid attendance_date format"}), 400
    if attendance_date_obj > date.today():
        return jsonify({"message": "attendance_date cannot be in the future"}), 400

    check_in_datetime = _parse_datetime(attendance_date_obj, data.get("check_in")) if "check_in" in data else manual_attendance.check_in
    check_out_datetime = _parse_datetime(attendance_date_obj, data.get("check_out")) if "check_out" in data else manual_attendance.check_out
    if check_in_datetime is None or check_out_datetime is None:
        return jsonify({"message": "Both check_in and check_out are required for manual attendance"}), 400
    if check_out_datetime <= check_in_datetime:
        return jsonify({"message": "check_out must be after check_in"}), 400
    if (check_out_datetime - check_in_datetime).total_seconds() < 60:
        return jsonify({"message": "Minimum attendance duration is 1 minute"}), 400

    if "employee_id" in data:
        employee, error_response = _fetch_employee(data.get("employee_id"))
        if error_response:
            return error_response
        manual_attendance.employee_id = employee.id

    manual_attendance.attendance_date = attendance_date_obj
    manual_attendance.check_in = check_in_datetime
    manual_attendance.check_out = check_out_datetime
    manual_attendance.working_hours = round((check_out_datetime - check_in_datetime).total_seconds() / 3600, 2)
    if "latitude" in data:
        manual_attendance.checkin_latitude = data.get("latitude")
    if "longitude" in data:
        manual_attendance.checkin_longitude = data.get("longitude")
    if "checkout_latitude" in data:
        manual_attendance.checkout_latitude = data.get("checkout_latitude")
    if "checkout_longitude" in data:
        manual_attendance.checkout_longitude = data.get("checkout_longitude")
    if "attendance_status" in data:
        manual_attendance.attendance_status = data.get("attendance_status")

    db.session.commit()

    return jsonify({"message": "Manual attendance updated", "data": manual_attendance.to_dict(), "token_response": token_response}), 200


@employee_bp.route("/manual-attendance/<int:manual_attendance_id>", methods=["DELETE"])
@jwt_required()
@with_token
def delete_manual_attendance(manual_attendance_id, token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    manual_attendance, error_response = _fetch_manual_attendance(manual_attendance_id)
    if error_response:
        return error_response

    manual_attendance.is_active = False
    db.session.commit()

    return jsonify({"message": "Manual attendance deactivated", "token_response": token_response}), 200


@employee_bp.route("/<int:employee_id>/attendance", methods=["GET"])
@jwt_required()
@with_token
def employee_attendance(employee_id, token_response):
    employee, error_response = _fetch_employee(employee_id)
    if error_response:
        return error_response
    authorized, current_user, error_response = _authorize_employee_action(employee)
    if not authorized:
        return error_response

    query = Attendance.query.filter_by(employee_id=employee_id)
    results = paginate_query(query, request.args)
    return jsonify({"message": "Employee attendance fetched", "data": results, "token_response": token_response}), 200
