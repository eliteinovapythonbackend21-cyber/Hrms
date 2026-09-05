from flask import jsonify
from flask_jwt_extended import jwt_required

from extensions import db
from models import MembershipPlan
from utils import fetch_or_404, get_current_user, is_admin, register_crud_blueprint, with_token


membership_plans_bp = register_crud_blueprint(
    "membership_plans_bp",
    MembershipPlan,
    create_fields=["name", "rate", "is_active"],
    search_fields=["name"],
    url_prefix_singular="",
    editable=True,
    deletable=False,
    admin_only=True,
    # CRM-department employee logins need to read the active plan list
    # (Registration form dropdown) but not manage it.
    view_admin_only=False,
)


@membership_plans_bp.route("/<int:plan_id>/deactivate", methods=["DELETE"])
@jwt_required()
@with_token
def deactivate_membership_plan(plan_id, token_response):
    current_user = get_current_user()

    if not is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    plan, error_response = fetch_or_404(MembershipPlan, plan_id)
    if error_response:
        return error_response

    if plan.is_active is False:
        return jsonify(
            {
                "message": "Membership plan is already inactive",
                "data": plan.to_dict(),
                "token_response": token_response,
            }
        ), 409

    plan.is_active = False
    db.session.commit()
    return jsonify(
        {"message": "Membership plan deactivated", "data": plan.to_dict(), "token_response": token_response}
    ), 200
