from datetime import date
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from extensions import db
from models import BaseUser, Employee, Attendance, Leave, Role

dashboard_bp = Blueprint("dashboard_bp", __name__)

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


@dashboard_bp.route("/stats", methods=["GET"])
@jwt_required()
@with_token
def stats(token_response):
    current_user = _get_current_user()
    if not _is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    today = date.today()

    total_employees = Employee.query.count()
    active_employees = Employee.query.filter_by(is_active=True).count()

    present_today = db.session.query(db.func.count(db.distinct(Attendance.employee_id))) \
        .filter(Attendance.attendance_date == today, Attendance.check_in.isnot(None), Attendance.is_active == True) \
        .scalar() or 0

    on_leave_today = db.session.query(db.func.count(db.distinct(Leave.employee_id))) \
        .filter(
            Leave.status == "Approved",
            Leave.is_active == True,
            Leave.from_date <= today,
            Leave.to_date >= today,
        ) \
        .scalar() or 0

    absent_today = max(active_employees - present_today - on_leave_today, 0)

    total_roles = Role.query.filter_by(is_active=True).count()
    total_users = BaseUser.query.filter_by(is_active=True).count()
    logged_in_users_count = BaseUser.query.filter(BaseUser.last_login.isnot(None)).count()
    pending_leaves_count = Leave.query.filter_by(status="Pending", is_active=True).count()

    return jsonify({
        "message": "Dashboard stats fetched",
        "data": {
            "total_employees": total_employees,
            "active_employees": active_employees,
            "present_today": present_today,
            "absent_today": absent_today,
            "on_leave_today": on_leave_today,
            "total_roles": total_roles,
            "total_users": total_users,
            "logged_in_users_count": logged_in_users_count,
            "pending_leaves_count": pending_leaves_count,
        },
        "token_response": token_response,
    }), 200
