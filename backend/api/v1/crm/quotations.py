from models import Quotation
from utils import register_crud_blueprint


def _generate_quotation_number(item, data):
    if not item.quotation_number:
        next_id = Quotation.get_next_id()
        item.quotation_number = f"QT{next_id:05d}"
    return None


quotations_bp = register_crud_blueprint(
    "quotations_bp",
    Quotation,
    create_fields=["customer_id", "quotation_number", "amount", "status", "is_active"],
    search_fields=["quotation_number"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    admin_only=True,
    on_create=_generate_quotation_number,
)
