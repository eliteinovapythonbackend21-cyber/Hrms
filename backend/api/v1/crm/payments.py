"""Invoice.status auto-flips to "Paid" when the sum of its Payment rows
meets/exceeds the invoice amount — computed here, not left to the frontend."""

from flask import jsonify

from extensions import db
from models import Invoice, Payment
from utils import register_crud_blueprint


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
    create_fields=["invoice_id", "amount", "payment_date", "mode", "is_active"],
    search_fields=["mode"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    admin_only=True,
    on_create=_flip_invoice_status,
)
