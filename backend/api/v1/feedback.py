"""Feedback / bug ticket workflow — available to every login (admin and
every employee-like role).

  1. Any authenticated user raises a ticket: category (Feature Bug /
     Internal Bug / Other Bugs-Issues), an optional screenshot, and a
     description.
  2. The ticket lands in "Open" status, effectively assigned to Admin for
     review (every admin can see and act on it — no per-admin routing).
  3. Admin moves it through "In Progress" and finally "Resolved", leaving
     an optional resolution note (`admin_response`) each time.
  4. The employee who raised it can see their own ticket's live status
     and resolution note at any time; they cannot see anyone else's.
  5. Admin sees and can act on every ticket.
"""

from datetime import datetime

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import FeedbackTicket
from utils import (
    fetch_or_404,
    get_current_user,
    handle_feedback_screenshot_upload,
    handle_integrity_error,
    is_admin,
    paginate_query,
    with_token,
)

feedback_bp = Blueprint("feedback_bp", __name__)


def _next_ticket_number():
    taken = {
        number
        for (number,) in db.session.query(FeedbackTicket.ticket_number)
        .filter(FeedbackTicket.ticket_number.isnot(None))
        .all()
        if number
    }
    seq = 1
    for number in taken:
        if number.upper().startswith("FB"):
            try:
                seq = max(seq, int(number[2:]) + 1)
            except (ValueError, TypeError):
                continue
    candidate = f"FB{seq:05d}"
    while candidate in taken:
        seq += 1
        candidate = f"FB{seq:05d}"
    return candidate


@feedback_bp.route("/", methods=["GET"])
@jwt_required()
@with_token
def list_feedback(token_response):
    current_user = get_current_user()
    if not current_user:
        return jsonify({"message": "Invalid token"}), 401

    query = FeedbackTicket.query
    if not is_admin(current_user):
        # A non-admin login only ever sees their own tickets, regardless
        # of what's sent in the query string.
        query = query.filter(FeedbackTicket.raised_by == current_user.id)

    if request.args.get("category"):
        query = query.filter(FeedbackTicket.category == request.args.get("category"))
    if request.args.get("status"):
        query = query.filter(FeedbackTicket.status == request.args.get("status"))
    if request.args.get("is_active") is not None:
        query = query.filter(
            FeedbackTicket.is_active
            == (request.args.get("is_active").lower() in {"true", "1", "yes"})
        )

    return jsonify({
        "message": "Feedback tickets fetched",
        "data": paginate_query(query.order_by(FeedbackTicket.id.desc()), request.args),
        "token_response": token_response,
    }), 200


@feedback_bp.route("/<int:ticket_id>", methods=["GET"])
@jwt_required()
@with_token
def get_feedback(ticket_id, token_response):
    current_user = get_current_user()
    ticket, error_response = fetch_or_404(FeedbackTicket, ticket_id)
    if error_response:
        return error_response

    if not is_admin(current_user) and ticket.raised_by != current_user.id:
        return jsonify({"message": "You do not have permission to view this ticket"}), 403

    return jsonify({
        "message": "Feedback ticket fetched",
        "data": ticket.to_dict(),
        "token_response": token_response,
    }), 200


@feedback_bp.route("/", methods=["POST"])
@jwt_required()
@with_token
def create_feedback(token_response):
    current_user = get_current_user()
    if not current_user:
        return jsonify({"message": "Invalid token"}), 401

    data = request.form.to_dict()
    category = (data.get("category") or "").strip()
    description = (data.get("description") or "").strip()

    if category not in FeedbackTicket.CATEGORIES:
        return jsonify({
            "message": "category must be one of: " + ", ".join(FeedbackTicket.CATEGORIES)
        }), 400
    if not description:
        return jsonify({"message": "description is required"}), 400

    screenshot_url = None
    upload = request.files.get("screenshot")
    if upload and upload.filename:
        try:
            uploaded = handle_feedback_screenshot_upload(
                upload, current_app.config["ALLOWED_IMAGE_EXTENSIONS"]
            )
        except ValueError as exc:
            return jsonify({"message": str(exc)}), 400
        if uploaded:
            screenshot_url = uploaded["url"]

    ticket = FeedbackTicket(
        ticket_number=_next_ticket_number(),
        raised_by=current_user.id,
        category=category,
        description=description,
        screenshot_url=screenshot_url,
        status="Open",
        is_active=True,
    )
    db.session.add(ticket)
    try:
        db.session.commit()
    except IntegrityError as exc:
        return handle_integrity_error(exc)

    return jsonify({
        "message": "Feedback ticket raised",
        "data": ticket.to_dict(),
        "token_response": token_response,
    }), 201


@feedback_bp.route("/<int:ticket_id>", methods=["PUT"])
@jwt_required()
@with_token
def update_feedback(ticket_id, token_response):
    """Admin-only: move the ticket through Open -> In Progress -> Resolved,
    optionally leaving a resolution/update note each time."""
    current_user = get_current_user()
    if not is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    ticket, error_response = fetch_or_404(FeedbackTicket, ticket_id)
    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}

    if "status" in data:
        status = (data.get("status") or "").strip()
        if status not in FeedbackTicket.STATUSES:
            return jsonify({
                "message": "status must be one of: " + ", ".join(FeedbackTicket.STATUSES)
            }), 400
        ticket.status = status
        if status == "Resolved":
            ticket.resolved_by = current_user.id
            ticket.resolved_at = datetime.utcnow()
        else:
            ticket.resolved_by = None
            ticket.resolved_at = None

    if "admin_response" in data:
        ticket.admin_response = data.get("admin_response") or None

    if "is_active" in data:
        ticket.is_active = data.get("is_active") is not False

    db.session.commit()
    return jsonify({
        "message": "Feedback ticket updated",
        "data": ticket.to_dict(),
        "token_response": token_response,
    }), 200
