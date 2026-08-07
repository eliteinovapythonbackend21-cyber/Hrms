"""Income create updates Account.balance atomically in the same DB
transaction (never a live SUM() query)."""

from flask import jsonify

from extensions import db
from models import Account, Income
from utils import register_crud_blueprint


def _credit_account(item, data):
    account = Account.query.get(item.account_id)
    if not account:
        return jsonify({"message": "Account not found for the provided account_id"}), 404
    account.balance = (account.balance or 0) + (item.amount or 0)
    db.session.add(account)
    return None


income_bp = register_crud_blueprint(
    "income_bp",
    Income,
    create_fields=["account_id", "source", "amount", "income_date", "is_active"],
    search_fields=["source"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    allowed_roles=["admin", "finance"],
    on_create=_credit_account,
)
