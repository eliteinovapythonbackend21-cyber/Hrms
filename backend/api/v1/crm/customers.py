from models import Customer
from utils import register_crud_blueprint

customers_bp = register_crud_blueprint(
    "customers_bp",
    Customer,
    create_fields=["lead_id", "customer_name", "contact_number", "email", "address", "is_active"],
    search_fields=["customer_name", "contact_number", "email"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    admin_only=True,
)
