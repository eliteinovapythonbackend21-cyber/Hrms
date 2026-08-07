from models import FollowUp
from utils import register_crud_blueprint

follow_ups_bp = register_crud_blueprint(
    "follow_ups_bp",
    FollowUp,
    create_fields=["customer_id", "follow_up_date", "notes", "is_active"],
    search_fields=["notes"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    admin_only=True,
)
