from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from functools import wraps

from extensions import db
from models import Performance, Employee, BaseUser
from utils import paginate_query


# ============================================================
# BLUEPRINT
# ============================================================

performance_bp = Blueprint(
    "performance_bp",
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
            **kwargs
        )

    return wrapper


# ============================================================
# CURRENT USER
# ============================================================

def _get_current_user():
    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return None

    return BaseUser.query.get(user_id)


# ============================================================
# ROLE ACCESS
# ============================================================

def _has_access(user):
    if not user:
        return False

    role = (user.role or "").strip().lower()

    return role in [
        role_name.lower()
        for role_name in ALLOWED_ROLES
    ]


# ============================================================
# INTEGER PARSER
# ============================================================

def _parse_int(value):
    if value is None or value == "":
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


# ============================================================
# BOOLEAN PARSER
# ============================================================

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
# SCORE (0-5) PARSER
# ============================================================

SCORE_MIN = 0
SCORE_MAX = 5


def _parse_score(value, field_label):
    if value is None or value == "":
        return None, f"{field_label} is required"

    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None, f"{field_label} must be a valid number"

    if parsed < SCORE_MIN or parsed > SCORE_MAX:
        return None, (
            f"{field_label} must be between "
            f"{SCORE_MIN} and {SCORE_MAX}"
        )

    return parsed, None


# ============================================================
# HIERARCHY LEVEL VALIDATION
# ============================================================

ALLOWED_HIERARCHY_LEVELS = {
    "Level 1",
    "Level 2",
    "Level 3",
    "Level 4",
    "Level 5",
}


# ============================================================
# ORGANIZATION SNAPSHOT
#
# Copies the employee's current organization onto the review
# record, same intent as the old populate_performance_organization()
# but reading through employee.department (company_id/branch_id
# live on Department, not directly on Employee) - the previous
# version read employee.company_id / employee.branch_id directly,
# which don't exist on the Employee model, so every review was
# saved with company_id/branch_id/department_id/designation_id
# all None. This is why the list page showed "-" for Company,
# Branch, Department, and Designation on every row.
# ============================================================

def _populate_organization(performance, employee):
    department = getattr(employee, "department", None)

    performance.company_id = (
        getattr(department, "company_id", None)
        if department else None
    )

    performance.branch_id = (
        getattr(department, "branch_id", None)
        if department else None
    )

    performance.department_id = getattr(
        employee, "department_id", None
    )

    performance.designation_id = getattr(
        employee, "designation_id", None
    )


# ============================================================
# LIST PERFORMANCE REVIEWS
# ============================================================

@performance_bp.route(
    "/",
    methods=["GET"]
)
@jwt_required()
@with_token
def list_performance(token_response):

    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied"
        }), 403

    query = Performance.query

    # ========================================================
    # ACTIVE / INACTIVE / ALL
    # ========================================================

    is_active_param = request.args.get(
        "is_active"
    )

    parsed_is_active = _parse_bool(
        is_active_param
    )

    if parsed_is_active is not None:
        query = query.filter(
            Performance.is_active
            == parsed_is_active
        )

    # ========================================================
    # EMPLOYEE FILTER
    # ========================================================

    employee_id = _parse_int(
        request.args.get("employee_id")
    )

    if employee_id:
        query = query.filter(
            Performance.employee_id
            == employee_id
        )

    # ========================================================
    # REVIEW PERIOD FILTER
    # ========================================================

    review_period = request.args.get(
        "review_period"
    )

    if review_period:
        query = query.filter(
            Performance.review_period
            == review_period
        )

    # ========================================================
    # HIERARCHY LEVEL FILTER
    # ========================================================

    hierarchy_level = request.args.get(
        "hierarchy_level"
    )

    if hierarchy_level:
        query = query.filter(
            Performance.hierarchy_level
            == hierarchy_level
        )

    # ========================================================
    # ORGANIZATION FILTERS
    #
    # Company -> Branch -> Department -> Designation
    # ========================================================

    company_id = _parse_int(
        request.args.get("company_id")
    )

    if company_id:
        query = query.filter(
            Performance.company_id
            == company_id
        )

    branch_id = _parse_int(
        request.args.get("branch_id")
    )

    if branch_id:
        query = query.filter(
            Performance.branch_id
            == branch_id
        )

    department_id = _parse_int(
        request.args.get("department_id")
    )

    if department_id:
        query = query.filter(
            Performance.department_id
            == department_id
        )

    designation_id = _parse_int(
        request.args.get("designation_id")
    )

    if designation_id:
        query = query.filter(
            Performance.designation_id
            == designation_id
        )

    # ========================================================
    # SEARCH (review_period only, matching the previous
    # search_fields=["review_period"] config)
    # ========================================================

    search = request.args.get("search")

    if search:
        like_pattern = f"%{search}%"

        query = query.filter(
            Performance.review_period.ilike(
                like_pattern
            )
        )

    # ========================================================
    # ORDER
    # ========================================================

    query = query.order_by(
        Performance.id.desc()
    )

    # ========================================================
    # RESPONSE
    # ========================================================

    return jsonify({
        "message": "Performance reviews fetched",
        "data": paginate_query(
            query,
            request.args
        ),
        "token_response": token_response,
    }), 200


