from models import Resignation
from utils import register_crud_blueprint


resignations_bp = register_crud_blueprint(
    "resignations_bp",
    Resignation,

    # Fields allowed when creating a resignation
    create_fields=[
        "employee_id",
        "notice_date",
        "last_working_date",
        "reason",
        "description",
        "accomplishments",
        "previous_company_id",
        "previous_branch_id",
        "previous_department_id",
        "previous_designation_id",

        # Resignation status
        "status",
        "is_active",
    ],

    update_fields=[
        "employee_id",
        "notice_date",
        "last_working_date",
        "reason",
        "description",
        "accomplishments",

        # Previous organization details
        "previous_company_id",
        "previous_branch_id",
        "previous_department_id",
        "previous_designation_id",

        # Resignation status
        "status",
        "is_active",
    ],

    search_fields=[
        "reason",
        "description",
        "accomplishments",
        "status",
    ],

    url_prefix_singular="",

    # Enable Edit
    editable=True,

    # Enable soft delete using is_active=False
    deletable=True,

    # Only HR-related roles can access resignations
    allowed_roles=[
        "admin",
        "HR",
        "HR Director",
        "HR Manager",
        "HR Executive",
    ],
)