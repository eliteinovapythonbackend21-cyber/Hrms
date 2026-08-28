from datetime import date

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from functools import wraps

from extensions import db
from models import Training, Employee, BaseUser, Department
from utils import paginate_query


# ============================================================
# BLUEPRINT
# ============================================================

training_bp = Blueprint(
    "training_bp",
    __name__,
)


# ============================================================
# ALLOWED ROLES
# ============================================================

ALLOWED_ROLES = [
    "admin",
    "HR Director",
    "HR Manager",
    "Training Coordinator",
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
# DATE PARSER
# ============================================================

def _parse_date(value):
    if not value:
        return None

    if isinstance(value, date):
        return value

    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None


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
# STATUS VALIDATION
# ============================================================

ALLOWED_STATUSES = {
    "Scheduled",
    "Ongoing",
    "Completed",
}


# ============================================================
# PERFORMANCE VALIDATION
# ============================================================

ALLOWED_PERFORMANCES = {
    "Not Rated",
    "Excellent",
    "Good",
    "Average",
    "Poor",
}


# ============================================================
# LIST TRAINING
# ============================================================

@training_bp.route(
    "/",
    methods=["GET"]
)
@jwt_required()
@with_token
def list_training(token_response):

    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied"
        }), 403

    query = Training.query

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
            Training.is_active
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
            Training.employee_id
            == employee_id
        )

    # ========================================================
    # STATUS FILTER
    # ========================================================

    status = request.args.get(
        "status"
    )

    if status:
        query = query.filter(
            Training.status
            == status
        )

    # ========================================================
    # PERFORMANCE FILTER
    # ========================================================

    performance = request.args.get(
        "performance"
    )

    if performance:
        query = query.filter(
            Training.performance
            == performance
        )

    # ========================================================
    # DAY-TO-DAY FILTER
    #
    # Training is active on selected date when:
    #
    # start_date <= selected_date
    # AND
    # end_date >= selected_date
    # ========================================================

    single_date_str = request.args.get(
        "training_date"
    )

    if single_date_str:

        single_date = _parse_date(
            single_date_str
        )

        if single_date is None:
            return jsonify({
                "message": (
                    "Invalid date format. "
                    "Use YYYY-MM-DD."
                )
            }), 400

        query = query.filter(
            Training.start_date
            <= single_date,
            Training.end_date
            >= single_date,
        )

    # ========================================================
    # MONTHLY / QUARTERLY DATE RANGE
    # ========================================================

    from_date_str = request.args.get(
        "from_date"
    )

    to_date_str = request.args.get(
        "to_date"
    )

    if from_date_str or to_date_str:

        from_date = _parse_date(
            from_date_str
        )

        to_date = _parse_date(
            to_date_str
        )

        if from_date_str and from_date is None:
            return jsonify({
                "message": (
                    "Invalid from_date format. "
                    "Use YYYY-MM-DD."
                )
            }), 400

        if to_date_str and to_date is None:
            return jsonify({
                "message": (
                    "Invalid to_date format. "
                    "Use YYYY-MM-DD."
                )
            }), 400

        if from_date and to_date:

            if to_date < from_date:
                return jsonify({
                    "message": (
                        "to_date cannot be before "
                        "from_date"
                    )
                }), 400

            query = query.filter(
                Training.start_date
                <= to_date,
                Training.end_date
                >= from_date,
            )

        elif from_date:

            query = query.filter(
                Training.end_date
                >= from_date
            )

        elif to_date:

            query = query.filter(
                Training.start_date
                <= to_date
            )

    # ========================================================
    # ORGANIZATION FILTERS
    #
    # Company -> Branch -> Department -> Designation
    # ========================================================

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
            Training.employee_id
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

    # ========================================================
    # ORDER
    # ========================================================

    query = query.order_by(
        Training.start_date.desc(),
        Training.id.desc(),
    )

    # ========================================================
    # RESPONSE
    # ========================================================

    return jsonify({
        "message": "Training list fetched",
        "data": paginate_query(
            query,
            request.args
        ),
        "token_response": token_response,
    }), 200


# ============================================================
# GET SINGLE TRAINING
# ============================================================

@training_bp.route(
    "/<int:training_id>",
    methods=["GET"]
)
@jwt_required()
@with_token
def get_training(
    training_id,
    token_response
):

    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied"
        }), 403

    training = Training.query.get(
        training_id
    )

    if not training:
        return jsonify({
            "message": "Training program not found"
        }), 404

    return jsonify({
        "message": "Training program fetched",
        "data": training.to_dict(),
        "token_response": token_response,
    }), 200


# ============================================================
# CREATE TRAINING
# ============================================================

