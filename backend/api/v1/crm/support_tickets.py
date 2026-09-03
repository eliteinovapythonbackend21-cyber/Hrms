"""
Support ticket records track customer support requests. Deactivation
mirrors the dedicated /deactivate route used across the rest of the
CRM module (leads/customers/follow_ups/meetings/quotations/invoices/
payments) rather than the generic DELETE route, which is intentionally
blocked (deletable=False).
"""

from flask import jsonify
from flask_jwt_extended import jwt_required

from extensions import db
from models import SupportTicket, SupportTicketHistory
from utils import (
    fetch_or_404,
    is_admin,
    get_current_user,
    register_crud_blueprint,
    with_token,
)


support_tickets_bp = register_crud_blueprint(
    "support_tickets_bp",
    SupportTicket,
    create_fields=[
        "customer_id",
        "lead_id",
        "raised_by",
        "assigned_to",
        "subject",
        "description",
        "status",
        "is_active",
    ],
    search_fields=[
        "subject",
        "status",
    ],
    url_prefix_singular="",
    editable=True,
    deletable=False,
    admin_only=False,
)


@support_tickets_bp.route(
    "/<int:ticket_id>/deactivate",
    methods=["DELETE"],
)
@jwt_required()
@with_token
def deactivate_support_ticket(
    ticket_id,
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

    ticket, error_response = fetch_or_404(
        SupportTicket,
        ticket_id,
    )

    if error_response:
        return error_response

    if ticket.is_active is False:
        return jsonify(
            {
                "message":
                    "Support ticket is already inactive",
                "data":
                    ticket.to_dict(),
                "token_response":
                    token_response,
            }
        ), 409

    ticket.is_active = False
    db.session.commit()
    return jsonify(
        {
            "message":
                "Support ticket deactivated",
            "data":
                ticket.to_dict(),
            "token_response":
                token_response,
        }
    ), 200

@support_tickets_bp.route("/<int:ticket_id>/history", methods=["GET"])
@jwt_required()
@with_token
def get_support_ticket_history(ticket_id, token_response):
    ticket, error_response = fetch_or_404(SupportTicket, ticket_id)
    if error_response:
        return error_response

    history = (
        SupportTicketHistory.query.filter_by(ticket_id=ticket.id)
        .order_by(SupportTicketHistory.created_at.desc())
        .all()
    )

    return jsonify(
        {
            "message": "Support ticket history fetched",
            "data": [item.to_dict() for item in history],
            "token_response": token_response,
        }
    ), 200


@support_tickets_bp.route("/<int:ticket_id>/history", methods=["POST"])
@jwt_required()
@with_token
def add_support_ticket_history(ticket_id, token_response):
    current_user = get_current_user()

    ticket, error_response = fetch_or_404(SupportTicket, ticket_id)
    if error_response:
        return error_response

    data = request.json or {}
    action = data.get("action")

    if not action:
        return jsonify({"message": "action is required"}), 400

    entry = SupportTicketHistory(
        ticket_id=ticket.id,
        action=action,
        performed_by=current_user.id if current_user else None,
        notes=data.get("notes"),
    )
    db.session.add(entry)
    db.session.commit()

    return jsonify(
        {
            "message": "Support ticket history entry added",
            "data": entry.to_dict(),
            "token_response": token_response,
        }
    ), 201