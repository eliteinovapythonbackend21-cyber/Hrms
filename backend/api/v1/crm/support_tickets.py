from models import SupportTicket
from utils import register_crud_blueprint

support_tickets_bp = register_crud_blueprint(
    "support_tickets_bp",
    SupportTicket,
    create_fields=["customer_id", "subject", "description", "status", "is_active"],
    search_fields=["subject", "status"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    admin_only=True,
)