@training_bp.route(
    "/",
    methods=["POST"]
)
@jwt_required()
@with_token
def create_training(
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
    # PROGRAM NAME
    # ========================================================

    program_name = (
        data.get("program_name")
        or ""
    ).strip()

    if not program_name:
        return jsonify({
            "message": "program_name is required"
        }), 400

    # ========================================================
    # START DATE
    # ========================================================

    start_date = _parse_date(
        data.get("start_date")
    )

    if start_date is None:
        return jsonify({
            "message": (
                "start_date is required "
                "and must use YYYY-MM-DD"
            )
        }), 400

    # ========================================================
    # END DATE
    # ========================================================

    end_date = _parse_date(
        data.get("end_date")
    )

    if end_date is None:
        return jsonify({
            "message": (
                "end_date is required "
                "and must use YYYY-MM-DD"
            )
        }), 400

    if end_date < start_date:
        return jsonify({
            "message": (
                "end_date cannot be "
                "before start_date"
            )
        }), 400

    # ========================================================
    # STATUS
    # ========================================================

    status = (
        data.get("status")
        or "Scheduled"
    ).strip()

    if status not in ALLOWED_STATUSES:
        return jsonify({
            "message": (
                "Invalid status. Allowed values: "
                "Scheduled, Ongoing, Completed"
            )
        }), 400

    # ========================================================
    # STATUS DESCRIPTION
    #
    # Optional free-text elaboration on the status - no validation
    # beyond stripping, same treatment as performance_description
    # below.
    # ========================================================

    status_description = (
        data.get("status_description")
        or ""
    ).strip() or None

    # ========================================================
    # PERFORMANCE
    # ========================================================

    performance = (
        data.get("performance")
        or "Not Rated"
    ).strip()

    if performance not in ALLOWED_PERFORMANCES:
        return jsonify({
            "message": (
                "Invalid performance. Allowed values: "
                "Not Rated, Excellent, Good, "
                "Average, Poor"
            )
        }), 400

    # ========================================================
    # PERFORMANCE DESCRIPTION
    #
    # Optional free-text elaboration on the performance rating.
    # ========================================================

    performance_description = (
        data.get("performance_description")
        or ""
    ).strip() or None

    # ========================================================
    # CREATE
    # ========================================================

    training = Training(
        employee_id=employee_id,
        program_name=program_name,
        start_date=start_date,
        end_date=end_date,
        status=status,
        status_description=status_description,
        performance=performance,
        performance_description=performance_description,
        is_active=True,
    )

    db.session.add(training)
    db.session.commit()

    return jsonify({
        "message": "Training program created",
        "data": training.to_dict(),
        "token_response": token_response,
    }), 201


# ============================================================
# UPDATE TRAINING
# ============================================================

@training_bp.route(
    "/<int:training_id>",
    methods=["PUT"]
)
@jwt_required()
@with_token
def update_training(
    training_id,
    token_response
):

    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied"
        }), 403

    training = Training.query.get(
        training_id
    )

    if not training:
        return jsonify({
            "message": "Training program not found"
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

        training.employee_id = employee_id

    # ========================================================
    # PROGRAM NAME
    # ========================================================

    if "program_name" in data:

        program_name = (
            data.get("program_name")
            or ""
        ).strip()

        if not program_name:
            return jsonify({
                "message": (
                    "program_name cannot be empty"
                )
            }), 400

        training.program_name = (
            program_name
        )

    # ========================================================
    # STATUS
    # ========================================================

    if "status" in data:

        status = (
            data.get("status")
            or ""
        ).strip()

        if status not in ALLOWED_STATUSES:
            return jsonify({
                "message": (
                    "Invalid status. Allowed values: "
                    "Scheduled, Ongoing, Completed"
                )
            }), 400

        training.status = status

    # ========================================================
    # STATUS DESCRIPTION
    # ========================================================

    if "status_description" in data:

        status_description = (
            data.get("status_description")
            or ""
        ).strip()

        training.status_description = (
            status_description or None
        )

    # ========================================================
    # PERFORMANCE
    #
    # THIS WAS MISSING BEFORE.
    # ========================================================

    if "performance" in data:

        performance = (
            data.get("performance")
            or "Not Rated"
        ).strip()

        if performance not in ALLOWED_PERFORMANCES:
            return jsonify({
                "message": (
                    "Invalid performance. Allowed values: "
                    "Not Rated, Excellent, Good, "
                    "Average, Poor"
                )
            }), 400

        training.performance = performance

    # ========================================================
    # PERFORMANCE DESCRIPTION
    # ========================================================

    if "performance_description" in data:

        performance_description = (
            data.get("performance_description")
            or ""
        ).strip()

        training.performance_description = (
            performance_description or None
        )

    # ========================================================
    # ACTIVE STATUS
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

        training.is_active = (
            parsed_is_active
        )

    # ========================================================
    # START DATE
    # ========================================================

    if "start_date" in data:

        parsed_start_date = _parse_date(
            data.get("start_date")
        )

        if parsed_start_date is None:
            return jsonify({
                "message": (
                    "Invalid start_date format. "
                    "Use YYYY-MM-DD."
                )
            }), 400

        training.start_date = (
            parsed_start_date
        )

    # ========================================================
    # END DATE
    # ========================================================

    if "end_date" in data:

        parsed_end_date = _parse_date(
            data.get("end_date")
        )

        if parsed_end_date is None:
            return jsonify({
                "message": (
                    "Invalid end_date format. "
                    "Use YYYY-MM-DD."
                )
            }), 400

        training.end_date = (
            parsed_end_date
        )

    # ========================================================
    # DATE VALIDATION
    # ========================================================

    if (
        training.start_date
        and training.end_date
        and training.end_date
        < training.start_date
    ):
        return jsonify({
            "message": (
                "end_date cannot be "
                "before start_date"
            )
        }), 400

    # ========================================================
    # SAVE
    # ========================================================

    db.session.commit()

    return jsonify({
        "message": "Training program updated",
        "data": training.to_dict(),
        "token_response": token_response,
    }), 200


# ============================================================
# DEACTIVATE TRAINING
# ============================================================

@training_bp.route(
    "/<int:training_id>/deactivate",
    methods=["DELETE"]
)
@jwt_required()
@with_token
def deactivate_training(
    training_id,
    token_response
):

    current_user = _get_current_user()

    if not _has_access(current_user):
        return jsonify({
            "message": "Access denied"
        }), 403

    training = Training.query.get(
        training_id
    )

    if not training:
        return jsonify({
            "message": "Training program not found"
        }), 404

    training.is_active = False

    db.session.commit()

    return jsonify({
        "message": "Training program deactivated",
        "data": training.to_dict(),
        "token_response": token_response,
    }), 200