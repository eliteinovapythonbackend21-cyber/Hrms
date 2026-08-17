from models import Transfer
from utils import register_crud_blueprint

transfers_bp = register_crud_blueprint(
    "transfers_bp",
    Transfer,
    create_fields=["employee_id", "from_department_id", "to_department_id", "effective_date", "remarks", "is_active"],
    search_fields=["remarks"],
    url_prefix_singular="",
    editable=True,
    deletable=True,
    allowed_roles=["admin", "HR", "HR Director", "HR Manager", "HR Executive"],
)