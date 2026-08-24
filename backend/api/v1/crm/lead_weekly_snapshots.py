"""
Weekly lead snapshots. List/get via the standard factory (add-only -
rows are only produced by the /generate action).
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from extensions import db
from models import LeadWeeklySnapshot
from utils import (
    apply_search_filters,
    fetch_or_404,
    get_current_user,
    is_admin,
    paginate_query,
    parse_date,
    with_token,
)

lead_weekly_snapshots_bp = Blueprint("lead_weekly_snapshots_bp", __name__)


@lead_weekly_snapshots_bp.route("/", methods=["GET"])  # CHANGED: relative
@jwt_required()
@with_token
def list_lead_weekly_snapshots(token_response):
    query = LeadWeeklySnapshot.query
    query = apply_search_filters(query, request.args, ["status", "notes"])

    week_start = request.args.get("week_start_date")
    if week_start:
        parsed = parse_date(week_start)
        if parsed:
            query = query.filter(LeadWeeklySnapshot.week_start_date == parsed)

    if request.args.get("is_active") is not None:
        query = query.filter(
            LeadWeeklySnapshot.is_active == (request.args.get("is_active").lower() in {"true", "1", "yes"})
        )

    return jsonify(
        {
            "message": "Lead weekly snapshots fetched",
            "data": paginate_query(query, request.args),
            "token_response": token_response,
        }
    ), 200


@lead_weekly_snapshots_bp.route("/<int:snapshot_id>", methods=["GET"])  # CHANGED: relative
@jwt_required()
@with_token
def get_lead_weekly_snapshot(snapshot_id, token_response):
    snapshot, error_response = fetch_or_404(LeadWeeklySnapshot, snapshot_id)
    if error_response:
        return error_response
    return jsonify(
        {
            "message": "Lead weekly snapshot fetched",
            "data": snapshot.to_dict(),
            "token_response": token_response,
        }
    ), 200


@lead_weekly_snapshots_bp.route("/generate", methods=["POST"])  # CHANGED: relative
@jwt_required()
@with_token
def generate_lead_weekly_snapshots(token_response):
    current_user = get_current_user()

    if not is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    data = request.json or {}
    week_start_date = parse_date(data.get("week_start_date"))

    if not week_start_date:
        return jsonify({"message": "week_start_date (YYYY-MM-DD) is required"}), 400

    results = LeadWeeklySnapshot.generate_for_week(week_start_date)

    return jsonify(
        {
            "message": f"Generated {len(results)} lead snapshots for week {week_start_date.isoformat()}",
            "data": [item.to_dict() for item in results],
            "token_response": token_response,
        }
    ), 200