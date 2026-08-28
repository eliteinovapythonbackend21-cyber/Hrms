from flask import jsonify

from extensions import db
from models import Performance, Employee

from utils import register_crud_blueprint


def populate_performance_organization(item, data):
    """
    Automatically copy the employee's current organization
    into the performance review record.

    This avoids asking the user to manually provide:
    company_id
    branch_id
    department_id
    designation_id
    """

    employee_id = data.get("employee_id")

    if not employee_id:
        return jsonify({
            "message": "Employee is required"
        }), 400

    employee = db.session.get(Employee, employee_id)

    if not employee:
        return jsonify({
            "message": "Selected employee was not found"
        }), 400

    item.company_id = getattr(employee, "company_id", None)
    item.branch_id = getattr(employee, "branch_id", None)
    item.department_id = getattr(employee, "department_id", None)
    item.designation_id = getattr(employee, "designation_id", None)

    return None


performance_bp = register_crud_blueprint(
    "performance_bp",
    Performance,

    create_fields=[
        "employee_id",
        "review_period",
        "day_to_day_performance",
        "work_performance",
        "behavioral_performance",
        "rating",
        "remarks",
        "is_active",
    ],

    

    search_fields=[
        "review_period",
    ],

    filter_fields=[
        "company_id",
        "branch_id",
        "department_id",
        "designation_id",
    ],

    url_prefix_singular="",

    # Performance records are add-only from this module.
    editable=False,
    deletable=False,

    # Automatically copy employee organization values.
    on_create=populate_performance_organization,

    allowed_roles=[
        "admin",
        "HR",
        "HR Director",
        "HR Manager",
        "HR Executive",
    ],
)
