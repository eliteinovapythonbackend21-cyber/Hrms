from datetime import date, datetime
from functools import wraps

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from extensions import db
from models import EmployeePermission, Employee, BaseUser
from utils import paginate_query


employee_permissions_bp = Blueprint( "employee_permissions_bp", __name__)


ALLOWED_ROLES = [
    "admin",
    "HR Director",
    "HR Manager",
    "HR Executive",
]


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
            **kwargs
        )

    return wrapper


def _get_current_user():
    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return None

    return BaseUser.query.get(user_id)


def _has_access(user):
    if not user:
        return False

    role = (user.role or "").strip().lower()

    return role in [
        role_name.lower()
        for role_name in ALLOWED_ROLES
    ]


def _parse_date(value):
    if not value:
        return None

    if isinstance(value, date):
        return value

    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def _parse_time(value):
    if not value:
        return None

    if hasattr(value, "hour"):
        return value

    try:
        return datetime.strptime(
            value,
            "%H:%M"
        ).time()
    except ValueError:
        try:
            return datetime.strptime(
                value,
                "%H:%M:%S"
            ).time()
        except ValueError:
            return None


def _parse_int(value):
    if value is None or value == "":
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _parse_bool(value):
    if value is None:
        return None

    if isinstance(value, bool):
        return value

    return str(value).strip().lower() in (
        "true",
        "1",
        "yes",
        "active",
    )


@employee_permissions_bp.route("/", methods=["GET"])
@jwt_required()
@with_token
def list_permissions(token_response):
    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied"
        }), 403

    query = EmployeePermission.query

    # ---------------------------------------------------------
    # Active / Inactive / All
    # ---------------------------------------------------------

    is_active_param = request.args.get("is_active")

    parsed_is_active = _parse_bool(
        is_active_param
    )

    if parsed_is_active is not None:
        query = query.filter(
            EmployeePermission.is_active
            == parsed_is_active
        )

    # ---------------------------------------------------------
    # Employee filter
    # ---------------------------------------------------------

    employee_id = _parse_int(
        request.args.get("employee_id")
    )

    if employee_id:
        query = query.filter(
            EmployeePermission.employee_id
            == employee_id
        )

    # ---------------------------------------------------------
    # Status filter
    # ---------------------------------------------------------

    status = request.args.get("status")

    if status:
        query = query.filter(
            EmployeePermission.status
            == status
        )

    # ---------------------------------------------------------
    # Permission date filter
    # ---------------------------------------------------------

    permission_date = request.args.get(
        "permission_date"
    )

    if permission_date:
        parsed_date = _parse_date(
            permission_date
        )

        if parsed_date is None:
            return jsonify({
                "message": (
                    "Invalid permission_date format. "
                    "Use YYYY-MM-DD."
                )
            }), 400

        query = query.filter(
            EmployeePermission.permission_date
            == parsed_date
        )

    # ---------------------------------------------------------
    # Date range filter
    # ---------------------------------------------------------

    from_date_param = request.args.get(
        "from_date"
    )

    to_date_param = request.args.get(
        "to_date"
    )

    if from_date_param or to_date_param:

        from_date = _parse_date(
            from_date_param
        )

        to_date = _parse_date(
            to_date_param
        )

        if from_date_param and from_date is None:
            return jsonify({
                "message": (
                    "Invalid from_date format. "
                    "Use YYYY-MM-DD."
                )
            }), 400

        if to_date_param and to_date is None:
            return jsonify({
                "message": (
                    "Invalid to_date format. "
                    "Use YYYY-MM-DD."
                )
            }), 400

        if from_date and to_date:
            query = query.filter(
                EmployeePermission.permission_date
                >= from_date,
                EmployeePermission.permission_date
                <= to_date,
            )

        elif from_date:
            query = query.filter(
                EmployeePermission.permission_date
                >= from_date
            )

        elif to_date:
            query = query.filter(
                EmployeePermission.permission_date
                <= to_date
            )

    # ---------------------------------------------------------
    # Organization filters
    # Company -> Branch -> Department
    # ---------------------------------------------------------

    company_id = _parse_int(
        request.args.get("company_id")
    )

    branch_id = _parse_int(
        request.args.get("branch_id")
    )

    department_id = _parse_int(
        request.args.get("department_id")
    )

    designation_id = _parse_int(
        request.args.get("designation_id")
    )

    if (
        company_id
        or branch_id
        or department_id
        or designation_id
    ):
        query = query.join(
            Employee,
            EmployeePermission.employee_id
            == Employee.id
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

        if company_id or branch_id:
            # Import these only if your Employee model
            # uses Department -> Company / Branch.
            from models import Department

            query = query.join(
                Department,
                Employee.department_id
                == Department.id
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

    # ---------------------------------------------------------
    # Ordering
    # ---------------------------------------------------------

    query = query.order_by(
        EmployeePermission.permission_date.desc(),
        EmployeePermission.id.desc(),
    )

    return jsonify({
        "message": "Permission requests fetched",
        "data": paginate_query(
            query,
            request.args
        ),
        "token_response": token_response,
    }), 200


@employee_permissions_bp.route(
    "/<int:permission_id>",
    methods=["GET"]
)
@jwt_required()
@with_token
def get_permission(
    permission_id,
    token_response
):
    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied"
        }), 403

    permission = EmployeePermission.query.get(
        permission_id
    )

    if not permission:
        return jsonify({
            "message": "Permission request not found"
        }), 404

    return jsonify({
        "message": "Permission request fetched",
        "data": permission.to_dict(),
        "token_response": token_response,
    }), 200


