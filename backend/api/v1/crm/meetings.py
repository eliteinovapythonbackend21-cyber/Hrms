"""
Meeting records track scheduled meetings with a Customer. Deactivation
mirrors leads.py's / customers.py's / follow_ups.py's dedicated
/deactivate route rather than the generic DELETE route, which is
intentionally blocked (deletable=False).
"""

from flask import jsonify
from flask_jwt_extended import jwt_required

from extensions import db
from models import Employee, Meeting
from utils import (
    fetch_or_404,
    is_admin,
    get_current_user,
    register_crud_blueprint,
    with_token,
)


def _attribute_registration(item, data):
    """Registration numbers (`registered_by`) drive the CRM incentive
    engine and the "today's registrations" dashboard stat, so every
    registration must carry the CRM employee who added it. A plain
    "employee" login always gets stamped with their own Employee record,
    overriding anything sent from the client; an admin/HR user may pass
    `registered_by` explicitly (e.g. recording it on someone's behalf)."""
    current_user = get_current_user()
    own_employee = (
        Employee.query.filter_by(user_id=current_user.id).first()
        if current_user
        else None
    )

    if own_employee and not is_admin(current_user):
        item.registered_by = own_employee.id
    elif not item.registered_by and own_employee:
        item.registered_by = own_employee.id

    plan = (item.membership_plan or "").strip()
    if plan and plan not in Meeting.MEMBERSHIP_PLANS:
        return jsonify({
            "message": (
                "membership_plan must be one of: "
                + ", ".join(Meeting.MEMBERSHIP_PLANS)
            )
        }), 400
    item.membership_plan = plan or None
    return None


meetings_bp = register_crud_blueprint(
    "meetings_bp",
    Meeting,
    create_fields=[
        "customer_id",
        "meeting_date",
        "notes",
        "registered_by",
        "membership_plan",
        "is_active",
    ],
    search_fields=[
        "notes",
        "membership_plan",
    ],
    filter_fields=[
        "membership_plan",
        "registered_by",
    ],
    url_prefix_singular="",
    editable=True,
    deletable=False,
    admin_only=False,
    on_create=_attribute_registration,
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