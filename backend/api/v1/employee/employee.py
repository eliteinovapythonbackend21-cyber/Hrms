import re
from datetime import datetime, date
from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy.exc import IntegrityError
from extensions import db
from models import BaseUser, Employee, Attendance, ManualAttendance, NetworkStatus, Department, Designation, Role
from utils import paginate_query, apply_search_filters, hash_password

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


def _parse_int(value):
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


NAME_RE = re.compile(r"^[A-Za-z][A-Za-z\s'-]*$")
MOBILE_RE = re.compile(r"^[0-9+\-\s]{10,15}$")
PINCODE_RE = re.compile(r"^[A-Za-z0-9\s-]{4,10}$")
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PF_NUMBER_RE = re.compile(r"^[A-Za-z0-9\-\/]{2,30}$")
ESI_NUMBER_RE = re.compile(r"^[A-Za-z0-9\-\/]{2,30}$")
ACCOUNT_NUMBER_RE = re.compile(r"^[A-Za-z0-9]{6,20}$")

# Statutory employee-side contribution rates used for payslip deduction math.
PF_EMPLOYEE_RATE = 0.12
ESI_EMPLOYEE_RATE = 0.0075
ESI_WAGE_CEILING = 21000

# Working hours below this threshold on a given day are marked Absent.
MINIMUM_PRESENT_HOURS = 8.0