@employee_permissions_bp.route(
    "/",
    methods=["POST"]
)
@jwt_required()
@with_token
def create_permission(token_response):
    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied"
        }), 403

    data = request.get_json(
        silent=True
    ) or {}

    # ---------------------------------------------------------
    # Employee
    # ---------------------------------------------------------

    employee_id = _parse_int(
        data.get("employee_id")
    )

    if not employee_id:
        return jsonify({
            "message": "employee_id is required"
        }), 400

    employee = Employee.query.get(
        employee_id
    )

    if not employee:
        return jsonify({
            "message": "Employee not found"
        }), 404

    # ---------------------------------------------------------
    # Permission date
    # ---------------------------------------------------------

    permission_date = _parse_date(
        data.get("permission_date")
    )

    if permission_date is None:
        return jsonify({
            "message": (
                "permission_date is required "
                "and must use YYYY-MM-DD."
            )
        }), 400

    # ---------------------------------------------------------
    # From time
    # ---------------------------------------------------------

    from_time = _parse_time(
        data.get("from_time")
    )

    if from_time is None:
        return jsonify({
            "message": (
                "from_time is required "
                "and must use HH:MM."
            )
        }), 400

    # ---------------------------------------------------------
    # To time
    # ---------------------------------------------------------

    to_time = _parse_time(
        data.get("to_time")
    )

    if to_time is None:
        return jsonify({
            "message": (
                "to_time is required "
                "and must use HH:MM."
            )
        }), 400

    # ---------------------------------------------------------
    # Time validation
    # ---------------------------------------------------------

    if to_time <= from_time:
        return jsonify({
            "message": (
                "to_time must be later than from_time"
            )
        }), 400

    # ---------------------------------------------------------
    # Status
    # ---------------------------------------------------------

    status = data.get(
        "status",
        "Pending"
    )

    if not status:
        status = "Pending"

    # ---------------------------------------------------------
    # Create
    # ---------------------------------------------------------

    permission = EmployeePermission(
        employee_id=employee_id,
        permission_date=permission_date,
        from_time=from_time,
        to_time=to_time,
        reason=data.get("reason"),
        status=status,
        is_active=True,
    )

    db.session.add(permission)
    db.session.commit()

    return jsonify({
        "message": "Permission request created",
        "data": permission.to_dict(),
        "token_response": token_response,
    }), 201


