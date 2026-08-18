from models import Resignation
from utils import register_crud_blueprint


resignations_bp = register_crud_blueprint(
    "resignations_bp",
    Resignation,

    create_fields=[
        "employee_id",
        "notice_date",
        "last_working_date",
        "reason",
        "accomplishments",
        "previous_company_id",
        "previous_branch_id",
        "previous_department_id",
        "previous_designation_id",
        "status",
        "is_active",
    ],

    update_fields=[
        "employee_id",
        "notice_date",
        "last_working_date",
        "reason",
        "accomplishments",

        "previous_company_id",
        "previous_branch_id",
        "previous_department_id",
        "previous_designation_id",

        "status",
        "is_active",
    ],

    search_fields=[
        "reason",
        "accomplishments",
        "status",
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