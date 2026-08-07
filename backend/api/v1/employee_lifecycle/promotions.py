from models import Promotion
from utils import register_crud_blueprint

promotions_bp = register_crud_blueprint(
    "promotions_bp",
    Promotion,
    create_fields=["employee_id", "from_designation_id", "to_designation_id", "effective_date", "remarks", "is_active"],
    search_fields=["remarks"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    allowed_roles=["admin", "HR", "HR Director", "HR Manager", "HR Executive"],
)
