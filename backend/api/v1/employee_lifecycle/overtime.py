from datetime import date

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
    get_jwt,
)
from functools import wraps

from extensions import db
from models import (
    Overtime,
    Employee,
    BaseUser,
    Department,
)
from utils import paginate_query


# ============================================================
# BLUEPRINT
# ============================================================

overtime_bp = Blueprint(
    "overtime_bp",
    __name__,
)


# ============================================================
# ALLOWED ROLES
# ============================================================

ALLOWED_ROLES = [
    "admin",
    "HR",
    "HR Director",
    "HR Manager",
    "HR Executive",
]


# ============================================================
# TOKEN HELPER
# ============================================================

def with_token(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            token = get_jwt()
        except Exception:
            token = None

        return func(
            *args,
            token_response=token,
            **kwargs,
        )

    return wrapper


# ============================================================
# CURRENT USER
# ============================================================

def _get_current_user():
    try:
        user_id = int(
            get_jwt_identity()
        )
    except (
        TypeError,
        ValueError,
    ):
        return None

    return BaseUser.query.get(
        user_id
    )


# ============================================================
# ACCESS
# ============================================================

def _has_access(user):
    if not user:
        return False

    role = (
        user.role or ""
    ).strip().lower()

    return role in [
        allowed_role.lower()
        for allowed_role
        in ALLOWED_ROLES
    ]


# ============================================================
# DATE PARSER
# ============================================================

def _parse_date(value):
    if not value:
        return None

    if isinstance(value, date):
        return value

    try:
        return date.fromisoformat(
            str(value)
        )
    except (
        TypeError,
        ValueError,
    ):
        return None


# ============================================================
# INTEGER PARSER
# ============================================================

def _parse_int(value):
    if value is None or value == "":
        return None

    try:
        return int(value)
    except (
        TypeError,
        ValueError,
    ):
        return None


# ============================================================
# FLOAT PARSER
============================================================ #

def _parse_float(value):
    if value is None or value == "":
        return None

    try:
        return float(value)
    except (
        TypeError,
        ValueError,
    ):
        return None


# ============================================================
# BOOLEAN PARSER
============================================================ #

def _parse_bool(value):
    if value is None:
        return None

    if isinstance(value, bool):
        return value

    return str(value).strip().lower() in (
        "true",
        "1",
        "yes",
    )


# ============================================================
# STATUS
# ============================================================

ALLOWED_STATUSES = {
    "Pending",
    "Approved",
    "Rejected",
    "Completed",
    "Cancelled",
}


# ============================================================
# LIST OVERTIME
# ============================================================

@overtime_bp.route(
    "/",
    methods=["GET"],
)
@jwt_required()
@with_token
def list_overtime(token_response):

    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied",
        }), 403

    query = Overtime.query


    # ========================================================
    # ACTIVE / INACTIVE
    # ========================================================

    is_active_param = request.args.get(
        "is_active"
    )

    parsed_is_active = _parse_bool(
        is_active_param
    )

    if parsed_is_active is not None:

        query = query.filter(
            Overtime.is_active
            == parsed_is_active
        )


    # ========================================================
    # EMPLOYEE
    # ========================================================

    employee_id = _parse_int(
        request.args.get(
            "employee_id"
        )
    )

    if employee_id:

        query = query.filter(
            Overtime.employee_id
            == employee_id
        )


    # ========================================================
    # STATUS
    # ========================================================

    status = request.args.get(
        "status"
    )

    if status:

        query = query.filter(
            Overtime.status
            == status
        )


    # ========================================================
    # SINGLE DAY
    #
    # from_date = to_date is supported by frontend for
    # Day-to-Day mode.
    # ========================================================

    overtime_date_param = request.args.get(
        "overtime_date"
    )

    if overtime_date_param:

        overtime_date = _parse_date(
            overtime_date_param
        )

        if overtime_date is None:
            return jsonify({
                "message": (
                    "Invalid overtime_date format. "
                    "Use YYYY-MM-DD."
                )
            }), 400

        query = query.filter(
            Overtime.overtime_date
            == overtime_date
        )


    # ========================================================
    # MONTHLY / QUARTERLY RANGE
    # ========================================================

    from_date_param = request.args.get(
        "from_date"
    )

    to_date_param = request.args.get(
        "to_date"
    )

    if (
        from_date_param
        or to_date_param
    ):

        from_date = _parse_date(
            from_date_param
        )

        to_date = _parse_date(
            to_date_param
        )

        if (
            from_date_param
            and from_date is None
        ):
            return jsonify({
                "message": (
                    "Invalid from_date format. "
                    "Use YYYY-MM-DD."
                )
            }), 400

        if (
            to_date_param
            and to_date is None
        ):
            return jsonify({
                "message": (
                    "Invalid to_date format. "
                    "Use YYYY-MM-DD."
                )
            }), 400

        if (
            from_date
            and to_date
        ):

            if to_date < from_date:
                return jsonify({
                    "message": (
                        "to_date cannot be before "
                        "from_date."
                    )
                }), 400

            query = query.filter(
                Overtime.overtime_date
                >= from_date,
                Overtime.overtime_date
                <= to_date,
            )

        elif from_date:

            query = query.filter(
                Overtime.overtime_date
                >= from_date
            )

        elif to_date:

            query = query.filter(
                Overtime.overtime_date
                <= to_date
            )


    # ========================================================
    # ORGANIZATION FILTERS
    #
    # Company -> Branch -> Department -> Designation
    # ========================================================

    company_id = _parse_int(
        request.args.get(
            "company_id"
        )
    )

    branch_id = _parse_int(
        request.args.get(
            "branch_id"
        )
    )

    department_id = _parse_int(
        request.args.get(
            "department_id"
        )
    )

    designation_id = _parse_int(
        request.args.get(
            "designation_id"
        )
    )


    has_org_filter = (
        company_id
        or branch_id
        or department_id
        or designation_id
    )


    if has_org_filter:

        query = query.join(
            Employee,
            Overtime.employee_id
            == Employee.id,
        )

        if department_id:

            query = query.filter(
                Employee.department_id
                == department_id
            )

        if designation_id:

            query = query.filter(
                Employee.designation_id
                == designation_id
            )

        if (
            company_id
            or branch_id
        ):

            query = query.join(
                Department,
                Employee.department_id
                == Department.id,
            )

            if company_id:

                query = query.filter(
                    Department.company_id
                    == company_id
                )

            if branch_id:

                query = query.filter(
                    Department.branch_id
                    == branch_id
                )


    # ========================================================
    # SEARCH
    # ========================================================

    search = (
        request.args.get("search")
        or request.args.get("q")
    )

    if search:

        from sqlalchemy import or_

        search_value = (
            f"%{search.strip()}%"
        )

        if not has_org_filter:

            query = query.join(
                Employee,
                Overtime.employee_id
                == Employee.id,
            )

        query = query.filter(
            or_(
                Employee.first_name.ilike(
                    search_value
                ),

                Employee.last_name.ilike(
                    search_value
                ),

                Employee.employee_code.ilike(
                    search_value
                ),

                Overtime.status.ilike(
                    search_value
                ),
            )
        )


    # ========================================================
    # ORDER
    # ========================================================

    query = query.order_by(
        Overtime.overtime_date.desc(),
        Overtime.id.desc(),
    )


    return jsonify({
        "message": "Overtime list fetched",
        "data": paginate_query(
            query,
            request.args,
        ),
        "token_response": token_response,
    }), 200