@employee_permissions_bp.route(
    "/<int:permission_id>",
    methods=["PUT"]
)
@jwt_required()
@with_token
def update_permission(
    permission_id,
    token_response
):
    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied"
        }), 403

    permission = EmployeePermission.query.get(
        permission_id
    )

    if not permission:
        return jsonify({
            "message": "Permission request not found"
        }), 404

    data = request.get_json(
        silent=True
    ) or {}

    # ---------------------------------------------------------
    # Employee
    # ---------------------------------------------------------

    if "employee_id" in data:

        employee_id = _parse_int(
            data.get("employee_id")
        )

        if not employee_id:
            return jsonify({
                "message": "Invalid employee_id"
            }), 400

        employee = Employee.query.get(
            employee_id
        )

        if not employee:
            return jsonify({
                "message": "Employee not found"
            }), 404

        permission.employee_id = employee_id

    # ---------------------------------------------------------
    # Permission date
    # ---------------------------------------------------------

    if "permission_date" in data:

        parsed_date = _parse_date(
            data.get("permission_date")
        )

        if parsed_date is None:
            return jsonify({
                "message": (
                    "Invalid permission_date format. "
                    "Use YYYY-MM-DD."
                )
            }), 400

        permission.permission_date = parsed_date

    # ---------------------------------------------------------
    # From time
    # ---------------------------------------------------------

    if "from_time" in data:

        parsed_time = _parse_time(
            data.get("from_time")
        )

        if parsed_time is None:
            return jsonify({
                "message": (
                    "Invalid from_time format. "
                    "Use HH:MM."
                )
            }), 400

        permission.from_time = parsed_time

    # ---------------------------------------------------------
    # To time
    # ---------------------------------------------------------

    if "to_time" in data:

        parsed_time = _parse_time(
            data.get("to_time")
        )

        if parsed_time is None:
            return jsonify({
                "message": (
                    "Invalid to_time format. "
                    "Use HH:MM."
                )
            }), 400

        permission.to_time = parsed_time

    # ---------------------------------------------------------
    # Validate time range after updates
    # ---------------------------------------------------------

    if (
        permission.from_time
        and permission.to_time
        and permission.to_time
        <= permission.from_time
    ):
        return jsonify({
            "message": (
                "to_time must be later than from_time"
            )
        }), 400

    # ---------------------------------------------------------
    # Reason
    # ---------------------------------------------------------

    if "reason" in data:
        permission.reason = data.get(
            "reason"
        )

    # ---------------------------------------------------------
    # Status
    # ---------------------------------------------------------

    if "status" in data:
        permission.status = data.get(
            "status"
        )

    # ---------------------------------------------------------
    # Active status
    # ---------------------------------------------------------

    if "is_active" in data:

        parsed_active = _parse_bool(
            data.get("is_active")
        )

        if parsed_active is None:
            return jsonify({
                "message": "Invalid is_active value"
            }), 400

        permission.is_active = parsed_active

    db.session.commit()

    return jsonify({
        "message": "Permission request updated",
        "data": permission.to_dict(),
        "token_response": token_response,
    }), 200


@employee_permissions_bp.route(
    "/<int:permission_id>/deactivate",
    methods=["DELETE"]
)
@jwt_required()
@with_token
def deactivate_permission(
    permission_id,
    token_response
):
    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied"
        }), 403

    permission = EmployeePermission.query.get(
        permission_id
    )

    if not permission:
        return jsonify({
            "message": "Permission request not found"
        }), 404

    permission.is_active = False

    db.session.commit()

    return jsonify({
        "message": "Permission request deactivated",
        "data": permission.to_dict(),
        "token_response": token_response,
    }), 200


@employee_permissions_bp.route(
    "/<int:permission_id>/reactivate",
    methods=["PUT"]
)
@jwt_required()
@with_token
def reactivate_permission(
    permission_id,
    token_response
):
    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied"
        }), 403

    permission = EmployeePermission.query.get(
        permission_id
    )

    if not permission:
        return jsonify({
            "message": "Permission request not found"
        }), 404

    permission.is_active = True

    db.session.commit()

    return jsonify({
        "message": "Permission request reactivated",
        "data": permission.to_dict(),
        "token_response": token_response,
    }), 200