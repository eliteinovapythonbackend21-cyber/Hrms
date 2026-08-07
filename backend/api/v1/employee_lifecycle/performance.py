from models import Performance
from utils import register_crud_blueprint

performance_bp = register_crud_blueprint(
    "performance_bp",
    Performance,
    create_fields=["employee_id", "review_period", "rating", "remarks", "is_active"],
    search_fields=["review_period"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    allowed_roles=["admin", "HR", "HR Director", "HR Manager", "HR Executive"],
)
