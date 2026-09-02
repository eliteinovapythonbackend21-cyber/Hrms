import calendar
from datetime import date
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from functools import wraps

from models import Leave, Employee, BaseUser, Department
from utils import is_hr_department_user, paginate_query

leave_bp = Blueprint("leave_bp", __name__)


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


# Roles that are allowed to browse every employee's leave records.
# Everyone else (plain "employee" logins, including CRM/HR department
# employees) must only ever see their own leave requests, no matter what
# employee_id (if any) the client happens to send.
PRIVILEGED_LEAVE_ROLES = {
    "admin",
    "HR",
    "HR Director",
    "HR Manager",
    "HR Executive",
    "HR Assistant",
    "Recruiter",
    "Payroll Executive",
    "Training Coordinator",
}


def _parse_date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _parse_int(value):
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


@leave_bp.route("/", methods=["GET"])
@jwt_required()
@with_token
def list_leaves(token_response):
    query = Leave.query

    applied_filters = {}  # temporary debug trace, same as attendance_bp.py

    current_user = _get_current_user()
    is_privileged = bool(current_user) and (
        current_user.role in PRIVILEGED_LEAVE_ROLES
        # HR-department "employee" logins get the same read-only,
        # organization-wide view as the admin's Leave Management screen
        # (mirrors the HR sidebar's Attendance/Leaves entries); they still
        # can't write anything the frontend doesn't already gate off.
        or is_hr_department_user(current_user)
    )

    if is_privileged:
        if request.args.get("employee_id"):
            query = query.filter_by(employee_id=request.args.get("employee_id"))
            applied_filters["employee_id"] = request.args.get("employee_id")
    else:
        # Non-privileged logins (plain employees, including CRM/HR
        # department employees) can only ever see their own leave
        # records. Derive this from the JWT identity server-side rather
        # than trusting an employee_id the client sends, so this can't
        # be bypassed and doesn't depend on the frontend remembering to
        # send the right filter.
        own_employee = (
            Employee.query.filter_by(user_id=current_user.id).first()
            if current_user
            else None
        )

        query = query.filter_by(employee_id=own_employee.id if own_employee else -1)
        applied_filters["employee_id"] = own_employee.id if own_employee else None

    if request.args.get("status"):
        query = query.filter_by(status=request.args.get("status"))
        applied_filters["status"] = request.args.get("status")

    # Day-to-day: a leave is "on" a given date if that date falls
    # within [from_date, to_date] inclusive.
    single_date_str = request.args.get("attendance_date") or request.args.get("leave_date")
    if single_date_str:
        single_date = _parse_date(single_date_str)
        if single_date is None:
            return jsonify({"message": "Invalid date format. Use YYYY-MM-DD."}), 400
        query = query.filter(Leave.from_date <= single_date, Leave.to_date >= single_date)
        applied_filters["date"] = single_date.isoformat()

    # Monthly / Quarterly: overlap logic, same as
    # Leave.generate_leave_report - a leave overlaps the requested
    # period if it starts on/before the period ends AND ends on/after
    # the period starts. This is deliberately NOT a between()/>=/<=
    # on a single column, since a leave spans a range of its own.
    from_date_str = request.args.get("from_date")
    to_date_str = request.args.get("to_date")
    if from_date_str or to_date_str:
        from_date = _parse_date(from_date_str)
        to_date = _parse_date(to_date_str)
        if from_date_str and from_date is None:
            return jsonify({"message": "Invalid from_date format. Use YYYY-MM-DD."}), 400
        if to_date_str and to_date is None:
            return jsonify({"message": "Invalid to_date format. Use YYYY-MM-DD."}), 400

        if from_date and to_date:
            query = query.filter(Leave.from_date <= to_date, Leave.to_date >= from_date)
        elif from_date:
            query = query.filter(Leave.to_date >= from_date)
        elif to_date:
            query = query.filter(Leave.from_date <= to_date)

        applied_filters["from_date"] = from_date_str
        applied_filters["to_date"] = to_date_str

    # Organization filters (Company -> Branch -> Department -> Designation)
    # via Leave -> Employee -> Department -> Branch/Company, same join
    # pattern as attendance_bp.py.
    company_id = _parse_int(request.args.get("company_id"))
    branch_id = _parse_int(request.args.get("branch_id"))
    department_id = _parse_int(request.args.get("department_id"))
    designation_id = _parse_int(request.args.get("designation_id"))

    if company_id or branch_id or department_id or designation_id:
        query = query.join(Employee, Leave.employee_id == Employee.id)

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
    result_data["_debug_applied_filters"] = applied_filters  # remove once confirmed working

    return jsonify({
        "message": "Leave list fetched",
        "data": result_data,
        "token_response": token_response,
    }), 200


