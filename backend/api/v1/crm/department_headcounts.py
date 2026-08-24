"""
Weekly department headcount snapshots, entered by the CRM Department
Lead. One row per (department_id, week_start_date) - enforced by a
unique constraint, surfaced to the caller as a 409 via
handle_integrity_error rather than a raw 500.
"""

from flask import jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import DepartmentHeadcount
from utils import (
    fetch_or_404,
    get_current_user,
    handle_integrity_error,
    is_admin,
    register_crud_blueprint,
    with_token,
    ensure_crm_department
)


def _validate_crm_department(item, data):
    department_id = data.get("department_id")
    department, error_response = ensure_crm_department(department_id)
    if error_response:
        return error_response
    return None

department_headcounts_bp = register_crud_blueprint(
    "department_headcounts_bp",
    DepartmentHeadcount,
    create_fields=[
        "department_id",
        "week_start_date",
        "employee_count",
        "updated_by",
        "notes",
        "is_active",
    ],
    search_fields=["notes"],
    url_prefix_singular="department-headcounts",
    editable=True,
    deletable=False,
    admin_only=False,
    on_create=_validate_crm_department,
)


@department_headcounts_bp.route(
    "/department-headcounts/<int:headcount_id>/deactivate",
    methods=["DELETE"],
)
@jwt_required()
@with_token
def deactivate_department_headcount(headcount_id, token_response):
    current_user = get_current_user()

    if not is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    headcount, error_response = fetch_or_404(DepartmentHeadcount, headcount_id)
    if error_response:
        return error_response

    if headcount.is_active is False:
        return jsonify(
            {
                "message": "Department headcount record is already inactive",
                "data": headcount.to_dict(),
                "token_response": token_response,
            }
        ), 409

    headcount.is_active = False
    db.session.commit()
    return jsonify(
        {
            "message": "Department headcount record deactivated",
            "data": headcount.to_dict(),
            "token_response": token_response,
        }
    ), 200