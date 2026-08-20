"""
Follow-up records track scheduled contact with a Customer. Deactivation
mirrors leads.py's / customers.py's dedicated /deactivate route rather
than the generic DELETE route, which is intentionally blocked
(deletable=False).
"""

from flask import jsonify
from flask_jwt_extended import jwt_required

from extensions import db
from models import FollowUp
from utils import (
    fetch_or_404,
    is_admin,
    get_current_user,
    register_crud_blueprint,
    with_token,
)


follow_ups_bp = register_crud_blueprint(
    "follow_ups_bp",
    FollowUp,
    create_fields=[
        "customer_id",
        "follow_up_date",
        "notes",
        "is_active",
    ],
    search_fields=[
        "notes",
    ],
    url_prefix_singular="",
    editable=True,
    deletable=False,
    admin_only=False,
)


@follow_ups_bp.route(
    "/<int:follow_up_id>/deactivate",
    methods=["DELETE"],
)
@jwt_required()
@with_token
def deactivate_follow_up(
    follow_up_id,
    token_response,
):
    current_user = get_current_user()

    if not is_admin(current_user):
        return jsonify(
            {
                "message":
                    "Admin privileges required"
            }
        ), 403

    follow_up, error_response = fetch_or_404(
        FollowUp,
        follow_up_id,
    )

    if error_response:
        return error_response

    if follow_up.is_active is False:
        return jsonify(
            {
                "message":
                    "Follow-up is already inactive",
                "data":
                    follow_up.to_dict(),
                "token_response":
                    token_response,
            }
        ), 409

    follow_up.is_active = False
    db.session.commit()
    return jsonify(
        {
            "message":
                "Follow-up deactivated",
            "data":
                follow_up.to_dict(),
            "token_response":
                token_response,
        }
    ), 200