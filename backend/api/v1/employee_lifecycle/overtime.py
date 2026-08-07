from models import Overtime
from utils import register_crud_blueprint

overtime_bp = register_crud_blueprint(
    "overtime_bp",
    Overtime,
    create_fields=["employee_id", "overtime_date", "hours", "status", "is_active"],
    search_fields=["status"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    allowed_roles=["admin", "HR", "HR Director", "HR Manager", "HR Executive"],
)
