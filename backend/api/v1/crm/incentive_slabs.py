from flask import jsonify
from flask_jwt_extended import jwt_required

from extensions import db
from models import IncentiveSlab
from utils import fetch_or_404, get_current_user, is_admin, register_crud_blueprint, with_token


incentive_slabs_bp = register_crud_blueprint(
    "incentive_slabs_bp",
    IncentiveSlab,
    create_fields=["period_type", "plan_name", "min_customers", "max_customers", "incentive_amount", "is_active"],
    search_fields=[],
    filter_fields=["period_type", "plan_name"],
    url_prefix_singular="",          # CHANGED from "incentive-slabs"
    editable=True,
    deletable=False,
    admin_only=True,
    # CRM-department employee logins are read-only here (mirrors
    # quotations/invoices) — they need to view slabs, not create them.
    view_admin_only=False,
)


@incentive_slabs_bp.route("/<int:slab_id>/deactivate", methods=["DELETE"])  # CHANGED: relative
@jwt_required()
@with_token
def deactivate_incentive_slab(slab_id, token_response):
    current_user = get_current_user()

    if not is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    slab, error_response = fetch_or_404(IncentiveSlab, slab_id)
    if error_response:
        return error_response

    if slab.is_active is False:
        return jsonify(
            {
                "message": "Incentive slab is already inactive",
                "data": slab.to_dict(),
                "token_response": token_response,
            }
        ), 409

    slab.is_active = False
    db.session.commit()
    return jsonify(
        {"message": "Incentive slab deactivated", "data": slab.to_dict(), "token_response": token_response}
    ), 200