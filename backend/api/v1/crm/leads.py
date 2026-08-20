"""
Lead -> Customer conversion is a single transactional endpoint
(POST /leads/<id>/convert) so a failed second request can never leave an
orphaned Customer without its Lead being marked Converted.
"""

from flask import jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import Customer, Lead
from utils import (
    fetch_or_404,
    handle_integrity_error,
    is_admin,
    get_current_user,
    register_crud_blueprint,
    with_token,
)


leads_bp = register_crud_blueprint(
    "leads_bp",
    Lead,
    create_fields=[
        "lead_name",
        "contact_number",
        "email",
        "source",
        "status",
        "assigned_to",
        "is_active",
    ],
    search_fields=[
        "lead_name",
        "contact_number",
        "email",
        "source",
        "status",
    ],
    url_prefix_singular="",
    editable=True,
    deletable=False,
    admin_only=False,
)


@leads_bp.route(
    "/<int:lead_id>/deactivate",
    methods=["DELETE"],
)
@jwt_required()
@with_token
def deactivate_lead(
    lead_id,
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

    lead, error_response = fetch_or_404(
        Lead,
        lead_id,
    )

    if error_response:
        return error_response

    if lead.is_active is False:
        return jsonify(
            {
                "message":
                    "Lead is already inactive",
                "data":
                    lead.to_dict(),
                "token_response":
                    token_response,
            }
        ), 409

    lead.is_active = False
    db.session.commit()
    return jsonify(
        {
            "message":
                "Lead deactivated",
            "data":
                lead.to_dict(),
            "token_response":
                token_response,
        }
    ), 200


@leads_bp.route(
    "/<int:lead_id>/convert",
    methods=["POST"],
)
@jwt_required()
@with_token
def convert_lead(
    lead_id,
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

    lead, error_response = fetch_or_404(
        Lead,
        lead_id,
    )

    if error_response:
        return error_response

    if lead.status == "Converted":
        return jsonify(
            {
                "message":
                    "Lead is already converted"
            }
        ), 409

    if lead.is_active is False:
        return jsonify(
            {
                "message":
                    "Inactive lead cannot be converted"
            }
        ), 400

    data = request.json or {}
    customer = Customer(
        lead_id=lead.id,
        customer_name=(
            data.get("customer_name")
            or lead.lead_name
        ),
        contact_number=(
            data.get("contact_number")
            or lead.contact_number
        ),
        email=(
            data.get("email")
            or lead.email
        ),
        address=data.get(
            "address"
        ),
        is_active=True,
    )

 
    lead.status = "Converted"
    db.session.add(customer)

    try:
        db.session.commit()

    except IntegrityError as exc:
        db.session.rollback()

        return handle_integrity_error(
            exc
        )

    return jsonify(
        {
            "message":
                "Lead converted to customer",
            "data": {
                "lead":
                    lead.to_dict(),
                "customer":
                    customer.to_dict(),
            },
            "token_response":
                token_response,
        }
    ), 201