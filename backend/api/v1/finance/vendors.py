from models import Vendor
from utils import register_crud_blueprint

vendors_bp = register_crud_blueprint(
    "vendors_bp",
    Vendor,
    create_fields=["vendor_name", "contact_number", "gstin", "is_active"],
    search_fields=["vendor_name", "gstin"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    allowed_roles=["admin", "finance"],
)
