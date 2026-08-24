"""
Excel lead upload. POST /lead-uploads/ accepts a single .xlsx file
(multipart/form-data, field name "file"), creates a LeadUploadBatch
row, parses each data row into a Lead, and reports per-row success/
failure. Follows the same admin-gated / soft-deactivate conventions
as the rest of the CRM module, but only needs list + upload — no
edit/delete on a batch once processed.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from openpyxl import load_workbook

from extensions import db
from models import Lead, LeadUploadBatch
from utils import (
    apply_search_filters,
    fetch_or_404,
    get_current_user,
    is_admin,
    paginate_query,
    with_token,
)

lead_uploads_bp = Blueprint("lead_uploads_bp", __name__)

ALLOWED_EXTENSIONS = {"xlsx"}

# Column order expected in the uploaded sheet, header row required.
EXPECTED_COLUMNS = ["lead_name", "contact_number", "email", "source", "status"]


def _allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@lead_uploads_bp.route("/lead-uploads/", methods=["GET"])
@jwt_required()
@with_token
def list_lead_uploads(token_response):
    query = LeadUploadBatch.query
    query = apply_search_filters(query, request.args, ["file_name", "status"])
    if request.args.get("is_active") is not None:
        query = query.filter(
            LeadUploadBatch.is_active
            == (request.args.get("is_active").lower() in {"true", "1", "yes"})
        )
    return jsonify(
        {
            "message": "Lead upload batches fetched",
            "data": paginate_query(query, request.args),
            "token_response": token_response,
        }
    ), 200


@lead_uploads_bp.route("/lead-uploads/<int:batch_id>", methods=["GET"])
@jwt_required()
@with_token
def get_lead_upload(batch_id, token_response):
    batch, error_response = fetch_or_404(LeadUploadBatch, batch_id)
    if error_response:
        return error_response
    return jsonify(
        {
            "message": "Lead upload batch fetched",
            "data": batch.to_dict(),
            "token_response": token_response,
        }
    ), 200


@lead_uploads_bp.route("/lead-uploads/", methods=["POST"])
@jwt_required()
@with_token
def upload_leads(token_response):
    current_user = get_current_user()

    if not is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    file = request.files.get("file")
    if not file or file.filename == "":
        return jsonify({"message": "No file provided"}), 400

    if not _allowed_file(file.filename):
        return jsonify({"message": "Only .xlsx files are supported"}), 400

    assigned_to = request.form.get("assigned_to")
    assigned_to = int(assigned_to) if assigned_to else None

    try:
        workbook = load_workbook(file, data_only=True)
    except Exception:
        return jsonify({"message": "Could not read the uploaded file"}), 400

    sheet = workbook.active
    rows = list(sheet.iter_rows(min_row=2, values_only=True))  # skip header row

    batch = LeadUploadBatch(
        uploaded_by=current_user.id,
        file_name=file.filename,
        total_rows=len(rows),
        status="Processing",
    )
    db.session.add(batch)
    db.session.flush()  # get batch.id before creating leads

    success_count = 0
    errors = []

    for index, row in enumerate(rows, start=2):
        lead_name = row[0] if len(row) > 0 else None
        if not lead_name or not str(lead_name).strip():
            errors.append(f"Row {index}: lead_name is required")
            continue

        lead = Lead(
            lead_name=str(lead_name).strip(),
            contact_number=str(row[1]).strip() if len(row) > 1 and row[1] else None,
            email=str(row[2]).strip() if len(row) > 2 and row[2] else None,
            source=str(row[3]).strip() if len(row) > 3 and row[3] else "Excel Upload",
            status=str(row[4]).strip() if len(row) > 4 and row[4] else "New",
            assigned_to=assigned_to,
            created_by=getattr(current_user.employee, "id", None) if hasattr(current_user, "employee") else None,
            upload_batch_id=batch.id,
            is_active=True,
        )
        db.session.add(lead)
        success_count += 1

    batch.success_count = success_count
    batch.failed_count = len(rows) - success_count
    batch.status = "Completed" if batch.failed_count == 0 else "Completed with errors"
    batch.error_summary = "; ".join(errors[:50]) if errors else None

    db.session.commit()

    return jsonify(
        {
            "message": "Lead upload processed",
            "data": batch.to_dict(),
            "token_response": token_response,
        }
    ), 201


@lead_uploads_bp.route("/lead-uploads/<int:batch_id>/deactivate", methods=["DELETE"])
@jwt_required()
@with_token
def deactivate_lead_upload(batch_id, token_response):
    current_user = get_current_user()

    if not is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    batch, error_response = fetch_or_404(LeadUploadBatch, batch_id)
    if error_response:
        return error_response

    if batch.is_active is False:
        return jsonify(
            {
                "message": "Lead upload batch is already inactive",
                "data": batch.to_dict(),
                "token_response": token_response,
            }
        ), 409

    batch.is_active = False
    db.session.commit()
    return jsonify(
        {
            "message": "Lead upload batch deactivated",
            "data": batch.to_dict(),
            "token_response": token_response,
        }
    ), 200