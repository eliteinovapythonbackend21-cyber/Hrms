from models import Training
from utils import register_crud_blueprint

training_bp = register_crud_blueprint(
    "training_bp",
    Training,
    create_fields=["employee_id", "program_name", "start_date", "end_date", "status", "is_active"],
    search_fields=["program_name", "status"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    allowed_roles=["admin", "HR Director", "HR Manager", "Training Coordinator"],
)
