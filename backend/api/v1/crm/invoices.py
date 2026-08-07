from flask import request, send_file
from flask_jwt_extended import jwt_required

from models import Invoice
from utils import parse_date, register_crud_blueprint, with_token


def _generate_invoice_number(item, data):
    if not item.invoice_number:
        next_id = Invoice.get_next_id()
        item.invoice_number = f"INV{next_id:05d}"
    return None


invoices_bp = register_crud_blueprint(
    "invoices_bp",
    Invoice,
    create_fields=["quotation_id", "customer_id", "invoice_number", "amount", "due_date", "status", "is_active"],
    search_fields=["invoice_number"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    admin_only=True,
    on_create=_generate_invoice_number,
)


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