def _validate_employee_fields(data, partial=False):
    """Validate employee fields. In partial mode (updates) only fields
    present in `data` are checked; required-field checks are skipped."""
    errors = []

    def present(field):
        return not partial or field in data

    def required_and_blanked(field):
        # In partial (update) mode a required field must not be cleared out
        # once it's included in the payload.
        return partial and field in data and not data.get(field)

    if (not partial and not data.get("email")) or required_and_blanked("email"):
        errors.append("email is required")
    if present("email") and data.get("email") and not EMAIL_RE.match(data.get("email")):
        errors.append("email must be a valid email address")

    if (not partial and not data.get("password")) or required_and_blanked("password"):
        errors.append("password is required")
    if present("password") and data.get("password") and len(data.get("password")) < 6:
        errors.append("password must be at least 6 characters")

    if present("role_id") and data.get("role_id") not in (None, ""):
        if _parse_int(data.get("role_id")) is None:
            errors.append("role_id must be an integer")

    if (not partial and not data.get("department_id")) or required_and_blanked("department_id"):
        errors.append("department_id is required")
    if present("department_id") and data.get("department_id") not in (None, ""):
        if _parse_int(data.get("department_id")) is None:
            errors.append("department_id must be an integer")

    if (not partial and not data.get("designation_id")) or required_and_blanked("designation_id"):
        errors.append("designation_id is required")
    if present("designation_id") and data.get("designation_id") not in (None, ""):
        if _parse_int(data.get("designation_id")) is None:
            errors.append("designation_id must be an integer")

    if (not partial and not data.get("first_name")) or required_and_blanked("first_name"):
        errors.append("first_name is required")
    if present("first_name") and data.get("first_name") and not NAME_RE.match(data.get("first_name")):
        errors.append("first_name must contain only letters")

    if present("last_name") and data.get("last_name") and not NAME_RE.match(data.get("last_name")):
        errors.append("last_name must contain only letters")

    if present("gender") and data.get("gender") and data.get("gender") not in {"Male", "Female", "Other"}:
        errors.append("gender must be Male, Female or Other")

    if present("dob") and data.get("dob"):
        dob = _parse_date(data.get("dob"))
        if dob is None:
            errors.append("dob must be a valid date")
        elif dob > date.today():
            errors.append("dob cannot be in the future")

    if present("phone") and data.get("phone") and not MOBILE_RE.match(data.get("phone")):
        errors.append("phone must be a valid mobile number")

    if present("emergency_contact") and data.get("emergency_contact") and not MOBILE_RE.match(data.get("emergency_contact")):
        errors.append("emergency_contact must be a valid mobile number")

    if present("pincode") and data.get("pincode") and not PINCODE_RE.match(data.get("pincode")):
        errors.append("pincode is invalid")

    if present("allowance") and data.get("allowance") not in (None, ""):
        if _parse_float(data.get("allowance")) is None:
            errors.append("allowance must be a valid number")

    if present("pf_number") and data.get("pf_number") and not PF_NUMBER_RE.match(data.get("pf_number")):
        errors.append("pf_number is invalid")

    if present("esi_number") and data.get("esi_number") and not ESI_NUMBER_RE.match(data.get("esi_number")):
        errors.append("esi_number is invalid")

    if present("account_number") and data.get("account_number") and not ACCOUNT_NUMBER_RE.match(data.get("account_number")):
        errors.append("account_number is invalid")

    if present("joining_date") and data.get("joining_date"):
        joining_date = _parse_date(data.get("joining_date"))
        if joining_date is None:
            errors.append("joining_date must be a valid date")
        elif joining_date > date.today():
            errors.append("joining_date cannot be in the future")

    return errors


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

    errors = _validate_employee_fields(data, partial=False)
    if errors:
        return jsonify({"message": "Validation failed", "errors": errors}), 400

    if data.get("salary") not in (None, "") and _parse_float(data.get("salary")) is None:
        return jsonify({"message": "Salary must be a valid number"}), 400

    if not Department.query.get(_parse_int(data.get("department_id"))):
        return jsonify({"message": "Department not found for the provided department_id"}), 404
    if not Designation.query.get(_parse_int(data.get("designation_id"))):
        return jsonify({"message": "Designation not found for the provided designation_id"}), 404

    email = data.get("email")
    password = data.get("password")
    employee_code = Employee.generate_next_code()

    # An account with this email may already exist without an employee
    # record attached (e.g. it registered itself, or an admin created the
    # login separately) — link that account instead of erroring, rather
    # than leaving the admin with no way to attach an employee record to it.
    existing_user = BaseUser.query.filter_by(email=email).first()
    if existing_user:
        if existing_user.employee:
            return jsonify({"message": "Employee already exists for this user"}), 409
        user = existing_user
        user.password = hash_password(password)
    else:
        if BaseUser.query.filter_by(username=employee_code).first():
            return jsonify({"message": "Employee code already in use as a username"}), 409

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

        # BaseUser is created first so its generated id can be used as
        # Employee.user_id; both rows are then persisted in one transaction.
        user = BaseUser(
            username=employee_code,
            email=email,
            password=hash_password(password),
            role=role_name,
            role_id=role_obj.id,
            is_active=True,
        )
        db.session.add(user)
    db.session.flush()

    employee = Employee(
        user_id=user.id,
        employee_code=employee_code,
        department_id=data.get("department_id"),
        designation_id=data.get("designation_id"),
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        gender=data.get("gender"),
        dob=data.get("dob") or None,
        phone=data.get("phone"),
        emergency_contact=data.get("emergency_contact"),
        address=data.get("address"),
        city=data.get("city"),
        state=data.get("state"),
        country=data.get("country"),
        pincode=data.get("pincode"),
        joining_date=data.get("joining_date") or None,
        salary=_parse_float(data.get("salary")) if data.get("salary") is not None else 0,
        allowance=_parse_float(data.get("allowance")) if data.get("allowance") is not None else 0,
        pf_number=data.get("pf_number"),
        esi_number=data.get("esi_number"),
        account_number=data.get("account_number"),
        status=_parse_bool(data.get("status")) if data.get("status") is not None else True,
    )

    db.session.add(employee)
    try:
        db.session.commit()
    except IntegrityError as exc:
        return _handle_integrity_error(exc, {
            "employees_employee_code_key": "Employee code already exists",
            "employee_code": "Employee code already exists",
            "base_users_username_key": "Employee code already in use as a username",
            "base_users_email_key": "Email already exists",
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

    if not _is_admin(current_user):
        SELF_SERVICE_FIELDS = {"phone", "emergency_contact"}
        disallowed = set(data.keys()) - SELF_SERVICE_FIELDS
        if disallowed:
            return jsonify({"message": "You can only update phone and emergency contact"}), 403

    errors = _validate_employee_fields(data, partial=True)
    if errors:
        return jsonify({"message": "Validation failed", "errors": errors}), 400

    if "department_id" in data and not Department.query.get(_parse_int(data.get("department_id"))):
        return jsonify({"message": "Department not found for the provided department_id"}), 404
    if "designation_id" in data and not Designation.query.get(_parse_int(data.get("designation_id"))):
        return jsonify({"message": "Designation not found for the provided designation_id"}), 404

    if "email" in data or "password" in data or "role_id" in data:
        linked_user = employee.user
        if linked_user is None:
            return jsonify({"message": "Linked user account not found for this employee"}), 404

        if "email" in data:
            new_email = data.get("email")
            if BaseUser.query.filter(BaseUser.id != linked_user.id, BaseUser.email == new_email).first():
                return jsonify({"message": "Email already exists"}), 409
            linked_user.email = new_email

        if data.get("password"):
            linked_user.password = hash_password(data.get("password"))

        if data.get("role_id") is not None:
            try:
                role_name = {1: "admin", 2: "employee"}.get(int(data.get("role_id")), linked_user.role)
            except (ValueError, TypeError):
                role_name = linked_user.role
            role_obj = Role.query.filter_by(name=role_name).first()
            if not role_obj:
                role_obj = Role(name=role_name, is_active=True, actions="")
                db.session.add(role_obj)
                db.session.flush()
            linked_user.role = role_name
            linked_user.role_id = role_obj.id

    for field in ["employee_code", "department_id", "designation_id", "first_name", "last_name", "gender", "dob", "phone", "emergency_contact", "address", "city", "state", "country", "pincode", "joining_date", "pf_number", "esi_number", "account_number"]:
        if field in data:
            setattr(employee, field, data[field] or None)

    if "salary" in data:
        salary_value = _parse_float(data.get("salary"))
        if salary_value is None:
            return jsonify({"message": "Salary must be a valid number"}), 400
        employee.salary = salary_value

    if "allowance" in data:
        allowance_value = _parse_float(data.get("allowance"))
        if allowance_value is None:
            return jsonify({"message": "Allowance must be a valid number"}), 400
        employee.allowance = allowance_value

    if "status" in data:
        status_value = _parse_bool(data.get("status"))
        if status_value is None:
            return jsonify({"message": "Status must be a boolean value"}), 400
        employee.status = status_value

    if "is_active" in data:
        is_active_value = _parse_bool(data.get("is_active"))
        if is_active_value is None:
            return jsonify({"message": "is_active must be a boolean value"}), 400
        employee.is_active = is_active_value

    try:
        db.session.commit()
    except IntegrityError as exc:
        return _handle_integrity_error(exc, {
            "employees_employee_code_key": "Employee code already exists",
            "employee_code": "Employee code already exists",
            "employees_user_id_key": "Employee already exists for this user",
            "user_id": "Employee already exists for this user",
            "base_users_email_key": "Email already exists",
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


@employee_bp.route("/<int:employee_id>/payslip", methods=["GET"])
@jwt_required()
@with_token
def get_employee_payslip(employee_id, token_response):
    employee, error_response = _fetch_employee(employee_id)
    if error_response:
        return error_response
    authorized, current_user, error_response = _authorize_employee_action(employee)
    if not authorized:
        return error_response

    today = date.today()
    month = _parse_int(request.args.get("month")) or today.month
    year = _parse_int(request.args.get("year")) or today.year
    if not (1 <= month <= 12):
        return jsonify({"message": "month must be between 1 and 12"}), 400

    monthly_summary = Attendance.get_monthly_summary(employee.id, month, year) or {}

    basic_salary = float(employee.salary) if employee.salary is not None else 0.0
    allowance = float(employee.allowance) if employee.allowance is not None else 0.0
    gross_earnings = round(basic_salary + allowance, 2)

    absent_deduction = monthly_summary.get("absent_deduction", 0.0)
    pf_deduction = round(basic_salary * PF_EMPLOYEE_RATE, 2)
    esi_deduction = round(gross_earnings * ESI_EMPLOYEE_RATE, 2) if gross_earnings <= ESI_WAGE_CEILING else 0.0
    total_deductions = round(pf_deduction + esi_deduction + absent_deduction, 2)
    net_pay = round(gross_earnings - total_deductions, 2)

    data = {
        "employee": {
            "id": employee.id,
            "employee_code": employee.employee_code,
            "first_name": employee.first_name,
            "last_name": employee.last_name,
            "email": employee.user.email if employee.user else None,
            "department": employee.department.department_name if employee.department else None,
            "designation": employee.designation.designation_name if employee.designation else None,
            "company": (
                employee.department.company.name
                if employee.department and employee.department.company
                else None
            ),
            "branch": (
                employee.department.branch.name
                if employee.department and employee.department.branch
                else None
            ),
            "pf_number": employee.pf_number,
            "esi_number": employee.esi_number,
            "account_number": employee.account_number,
        },
        "period": {"month": month, "year": year},
        "attendance": {
            "present_days": monthly_summary.get("present_days"),
            "absent_days": monthly_summary.get("absent_days"),
            "approved_leave_days": monthly_summary.get("approved_leave_days"),
            "holiday_days": monthly_summary.get("holiday_days"),
            "worked_hours": monthly_summary.get("worked_hours"),
        },
        "earnings": {
            "basic_salary": basic_salary,
            "allowance": allowance,
            "gross_earnings": gross_earnings,
        },
        "deductions": {
            "pf": pf_deduction,
            "esi": esi_deduction,
            "loss_of_pay": absent_deduction,
            "total_deductions": total_deductions,
        },
        "net_pay": net_pay,
    }

    return jsonify({"message": "Payslip fetched", "data": data, "token_response": token_response}), 200


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
    attendance.attendance_status = "Present" if attendance.working_hours >= MINIMUM_PRESENT_HOURS else "Absent"
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

    if Attendance.query.filter_by(employee_id=employee_id, attendance_date=attendance_date_obj).first():
        return jsonify({"message": "Employee already has attendance marked for this date"}), 409
    if ManualAttendance.query.filter_by(employee_id=employee_id, attendance_date=attendance_date_obj, is_active=True).first():
        return jsonify({"message": "Manual attendance already recorded for this employee and date"}), 409

    check_in_datetime = _parse_datetime(attendance_date_obj, data.get("check_in"))
    check_out_datetime = _parse_datetime(attendance_date_obj, data.get("check_out"))
    if check_in_datetime is None or check_out_datetime is None:
        return jsonify({"message": "Both check_in and check_out are required for manual attendance"}), 400
    if check_out_datetime <= check_in_datetime:
        return jsonify({"message": "check_out must be after check_in"}), 400
    if (check_out_datetime - check_in_datetime).total_seconds() < 60:
        return jsonify({"message": "Minimum attendance duration is 1 minute"}), 400

    manual_working_hours = round((check_out_datetime - check_in_datetime).total_seconds() / 3600, 2)
    default_status = "Present" if manual_working_hours >= MINIMUM_PRESENT_HOURS else "Absent"
    manual_attendance = ManualAttendance(
        employee_id=employee_id,
        attendance_date=attendance_date_obj,
        check_in=check_in_datetime,
        check_out=check_out_datetime,
        working_hours=manual_working_hours,
        checkin_latitude=data.get("latitude"),
        checkin_longitude=data.get("longitude"),
        checkout_latitude=data.get("checkout_latitude"),
        checkout_longitude=data.get("checkout_longitude"),
        attendance_status=data.get("attendance_status", default_status),
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

    target_employee_id = manual_attendance.employee_id
    if "employee_id" in data:
        employee, error_response = _fetch_employee(data.get("employee_id"))
        if error_response:
            return error_response
        target_employee_id = employee.id

    if target_employee_id != manual_attendance.employee_id or attendance_date_obj != manual_attendance.attendance_date:
        if Attendance.query.filter_by(employee_id=target_employee_id, attendance_date=attendance_date_obj).first():
            return jsonify({"message": "Employee already has attendance marked for this date"}), 409
        if ManualAttendance.query.filter(
            ManualAttendance.employee_id == target_employee_id,
            ManualAttendance.attendance_date == attendance_date_obj,
            ManualAttendance.is_active == True,
            ManualAttendance.id != manual_attendance_id,
        ).first():
            return jsonify({"message": "Manual attendance already recorded for this employee and date"}), 409

    manual_attendance.employee_id = target_employee_id
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
    else:
        manual_attendance.attendance_status = "Present" if manual_attendance.working_hours >= MINIMUM_PRESENT_HOURS else "Absent"

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


@employee_bp.route("/report", methods=["GET"])
@jwt_required()
@with_token
def employee_report(token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    department_id = request.args.get("department_id", type=int)
    designation_id = request.args.get("designation_id", type=int)
    workbook = Employee.generate_employee_report(department_id=department_id, designation_id=designation_id)
    return send_file(
        workbook,
        as_attachment=True,
        download_name="employee_report.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