# ============================================================
# GET SINGLE PERFORMANCE REVIEW
# ============================================================

@performance_bp.route(
    "/<int:performance_id>",
    methods=["GET"]
)
@jwt_required()
@with_token
def get_performance(
    performance_id,
    token_response
):

    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied"
        }), 403

    performance = Performance.query.get(
        performance_id
    )

    if not performance:
        return jsonify({
            "message": "Performance review not found"
        }), 404

    return jsonify({
        "message": "Performance review fetched",
        "data": performance.to_dict(),
        "token_response": token_response,
    }), 200


# ============================================================
# CREATE PERFORMANCE REVIEW
# ============================================================

@performance_bp.route(
    "/",
    methods=["POST"]
)
@jwt_required()
@with_token
def create_performance(
    token_response
):

    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied"
        }), 403

    data = request.get_json(
        silent=True
    ) or {}

    # ========================================================
    # EMPLOYEE
    # ========================================================

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

    # ========================================================
    # REVIEW PERIOD
    # ========================================================

    review_period = (
        data.get("review_period")
        or ""
    ).strip()

    if not review_period:
        return jsonify({
            "message": "review_period is required"
        }), 400

    # ========================================================
    # HIERARCHY LEVEL
    #
    # THIS WAS MISSING from create_fields before - hierarchy_level
    # was silently dropped on create even though the form requires
    # and sends it.
    # ========================================================

    hierarchy_level = (
        data.get("hierarchy_level")
        or ""
    ).strip()

    if hierarchy_level not in ALLOWED_HIERARCHY_LEVELS:
        return jsonify({
            "message": (
                "Invalid hierarchy_level. Allowed values: "
                + ", ".join(
                    sorted(ALLOWED_HIERARCHY_LEVELS)
                )
            )
        }), 400

    # ========================================================
    # SCORES
    # ========================================================

    day_to_day_performance, error = _parse_score(
        data.get("day_to_day_performance"),
        "day_to_day_performance",
    )

    if error:
        return jsonify({"message": error}), 400

    work_performance, error = _parse_score(
        data.get("work_performance"),
        "work_performance",
    )

    if error:
        return jsonify({"message": error}), 400

    behavioral_performance, error = _parse_score(
        data.get("behavioral_performance"),
        "behavioral_performance",
    )

    if error:
        return jsonify({"message": error}), 400

    rating, error = _parse_score(
        data.get("rating"),
        "rating",
    )

    if error:
        return jsonify({"message": error}), 400

    # ========================================================
    # REMARKS
    # ========================================================

    remarks = data.get("remarks")

    remarks = (
        remarks.strip()
        if isinstance(remarks, str)
        else remarks
    ) or None

    # ========================================================
    # CREATE
    # ========================================================

    performance = Performance(
        employee_id=employee_id,
        review_period=review_period,
        hierarchy_level=hierarchy_level,
        day_to_day_performance=day_to_day_performance,
        work_performance=work_performance,
        behavioral_performance=behavioral_performance,
        rating=rating,
        remarks=remarks,
        is_active=True,
    )

    _populate_organization(
        performance, employee
    )

    db.session.add(performance)
    db.session.commit()

    return jsonify({
        "message": "Performance review created",
        "data": performance.to_dict(),
        "token_response": token_response,
    }), 201


# ============================================================
# UPDATE PERFORMANCE REVIEW
#
# Reactivate reuses this same route with { "is_active": true },
# same pattern as Training's update_training().
# ============================================================