@leave_bp.route("/<int:leave_id>", methods=["GET"])
@jwt_required()
@with_token
def get_leave(leave_id, token_response):
    leave = Leave.query.get(leave_id)
    if not leave:
        return jsonify({"message": "Leave not found"}), 404
    return jsonify({"message": "Leave fetched", "data": leave.to_dict(), "token_response": token_response}), 200


@leave_bp.route("/", methods=["POST"])
@jwt_required()
@with_token
def create_leave(token_response):
    data = request.json or {}
    from_date = _parse_date(data.get("from_date"))
    to_date = _parse_date(data.get("to_date"))
    if not from_date or not to_date:
        return jsonify({"message": "from_date and to_date are required (YYYY-MM-DD)"}), 400
    if to_date < from_date:
        return jsonify({"message": "to_date cannot be before from_date"}), 400

    # Resolve the employee. Admins may pass any employee_id; for everyone
    # else it is always their own linked Employee record, regardless of
    # what the client sent.
    current_user = _get_current_user()
    employee_id = _parse_int(data.get("employee_id"))
    if not _is_admin(current_user):
        own = Employee.query.filter_by(user_id=current_user.id).first() if current_user else None
        if not own:
            return jsonify({"message": "No employee record is linked to your account."}), 400
        employee_id = own.id

    if not employee_id:
        return jsonify({"message": "employee_id is required"}), 400

    if not data.get("leave_type_id"):
        return jsonify({"message": "leave_type_id is required"}), 400

    total_days = (to_date - from_date).days + 1

    leave = Leave(
        employee_id=employee_id,
        leave_type_id=data.get("leave_type_id"),
        from_date=from_date,
        to_date=to_date,
        total_days=data.get("total_days", total_days),
        reason=data.get("reason"),
        description=data.get("description"),
        status=data.get("status", "Pending"),
        is_active=True,
    )
    from extensions import db
    db.session.add(leave)
    db.session.commit()

    return jsonify({"message": "Leave created", "data": leave.to_dict(), "token_response": token_response}), 201


@leave_bp.route("/<int:leave_id>", methods=["PUT"])
@jwt_required()
@with_token
def update_leave(leave_id, token_response):
    from extensions import db
    leave = Leave.query.get(leave_id)
    if not leave:
        return jsonify({"message": "Leave not found"}), 404

    data = request.json or {}
    for field in ["employee_id", "leave_type_id", "reason", "description", "status", "is_active", "total_days"]:
        if field in data:
            setattr(leave, field, data[field])

    if "from_date" in data:
        parsed = _parse_date(data["from_date"])
        if parsed is None:
            return jsonify({"message": "Invalid from_date format"}), 400
        leave.from_date = parsed
    if "to_date" in data:
        parsed = _parse_date(data["to_date"])
        if parsed is None:
            return jsonify({"message": "Invalid to_date format"}), 400
        leave.to_date = parsed

    db.session.commit()
    return jsonify({"message": "Leave updated", "data": leave.to_dict(), "token_response": token_response}), 200


@leave_bp.route("/<int:leave_id>/deactivate", methods=["DELETE"])
@jwt_required()
@with_token
def deactivate_leave(leave_id, token_response):
    from extensions import db
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    leave = Leave.query.get(leave_id)
    if not leave:
        return jsonify({"message": "Leave not found"}), 404

    leave.is_active = False
    db.session.commit()
    return jsonify({"message": "Leave deactivated", "data": leave.to_dict(), "token_response": token_response}), 200


@leave_bp.route("/<int:leave_id>/approve", methods=["POST"])
@jwt_required()
@with_token
def approve_leave(leave_id, token_response):
    from extensions import db
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    leave = Leave.query.get(leave_id)
    if not leave:
        return jsonify({"message": "Leave not found"}), 404

    leave.status = "Approved"
    db.session.commit()
    return jsonify({"message": "Leave approved", "data": leave.to_dict(), "token_response": token_response}), 200


@leave_bp.route("/<int:leave_id>/reject", methods=["POST"])
@jwt_required()
@with_token
def reject_leave(leave_id, token_response):
    from extensions import db
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    leave = Leave.query.get(leave_id)
    if not leave:
        return jsonify({"message": "Leave not found"}), 404

    leave.status = "Rejected"
    db.session.commit()
    return jsonify({"message": "Leave rejected", "data": leave.to_dict(), "token_response": token_response}), 200


