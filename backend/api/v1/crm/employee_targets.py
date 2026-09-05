from flask import jsonify
from flask_jwt_extended import jwt_required

from extensions import db
from models import EmployeeTarget
from utils import ensure_crm_employee, fetch_or_404, get_current_user, is_admin, register_crud_blueprint, with_token

# Global default quota per cadence — used whenever an admin creates a
# target without an explicit target_customer_count (10 weekly rolls up
# to 40 monthly, 120 quarterly). Mirrors incentive_engine.PERIOD_TARGETS.
DEFAULT_PERIOD_TARGETS = {"Weekly": 10, "Monthly": 40, "Quarterly": 120}


def _validate_target(item, data):
    employee, error_response = ensure_crm_employee(data.get("employee_id"))
    if error_response:
        return error_response

    period_type = data.get("period_type", "Monthly")
    if period_type not in EmployeeTarget.PERIOD_TYPES:
        return jsonify({"message": f"period_type must be one of {EmployeeTarget.PERIOD_TYPES}"}), 400

    if period_type == "Monthly" and not data.get("month"):
        return jsonify({"message": "month is required for a Monthly target"}), 400

    if period_type == "Quarterly":
        quarter = data.get("quarter")
        if not quarter or int(quarter) not in (1, 2, 3, 4):
            return jsonify({"message": "quarter must be 1-4 for a Quarterly target"}), 400

    if period_type == "Weekly" and not data.get("week_start_date"):
        return jsonify({"message": "week_start_date is required for a Weekly target"}), 400

    if "target_customer_count" not in data or data.get("target_customer_count") in (None, ""):
        item.target_customer_count = DEFAULT_PERIOD_TARGETS.get(period_type, EmployeeTarget.DEFAULT_TARGET)

    return None


employee_targets_bp = register_crud_blueprint(
    "employee_targets_bp",
    EmployeeTarget,
    create_fields=[
        "employee_id",
        "period_type",
        "year",
        "month",
        "quarter",
        "week_start_date",
        "target_customer_count",
        "is_active",
    ],
    search_fields=[],
    url_prefix_singular="",
    editable=True,
    deletable=False,
    admin_only=True,
    # CRM-department employee logins are read-only here (mirrors
    # quotations/invoices) — they need to view their targets, not set them.
    view_admin_only=False,
    # ...and only their own targets, not every CRM employee's.
    own_employee_scope_field="employee_id",
    on_create=_validate_target,
)


@employee_targets_bp.route("/<int:target_id>/deactivate", methods=["DELETE"])
@jwt_required()
@with_token
def deactivate_employee_target(target_id, token_response):
    current_user = get_current_user()

    if not is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    target, error_response = fetch_or_404(EmployeeTarget, target_id)
    if error_response:
        return error_response

    if target.is_active is False:
        return jsonify(
            {
                "message": "Employee target is already inactive",
                "data": target.to_dict(),
                "token_response": token_response,
            }
        ), 409

    target.is_active = False
    db.session.commit()
    return jsonify(
        {"message": "Employee target deactivated", "data": target.to_dict(), "token_response": token_response}
    ), 200