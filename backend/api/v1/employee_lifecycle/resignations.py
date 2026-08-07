from models import Resignation
from utils import register_crud_blueprint

resignations_bp = register_crud_blueprint(
    "resignations_bp",
    Resignation,
    create_fields=["employee_id", "notice_date", "last_working_date", "reason", "status", "is_active"],
    search_fields=["reason", "status"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    allowed_roles=["admin", "HR", "HR Director", "HR Manager", "HR Executive"],
)
