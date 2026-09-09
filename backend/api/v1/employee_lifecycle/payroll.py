from flask import jsonify, request, send_file

from flask_jwt_extended import jwt_required

from models import Payroll

from utils import (
    get_current_user,
    is_admin,
    register_crud_blueprint,
    with_token,
    is_finance_department_user,
)


payroll_bp = register_crud_blueprint(
    "payroll_bp",
    Payroll,

    create_fields=[
        "employee_id",
        "pay_month",
        "gross_salary",
        "deductions",
        "net_salary",
        "status",
        "is_active",
    ],

    search_fields=[
        "pay_month",
        "status",
    ],

    url_prefix_singular="",

    # Enable Edit
    editable=True,

    # Enable Delete / Deactivate
    deletable=True,

    allowed_roles=[
        "admin",
        "HR Director",
        "HR Manager",
        "Payroll Executive",
    ],

    # A Finance-department "employee" login gets read-only (list / detail)
    # access — writes stay restricted to allowed_roles above.
    view_grant=is_finance_department_user,
)


@payroll_bp.route(
    "/report",
    methods=["GET"],
)
@jwt_required()
@with_token
def export_payroll_report(token_response):
    from_month = request.args.get(
        "from_month"
    )

    to_month = request.args.get(
        "to_month"
    )

    employee_id = request.args.get(
        "employee_id",
        type=int,
    )

    workbook = (
        Payroll.generate_payroll_report(
            from_month=from_month,
            to_month=to_month,
            employee_id=employee_id,
        )
    )

    return send_file(
        workbook,
        as_attachment=True,
        download_name="payroll_report.xlsx",
        mimetype=(
            "application/vnd.openxmlformats-officedocument"
            ".spreadsheetml.sheet"
        ),
    )


def _payroll_privileged(user):
    return is_admin(user) or is_finance_department_user(user)


@payroll_bp.route(
    "/generate",
    methods=["POST"],
)
@jwt_required()
@with_token
def generate_salary_payroll_now(token_response):
    """Admin/Finance "Run Now" — (re)generates the Salary Payroll for a
    given month/year on demand, e.g. after correcting an employee's
    salary or once an incentive that was still pending has since been
    finalized. The same generation otherwise self-triggers automatically
    on the 1st-10th of every month (see app.py /
    salary_payroll_engine.auto_generate_due_salary_payroll)."""
    current_user = get_current_user()

    if not _payroll_privileged(current_user):
        return jsonify(
            {"message": "Admin or Finance privileges required"}
        ), 403

    data = request.get_json(silent=True) or {}

    try:
        month = int(data.get("month"))
        year = int(data.get("year"))
    except (TypeError, ValueError):
        return jsonify(
            {"message": "month and year are required integers"}
        ), 400

    if not (1 <= month <= 12):
        return jsonify({"message": "Invalid month"}), 400

    from api.v1.employee_lifecycle.salary_payroll_engine import (
        generate_salary_payroll,
    )

    result = generate_salary_payroll(month, year, force=True)

    return jsonify(
        {
            "message": "Salary payroll generated",
            "data": result,
            "token_response": token_response,
        }
    ), 200