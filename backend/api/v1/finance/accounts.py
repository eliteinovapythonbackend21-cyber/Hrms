from models import Account
from utils import register_crud_blueprint

accounts_bp = register_crud_blueprint(
    "accounts_bp",
    Account,
    create_fields=["account_name", "account_type", "balance", "is_active"],
    search_fields=["account_name", "account_type"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    allowed_roles=["admin", "finance"],
)
