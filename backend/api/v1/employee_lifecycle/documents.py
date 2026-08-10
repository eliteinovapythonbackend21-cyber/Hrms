from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import EmployeeDocument
from utils import (
    apply_search_filters,
    fetch_or_404,
    get_current_user,
    handle_document_upload,
    handle_integrity_error,
    paginate_query,
    with_token,
)

documents_bp = Blueprint("documents_bp", __name__)

ALLOWED_ROLES = ["admin", "HR", "HR Director", "HR Manager", "HR Executive"]


def _guard():
    user = get_current_user()
    if not user or user.role not in ALLOWED_ROLES:
        return jsonify({"message": "You do not have permission to access this resource"}), 403
    return None


@documents_bp.route("/", methods=["GET"])
@jwt_required()
@with_token
def list_documents(token_response):
    guard = _guard()
    if guard:
        return guard
    query = apply_search_filters(EmployeeDocument.query, request.args, ["doc_type"])
    if request.args.get("is_active") is not None:
        query = query.filter(EmployeeDocument.is_active == (request.args.get("is_active").lower() in {"true", "1", "yes"}))
    return jsonify({
        "message": "EmployeeDocument list fetched",
        "data": paginate_query(query, request.args),
        "token_response": token_response,
    }), 200


@documents_bp.route("/<int:item_id>", methods=["GET"])
@jwt_required()
@with_token
def get_document(item_id, token_response):
    item, error_response = fetch_or_404(EmployeeDocument, item_id)
    if error_response:
        return error_response
    return jsonify({"message": "EmployeeDocument fetched", "data": item.to_dict(), "token_response": token_response}), 200


@documents_bp.route("/", methods=["POST"])
@jwt_required()
@with_token
def create_document(token_response):
    guard = _guard()
    if guard:
        return guard

    data = request.form.to_dict()
    upload = request.files.get("file")
    if not upload or upload.filename == "":
        return jsonify({"message": "file is required"}), 400

    try:
        uploaded = handle_document_upload(upload, current_app.config["ALLOWED_DOCUMENT_EXTENSIONS"])
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400

    item = EmployeeDocument(
        employee_id=data.get("employee_id"),
        doc_type=data.get("doc_type"),
        file_url=uploaded["url"],
    )
    db.session.add(item)
    try:
        db.session.commit()
    except IntegrityError as exc:
        return handle_integrity_error(exc)
    return jsonify({"message": "EmployeeDocument created", "data": item.to_dict(), "token_response": token_response}), 201


@documents_bp.route("/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_document(item_id):
    return jsonify({"message": "Editing is not permitted for this resource"}), 405


@documents_bp.route("/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_document(item_id):
    return jsonify({"message": "Deleting is not permitted for this resource"}), 405
