from models import Transfer
from utils import register_crud_blueprint


transfers_bp = register_crud_blueprint(
    "transfers_bp",
    Transfer,

    create_fields=[
        "employee_id",
        "from_department_id",
        "to_department_id",
        "transfer_reason",
        "transfer_apply_date",
        "releving_date",
        "joining_date",
        "location",
        "accomplishments",
        "is_active",
    ],


    update_fields=[
        "employee_id",
        "from_department_id",
        "to_department_id",
        "transfer_reason",
        "transfer_apply_date",
        "releving_date",
        "joining_date",
        "location",
        "accomplishments",
        "is_active",
    ],


    search_fields=[
        "transfer_reason",
        "location",
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