@leave_bp.route("/report", methods=["GET"])
@jwt_required()
@with_token
def leave_report(token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    from_date = _parse_date(request.args.get("from_date"))
    to_date = _parse_date(request.args.get("to_date"))
    employee_id = request.args.get("employee_id")

    workbook = Leave.generate_leave_report(from_date=from_date, to_date=to_date, employee_id=employee_id)
    filename = f"leave_report_{request.args.get('from_date') or 'all'}_{request.args.get('to_date') or 'all'}.xlsx"
    return send_file(workbook, as_attachment=True, download_name=filename, mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


@leave_bp.route("/monthly-summary", methods=["GET"])
@jwt_required()
@with_token
def leave_monthly_summary(token_response):
    """Monthly Leave Record — one row per employee for the requested
    month, with total leave days (clipped to the month), request count,
    and per-status / per-category breakdowns.

    Scope mirrors list_leaves: admins & HR see everyone (optionally
    filtered by employee_id / org filters); every other login sees only
    their own record.
    """
    today = date.today()
    month = _parse_int(request.args.get("month")) or today.month
    year = _parse_int(request.args.get("year")) or today.year
    if not (1 <= month <= 12):
        return jsonify({"message": "month must be 1-12"}), 400

    period_start = date(year, month, 1)
    period_end = date(year, month, calendar.monthrange(year, month)[1])

    current_user = _get_current_user()
    is_privileged = bool(current_user) and (
        current_user.role in PRIVILEGED_LEAVE_ROLES
        or is_hr_department_user(current_user)
    )

    query = Leave.query.filter(
        Leave.is_active.is_(True),
        Leave.from_date <= period_end,
        Leave.to_date >= period_start,
    )

    if is_privileged:
        emp_filter = _parse_int(request.args.get("employee_id"))
        if emp_filter:
            query = query.filter(Leave.employee_id == emp_filter)

        company_id = _parse_int(request.args.get("company_id"))
        branch_id = _parse_int(request.args.get("branch_id"))
        department_id = _parse_int(request.args.get("department_id"))
        designation_id = _parse_int(request.args.get("designation_id"))
        if company_id or branch_id or department_id or designation_id:
            query = query.join(Employee, Leave.employee_id == Employee.id)
            if department_id:
                query = query.filter(Employee.department_id == department_id)
            if designation_id:
                query = query.filter(Employee.designation_id == designation_id)
            if company_id or branch_id:
                query = query.join(Department, Employee.department_id == Department.id)
                if company_id:
                    query = query.filter(Department.company_id == company_id)
                if branch_id:
                    query = query.filter(Department.branch_id == branch_id)
    else:
        own_employee = (
            Employee.query.filter_by(user_id=current_user.id).first()
            if current_user
            else None
        )
        query = query.filter(Leave.employee_id == (own_employee.id if own_employee else -1))

    rows = {}
    for leave in query.all():
        overlap_start = max(leave.from_date, period_start)
        overlap_end = min(leave.to_date, period_end)
        days = (overlap_end - overlap_start).days + 1
        if days <= 0:
            continue

        emp = leave.employee
        bucket = rows.setdefault(
            leave.employee_id,
            {
                "employee_id": leave.employee_id,
                "employee": _emp_name(emp),
                "employee_code": getattr(emp, "employee_code", None),
                "department": emp.department.name if emp and emp.department else None,
                "total_days": 0,
                "request_count": 0,
                "by_status": {},
                "by_category": {},
                "by_type": {},
                "leaves": [],
            },
        )
        bucket["total_days"] += days
        bucket["request_count"] += 1
        bucket["by_status"][leave.status] = bucket["by_status"].get(leave.status, 0) + days

        lt = leave.leave_type
        category = (lt.category if lt and getattr(lt, "category", None) else "Leave")
        type_name = lt.name if lt else "—"
        bucket["by_category"][category] = bucket["by_category"].get(category, 0) + days
        bucket["by_type"][type_name] = bucket["by_type"].get(type_name, 0) + days
        bucket["leaves"].append({
            "id": leave.id,
            "leave_type": type_name,
            "category": category,
            "from_date": leave.from_date.isoformat() if leave.from_date else None,
            "to_date": leave.to_date.isoformat() if leave.to_date else None,
            "days_in_month": days,
            "status": leave.status,
            "reason": leave.reason,
            "description": leave.description,
        })

    result = sorted(rows.values(), key=lambda r: (r["employee"] or "").lower())
    totals = {
        "employees": len(result),
        "total_days": sum(r["total_days"] for r in result),
        "requests": sum(r["request_count"] for r in result),
    }

    return jsonify({
        "message": "Monthly leave record fetched",
        "data": {
            "month": month,
            "year": year,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "rows": result,
            "totals": totals,
        },
        "token_response": token_response,
    }), 200


def _emp_name(emp):
    if not emp:
        return "—"
    return f"{emp.first_name or ''} {emp.last_name or ''}".strip() or "—"