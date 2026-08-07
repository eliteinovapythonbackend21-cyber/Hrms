from models import Meeting
from utils import register_crud_blueprint

meetings_bp = register_crud_blueprint(
    "meetings_bp",
    Meeting,
    create_fields=["customer_id", "meeting_date", "notes", "is_active"],
    search_fields=["notes"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    admin_only=True,
)