# ============================================================
# GET SINGLE
# ============================================================

@overtime_bp.route(
    "/<int:overtime_id>",
    methods=["GET"],
)
@jwt_required()
@with_token
def get_overtime(
    overtime_id,
    token_response,
):

    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied",
        }), 403

    overtime = Overtime.query.get(
        overtime_id
    )

    if not overtime:
        return jsonify({
            "message": (
                "Overtime record not found"
            ),
        }), 404

    return jsonify({
        "message": (
            "Overtime record fetched"
        ),
        "data": overtime.to_dict(),
        "token_response": token_response,
    }), 200


# ============================================================
# CREATE
# ============================================================

@overtime_bp.route(
    "/",
    methods=["POST"],
)
@jwt_required()
@with_token
def create_overtime(
    token_response,
):

    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied",
        }), 403

    data = request.get_json(
        silent=True
    ) or {}


    # ========================================================
    # EMPLOYEE
    # ========================================================

    employee_id = _parse_int(
        data.get(
            "employee_id"
        )
    )

    if not employee_id:
        return jsonify({
            "message": (
                "employee_id is required"
            ),
        }), 400

    employee = Employee.query.get(
        employee_id
    )

    if not employee:
        return jsonify({
            "message": "Employee not found",
        }), 404


    # ========================================================
    # DATE
    # ========================================================

    overtime_date = _parse_date(
        data.get(
            "overtime_date"
        )
    )

    if overtime_date is None:
        return jsonify({
            "message": (
                "overtime_date is required "
                "and must use YYYY-MM-DD."
            ),
        }), 400


    # ========================================================
    # HOURS
    # ========================================================

    hours = _parse_float(
        data.get("hours")
    )

    if hours is None:
        return jsonify({
            "message": (
                "hours is required"
            ),
        }), 400

    if hours <= 0:
        return jsonify({
            "message": (
                "hours must be greater than 0"
            ),
        }), 400


    # ========================================================
    # STATUS
    # ========================================================

    status = (
        data.get("status")
        or "Pending"
    ).strip()

    if status not in ALLOWED_STATUSES:
        return jsonify({
            "message": (
                "Invalid status. Allowed values: "
                "Pending, Approved, Rejected, "
                "Completed, Cancelled."
            ),
        }), 400


    # ========================================================
    # CREATE
    # ========================================================

    overtime = Overtime(
        employee_id=employee_id,
        overtime_date=overtime_date,
        hours=hours,
        status=status,
        is_active=True,
    )

    db.session.add(overtime)
    db.session.commit()


    return jsonify({
        "message": (
            "Overtime record created"
        ),
        "data": overtime.to_dict(),
        "token_response": token_response,
    }), 201


