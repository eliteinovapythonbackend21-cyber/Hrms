"""
Meeting records track scheduled meetings with a Customer. Deactivation
mirrors leads.py's / customers.py's / follow_ups.py's dedicated
/deactivate route rather than the generic DELETE route, which is
intentionally blocked (deletable=False).
"""

from flask import jsonify
from flask_jwt_extended import jwt_required

from extensions import db
from models import Meeting
from utils import (
    fetch_or_404,
    is_admin,
    get_current_user,
    register_crud_blueprint,
    with_token,
)


meetings_bp = register_crud_blueprint(
    "meetings_bp",
    Meeting,
    create_fields=[
        "customer_id",
        "meeting_date",
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


@meetings_bp.route(
    "/<int:meeting_id>/deactivate",
    methods=["DELETE"],
)
@jwt_required()
@with_token
def deactivate_meeting(
    meeting_id,
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

    meeting, error_response = fetch_or_404(
        Meeting,
        meeting_id,
    )

    if error_response:
        return error_response

    if meeting.is_active is False:
        return jsonify(
            {
                "message":
                    "Meeting is already inactive",
                "data":
                    meeting.to_dict(),
                "token_response":
                    token_response,
            }
        ), 409

    meeting.is_active = False
    db.session.commit()
    return jsonify(
        {
            "message":
                "Meeting deactivated",
            "data":
                meeting.to_dict(),
            "token_response":
                token_response,
        }
    ), 200