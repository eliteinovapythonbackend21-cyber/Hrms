"""Resignation -> ExitManagement is a status pipeline: creating an
ExitManagement row requires an existing Resignation with status="Approved"
(validated transactionally in the create hook, not left to the client)."""

from flask import jsonify

from models import ExitManagement, Resignation
from utils import register_crud_blueprint


def _validate_resignation_approved(item, data):
    resignation = Resignation.query.get(item.resignation_id)
    if not resignation:
        return jsonify({"message": "Resignation not found for the provided resignation_id"}), 404
    if resignation.status != "Approved":
        return jsonify({"message": "Exit management can only be created for an approved resignation"}), 400
    return None


exit_management_bp = register_crud_blueprint(
    "exit_management_bp",
    ExitManagement,
    create_fields=["resignation_id", "clearance_status", "exit_date", "remarks", "is_active"],
    search_fields=["clearance_status"],
    url_prefix_singular="",
    editable=False,
    deletable=False,
    allowed_roles=["admin", "HR", "HR Director", "HR Manager", "HR Executive"],
    on_create=_validate_resignation_approved,
)
