"""Expense create updates Account.balance atomically in the same DB
transaction (never a live SUM() query)."""

from flask import jsonify, request, send_file
from flask_jwt_extended import jwt_required

from extensions import db
from models import Account, Expense
from utils import parse_date, register_crud_blueprint, with_token


def _debit_account(item, data):
    account = Account.query.get(item.account_id)
    if not account:
        return jsonify({"message": "Account not found for the provided account_id"}), 404
    account.balance = (account.balance or 0) - (item.amount or 0)
    db.session.add(account)
    return None


expenses_bp = register_crud_blueprint(
    "expenses_bp",
    Expense,
    create_fields=["account_id", "vendor_id", "category", "amount", "expense_date", "is_active"],
    search_fields=["category"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    allowed_roles=["admin", "finance"],
    on_create=_debit_account,
)


@expenses_bp.route("/report", methods=["GET"])
@jwt_required()
@with_token
def export_finance_report(token_response):
    from_date = parse_date(request.args.get("from_date"))
    to_date = parse_date(request.args.get("to_date"))
    workbook = Expense.generate_finance_report(from_date=from_date, to_date=to_date)
    return send_file(
        workbook,
        as_attachment=True,
        download_name="finance_report.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
