from models import Promotion
from utils import register_crud_blueprint

promotions_bp = register_crud_blueprint(
    "promotions_bp",
    Promotion,

    create_fields=[
        "employee_id",
        "from_designation_id",
        "to_designation_id",
        "effective_date",
        "reason",
        "accomplishments",
        "is_active",
    ],

    search_fields=[
        "accomplishments",
        "reason",
    ],

    url_prefix_singular="",

    # Editable/deletable now enabled — register_crud_blueprint already
    # implements PUT (update_item) and DELETE (soft-delete via
    # is_active=False) generically, so no custom blueprint code is needed
    # here, unlike documents_bp.py (which needed multipart file handling).
    editable=True,
    deletable=True,

    allowed_roles=[
        "admin",
        "HR",
        "HR Director",
        "HR Manager",
        "HR Executive",
    ],
)