# ============================================================
# UPDATE / EDIT
# ============================================================

@overtime_bp.route(
    "/<int:overtime_id>",
    methods=["PUT"],
)
@jwt_required()
@with_token
def update_overtime(
    overtime_id,
    token_response,
):

    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied",
        }), 403

    overtime = Overtime.query.get(
        overtime_id
    )

    if not overtime:
        return jsonify({
            "message": (
                "Overtime record not found"
            ),
        }), 404

    data = request.get_json(
        silent=True
    ) or {}


    # ========================================================
    # EMPLOYEE
    # ========================================================

    if "employee_id" in data:

        employee_id = _parse_int(
            data.get(
                "employee_id"
            )
        )

        if not employee_id:
            return jsonify({
                "message": (
                    "Invalid employee_id"
                ),
            }), 400

        employee = Employee.query.get(
            employee_id
        )

        if not employee:
            return jsonify({
                "message": (
                    "Employee not found"
                ),
            }), 404

        overtime.employee_id = (
            employee_id
        )


    # ========================================================
    # DATE
    # ========================================================

    if "overtime_date" in data:

        parsed_date = _parse_date(
            data.get(
                "overtime_date"
            )
        )

        if parsed_date is None:
            return jsonify({
                "message": (
                    "Invalid overtime_date. "
                    "Use YYYY-MM-DD."
                ),
            }), 400

        overtime.overtime_date = (
            parsed_date
        )


    # ========================================================
    # HOURS
    # ========================================================

    if "hours" in data:

        hours = _parse_float(
            data.get("hours")
        )

        if hours is None:
            return jsonify({
                "message": (
                    "Invalid hours"
                ),
            }), 400

        if hours <= 0:
            return jsonify({
                "message": (
                    "hours must be greater than 0"
                ),
            }), 400

        overtime.hours = hours


    # ========================================================
    # STATUS
    # ========================================================

    if "status" in data:

        status = (
            data.get("status")
            or "Pending"
        ).strip()

        if status not in ALLOWED_STATUSES:
            return jsonify({
                "message": (
                    "Invalid status. Allowed values: "
                    "Pending, Approved, Rejected, "
                    "Completed, Cancelled."
                ),
            }), 400

        overtime.status = status


    # ========================================================
    # ACTIVE STATUS
    # ========================================================

    if "is_active" in data:

        parsed_active = _parse_bool(
            data.get(
                "is_active"
            )
        )

        if parsed_active is None:
            return jsonify({
                "message": (
                    "Invalid is_active value"
                ),
            }), 400

        overtime.is_active = (
            parsed_active
        )


    # ========================================================
    # SAVE
    # ========================================================

    db.session.commit()


    return jsonify({
        "message": (
            "Overtime record updated"
        ),
        "data": overtime.to_dict(),
        "token_response": token_response,
    }), 200


# ============================================================
# DEACTIVATE
# ============================================================

@overtime_bp.route(
    "/<int:overtime_id>/deactivate",
    methods=["DELETE"],
)
@jwt_required()
@with_token
def deactivate_overtime(
    overtime_id,
    token_response,
):

    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied",
        }), 403

    overtime = Overtime.query.get(
        overtime_id
    )

    if not overtime:
        return jsonify({
            "message": (
                "Overtime record not found"
            ),
        }), 404

    overtime.is_active = False

    db.session.commit()

    return jsonify({
        "message": (
            "Overtime record deactivated"
        ),
        "data": overtime.to_dict(),
        "token_response": token_response,
    }), 200


# ============================================================
# REACTIVATE
# ============================================================

@overtime_bp.route(
    "/<int:overtime_id>/reactivate",
    methods=["PUT"],
)
@jwt_required()
@with_token
def reactivate_overtime(
    overtime_id,
    token_response,
):

    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied",
        }), 403

    overtime = Overtime.query.get(
        overtime_id
    )

    if not overtime:
        return jsonify({
            "message": (
                "Overtime record not found"
            ),
        }), 404

    overtime.is_active = True

    db.session.commit()

    return jsonify({
        "message": (
            "Overtime record reactivated"
        ),
        "data": overtime.to_dict(),
        "token_response": token_response,
    }), 200