from models import EmployeeDocument
from utils import register_crud_blueprint

documents_bp = register_crud_blueprint(
    "documents_bp",
    EmployeeDocument,
    create_fields=["employee_id", "doc_type", "file_url", "is_active"],
    search_fields=["doc_type"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    allowed_roles=["admin", "HR", "HR Director", "HR Manager", "HR Executive"],
)
