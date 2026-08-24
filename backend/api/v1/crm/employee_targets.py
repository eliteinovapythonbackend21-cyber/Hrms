from flask import jsonify
from flask_jwt_extended import jwt_required

from extensions import db
from models import EmployeeTarget
from utils import fetch_or_404, get_current_user, is_admin, register_crud_blueprint, with_token, ensure_crm_employee


def _validate_crm_target(item, data):
    employee_id = data.get("employee_id")
    employee, error_response = ensure_crm_employee(employee_id)
    if error_response:
        return error_response
    return None


employee_targets_bp = register_crud_blueprint(
    "employee_targets_bp",
    EmployeeTarget,
    create_fields=["employee_id", "month", "year", "target_customer_count", "is_active"],
    search_fields=[],
    url_prefix_singular="",          # CHANGED from "employee-targets"
    editable=True,
    deletable=False,
    admin_only=True,
    on_create=_validate_crm_target,
)


@employee_targets_bp.route("/<int:target_id>/deactivate", methods=["DELETE"])  # CHANGED: relative
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