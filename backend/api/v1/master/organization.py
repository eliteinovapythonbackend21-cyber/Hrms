"""Phase 0 — Organization masters beyond Department/Designation/LeaveType
(which already live in master.py). Single-branch business: Holiday has no
branch_id FK. Full CRUD (Master Control tier)."""

from flask import request, send_file
from flask_jwt_extended import jwt_required

from models import Holiday
from utils import register_crud_blueprint, with_token

organization_bp = register_crud_blueprint(
    "organization_bp",
    Holiday,
    create_fields=["name", "holiday_date", "holiday_type", "is_active"],
    search_fields=["name", "holiday_type"],
    url_prefix_singular="holiday",
    editable=True,
    deletable=True,
    admin_only=True,
)


@organization_bp.route("/holiday/report", methods=["GET"])
@jwt_required()
@with_token
def download_holiday_list(token_response):
    year_param = request.args.get("year")
    year = None
    if year_param:
        try:
            year = int(year_param)
        except (TypeError, ValueError):
            year = None

    pdf_buffer = Holiday.generate_holiday_list_pdf(year=year)
    filename = f"holiday_list_{year}.pdf" if year else "holiday_list.pdf"

    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=filename,
        mimetype="application/pdf",
    )