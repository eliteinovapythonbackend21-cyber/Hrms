from flask import jsonify, request, send_file
from flask_jwt_extended import jwt_required

from models import Payroll
from utils import register_crud_blueprint, with_token

payroll_bp = register_crud_blueprint(
    "payroll_bp",
    Payroll,
    create_fields=["employee_id", "pay_month", "gross_salary", "deductions", "net_salary", "status", "is_active"],
    search_fields=["pay_month", "status"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    allowed_roles=["admin", "HR Director", "HR Manager", "Payroll Executive"],
)


@payroll_bp.route("/report", methods=["GET"])
@jwt_required()
@with_token
def export_payroll_report(token_response):
    from_month = request.args.get("from_month")
    to_month = request.args.get("to_month")
    employee_id = request.args.get("employee_id", type=int)
    workbook = Payroll.generate_payroll_report(from_month=from_month, to_month=to_month, employee_id=employee_id)
    return send_file(
        workbook,
        as_attachment=True,
        download_name="payroll_report.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
