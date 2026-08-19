from models import Promotion
from utils import register_crud_blueprint


promotions_bp = register_crud_blueprint(
    "promotions_bp",
    Promotion,

    create_fields=[
        "employee_id",
        "from_designation_id",
        "to_designation_id",
        "promotion_date",
        "reason",
        "accomplishments",
        "is_active",
    ],

    update_fields=[
        "employee_id",
        "from_designation_id",
        "to_designation_id",
        "promotion_date",
        "reason",
        "accomplishments",
        "is_active",
    ],

    search_fields=[
        "reason",
        "accomplishments",
    ],

    url_prefix_singular="",
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