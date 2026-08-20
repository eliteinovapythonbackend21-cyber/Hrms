"""Invoice.status auto-flips to "Paid" when the sum of its Payment rows
meets/exceeds the invoice amount - computed here, not left to the frontend.

Deactivation mirrors the dedicated /deactivate route used across the
rest of the CRM module (leads/customers/follow_ups/meetings/
quotations/invoices) rather than the generic DELETE route, which is
intentionally blocked (deletable=False).
"""

from flask import jsonify
from flask_jwt_extended import jwt_required

from extensions import db
from models import Invoice, Payment
from utils import (
    fetch_or_404,
    is_admin,
    get_current_user,
    register_crud_blueprint,
    with_token,
)


def _flip_invoice_status(item, data):
    invoice = Invoice.query.get(item.invoice_id)
    if not invoice:
        return jsonify({"message": "Invoice not found for the provided invoice_id"}), 404

    # item is not yet committed/added at hook time, so include its own amount
    # in the running total explicitly.
    existing_total = sum((p.amount or 0) for p in invoice.payments)
    projected_total = existing_total + (item.amount or 0)
    if projected_total >= (invoice.amount or 0):
        invoice.status = "Paid"
    db.session.add(invoice)
    return None


payments_bp = register_crud_blueprint(
    "payments_bp",
    Payment,
    create_fields=[
        "invoice_id",
        "amount",
        "payment_date",
        "mode",
        "is_active",
    ],
    search_fields=[
        "mode",
    ],
    url_prefix_singular="",
    editable=True,
    deletable=False,
    admin_only=False,
    on_create=_flip_invoice_status,
)


@payments_bp.route(
    "/<int:payment_id>/deactivate",
    methods=["DELETE"],
)
@jwt_required()
@with_token
def deactivate_payment(
    payment_id,
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

    payment, error_response = fetch_or_404(
        Payment,
        payment_id,
    )

    if error_response:
        return error_response

    if payment.is_active is False:
        return jsonify(
            {
                "message":
                    "Payment is already inactive",
                "data":
                    payment.to_dict(),
                "token_response":
                    token_response,
            }
        ), 409

    payment.is_active = False
    db.session.commit()
    return jsonify(
        {
            "message":
                "Payment deactivated",
            "data":
                payment.to_dict(),
            "token_response":
                token_response,
        }
    ), 200