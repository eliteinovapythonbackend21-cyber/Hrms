"""
Customer records - created either directly or via Lead -> Customer
conversion (see leads.py's convert_lead). Deactivation mirrors
leads.py's dedicated /deactivate route rather than the generic DELETE
route, which is intentionally blocked (deletable=False).
"""

from flask import jsonify
from flask_jwt_extended import jwt_required

from extensions import db
from models import Customer
from utils import (
    fetch_or_404,
    is_admin,
    get_current_user,
    register_crud_blueprint,
    with_token,
)


customers_bp = register_crud_blueprint(
    "customers_bp",
    Customer,
    create_fields=[
        "lead_id",
        "customer_name",
        "contact_number",
        "email",
        "address",
        "is_active",
    ],
    search_fields=[
        "customer_name",
        "contact_number",
        "email",
    ],
    url_prefix_singular="",
    editable=True,
    deletable=False,
    admin_only=False,
)


@customers_bp.route(
    "/<int:customer_id>/deactivate",
    methods=["DELETE"],
)
@jwt_required()
@with_token
def deactivate_customer(
    customer_id,
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

    customer, error_response = fetch_or_404(
        Customer,
        customer_id,
    )

    if error_response:
        return error_response

    if customer.is_active is False:
        return jsonify(
            {
                "message":
                    "Customer is already inactive",
                "data":
                    customer.to_dict(),
                "token_response":
                    token_response,
            }
        ), 409

    customer.is_active = False
    db.session.commit()
    return jsonify(
        {
            "message":
                "Customer deactivated",
            "data":
                customer.to_dict(),
            "token_response":
                token_response,
        }
    ), 200