"""Phase 0 — Organization masters beyond Department/Designation/LeaveType
(which already live in master.py). Single-branch business: Holiday has no
branch_id FK. Full CRUD (Master Control tier)."""

from models import Holiday
from utils import register_crud_blueprint

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