@performance_bp.route(
    "/<int:performance_id>",
    methods=["PUT"]
)
@jwt_required()
@with_token
def update_performance(
    performance_id,
    token_response
):

    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied"
        }), 403

    performance = Performance.query.get(
        performance_id
    )

    if not performance:
        return jsonify({
            "message": "Performance review not found"
        }), 404

    data = request.get_json(
        silent=True
    ) or {}

    # ========================================================
    # EMPLOYEE
    # ========================================================

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

        performance.employee_id = employee_id

        # Re-snapshot organization whenever the employee changes.
        _populate_organization(
            performance, employee
        )

    # ========================================================
    # REVIEW PERIOD
    # ========================================================

    if "review_period" in data:

        review_period = (
            data.get("review_period")
            or ""
        ).strip()

        if not review_period:
            return jsonify({
                "message": (
                    "review_period cannot be empty"
                )
            }), 400

        performance.review_period = (
            review_period
        )

    # ========================================================
    # HIERARCHY LEVEL
    # ========================================================

    if "hierarchy_level" in data:

        hierarchy_level = (
            data.get("hierarchy_level")
            or ""
        ).strip()

        if hierarchy_level not in ALLOWED_HIERARCHY_LEVELS:
            return jsonify({
                "message": (
                    "Invalid hierarchy_level. Allowed values: "
                    + ", ".join(
                        sorted(ALLOWED_HIERARCHY_LEVELS)
                    )
                )
            }), 400

        performance.hierarchy_level = (
            hierarchy_level
        )

    # ========================================================
    # SCORES
    # ========================================================

    if "day_to_day_performance" in data:

        value, error = _parse_score(
            data.get(
                "day_to_day_performance"
            ),
            "day_to_day_performance",
        )

        if error:
            return jsonify({
                "message": error
            }), 400

        performance.day_to_day_performance = (
            value
        )

    if "work_performance" in data:

        value, error = _parse_score(
            data.get("work_performance"),
            "work_performance",
        )

        if error:
            return jsonify({
                "message": error
            }), 400

        performance.work_performance = (
            value
        )

    if "behavioral_performance" in data:

        value, error = _parse_score(
            data.get(
                "behavioral_performance"
            ),
            "behavioral_performance",
        )

        if error:
            return jsonify({
                "message": error
            }), 400

        performance.behavioral_performance = (
            value
        )

    if "rating" in data:

        value, error = _parse_score(
            data.get("rating"),
            "rating",
        )

        if error:
            return jsonify({
                "message": error
            }), 400

        performance.rating = value

    # ========================================================
    # REMARKS
    # ========================================================

    if "remarks" in data:

        remarks = data.get("remarks")

        performance.remarks = (
            remarks.strip()
            if isinstance(remarks, str)
            else remarks
        ) or None

    # ========================================================
    # ACTIVE STATUS
    #
    # This is what "Reactivate" on the list page relies on -
    # it calls this same PUT route with { is_active: true }.
    # ========================================================

    if "is_active" in data:

        parsed_is_active = _parse_bool(
            data.get("is_active")
        )

        if parsed_is_active is None:
            return jsonify({
                "message": (
                    "Invalid is_active value"
                )
            }), 400

        performance.is_active = (
            parsed_is_active
        )

    # ========================================================
    # SAVE
    # ========================================================

    db.session.commit()

    return jsonify({
        "message": "Performance review updated",
        "data": performance.to_dict(),
        "token_response": token_response,
    }), 200


# ============================================================
# DEACTIVATE PERFORMANCE REVIEW
#
# Registered at BOTH:
#   DELETE /<id>              (register_crud_blueprint's convention -
#                               this module was originally built on
#                               that factory, so the frontend api
#                               client was almost certainly generated
#                               to call this shape)
#   DELETE /<id>/deactivate   (training_bp's convention, kept as a
#                               fallback in case anything calls this
#                               shape instead)
#
# Both point at the same handler - whichever one the frontend
# actually calls, it works.
# ============================================================

@performance_bp.route(
    "/<int:performance_id>",
    methods=["DELETE"]
)
@performance_bp.route(
    "/<int:performance_id>/deactivate",
    methods=["DELETE"]
)
@jwt_required()
@with_token
def deactivate_performance(
    performance_id,
    token_response
):

    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied"
        }), 403

    performance = Performance.query.get(
        performance_id
    )

    if not performance:
        return jsonify({
            "message": "Performance review not found"
        }), 404

    performance.is_active = False

    db.session.commit()

    return jsonify({
        "message": "Performance review deactivated",
        "data": performance.to_dict(),
        "token_response": token_response,
    }), 200