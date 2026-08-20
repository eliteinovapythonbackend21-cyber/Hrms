"""
Invoice records track billing for a Customer (optionally linked to a
Quotation). Deactivation mirrors leads.py's / customers.py's /
follow_ups.py's / meetings.py's / quotations.py's dedicated
/deactivate route rather than the generic DELETE route, which is
intentionally blocked (deletable=False).
"""

from flask import jsonify, request, send_file
from flask_jwt_extended import jwt_required

from extensions import db
from models import Invoice
from utils import (
    fetch_or_404,
    is_admin,
    get_current_user,
    parse_date,
    register_crud_blueprint,
    with_token,
)


def _generate_invoice_number(item, data):
    if not item.invoice_number:
        next_id = Invoice.get_next_id()
        item.invoice_number = f"INV{next_id:05d}"
    return None


invoices_bp = register_crud_blueprint(
    "invoices_bp",
    Invoice,
    create_fields=[
        "quotation_id",
        "customer_id",
        "invoice_number",
        "amount",
        "due_date",
        "status",
        "is_active",
    ],
    search_fields=[
        "invoice_number",
    ],
    url_prefix_singular="",
    editable=True,
    deletable=False,
    admin_only=False,
    on_create=_generate_invoice_number,
)


@invoices_bp.route(
    "/<int:invoice_id>/deactivate",
    methods=["DELETE"],
)
@jwt_required()
@with_token
def deactivate_invoice(
    invoice_id,
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

    invoice, error_response = fetch_or_404(
        Invoice,
        invoice_id,
    )

    if error_response:
        return error_response

    if invoice.is_active is False:
        return jsonify(
            {
                "message":
                    "Invoice is already inactive",
                "data":
                    invoice.to_dict(),
                "token_response":
                    token_response,
            }
        ), 409

    invoice.is_active = False
    db.session.commit()
    return jsonify(
        {
            "message":
                "Invoice deactivated",
            "data":
                invoice.to_dict(),
            "token_response":
                token_response,
        }
    ), 200


@invoices_bp.route("/report", methods=["GET"])
@jwt_required()
@with_token
def export_crm_report(token_response):
    from_date = parse_date(request.args.get("from_date"))
    to_date = parse_date(request.args.get("to_date"))
    workbook = Invoice.generate_crm_report(from_date=from_date, to_date=to_date)
    return send_file(
        workbook,
        as_attachment=True,
        download_name="crm_report.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )