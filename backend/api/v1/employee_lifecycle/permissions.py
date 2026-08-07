from models import EmployeePermission
from utils import register_crud_blueprint

employee_permissions_bp = register_crud_blueprint(
    "employee_permissions_bp",
    EmployeePermission,
    create_fields=["employee_id", "permission_date", "from_time", "to_time", "reason", "status", "is_active"],
    search_fields=["reason", "status"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    allowed_roles=["admin", "HR", "HR Director", "HR Manager", "HR Executive"],
)
