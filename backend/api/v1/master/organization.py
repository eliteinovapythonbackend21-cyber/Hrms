import requests
from flask import jsonify, request
from flask_jwt_extended import jwt_required

from extensions import db
from models import Holiday
from utils import get_current_user, is_admin, register_crud_blueprint, with_token

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


@organization_bp.route("/holiday/sync-government", methods=["POST"])
@jwt_required()
@with_token
def sync_government_holidays(token_response):
    current_user = get_current_user()

    if not is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    data = request.json or {}
    year = data.get("year")
    country_code = (data.get("country_code") or "IN").upper()

    if not year:
        return jsonify({"message": "year is required"}), 400

    try:
        year = int(year)
    except (TypeError, ValueError):
        return jsonify({"message": "year must be an integer"}), 400

    url = f"https://date.nager.at/api/v3/PublicHolidays/{year}/{country_code}"

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.RequestException as exc:
        return jsonify({"message": f"Failed to fetch holidays: {exc}"}), 502

    if response.status_code == 204 or not response.text.strip():
        return jsonify(
            {
                "message": f"No public holiday data available yet for {year} ({country_code}). "
                           f"Try a past or current year instead.",
                "data": {"created": [], "created_count": 0, "skipped_count": 0},
                "token_response": token_response,
            }
        ), 200

    try:
        holidays_data = response.json()
    except ValueError:
        return jsonify({"message": "Received an invalid response from the holiday provider"}), 502

    if not isinstance(holidays_data, list):
        return jsonify({"message": "Unexpected response format from the holiday provider"}), 502

    existing_dates = {
        h.holiday_date
        for h in Holiday.query.filter(
            db.extract("year", Holiday.holiday_date) == year,
            Holiday.holiday_type == "Government",
        ).all()
    }

    created = []
    skipped = 0

    for item in holidays_data:
        date_str = item.get("date")
        name = item.get("localName") or item.get("name")

        if not date_str or not name:
            continue

        try:
            from datetime import date as date_cls
            holiday_date = date_cls.fromisoformat(date_str)
        except ValueError:
            continue

        if holiday_date in existing_dates:
            skipped += 1
            continue

        holiday = Holiday(
            name=name[:100],
            holiday_date=holiday_date,
            holiday_type="Government",
            is_active=True,
        )
        db.session.add(holiday)
        created.append(holiday)
        existing_dates.add(holiday_date)

    db.session.commit()

    return jsonify(
        {
            "message": f"Synced {len(created)} government holidays for {year} ({country_code}); {skipped} already existed",
            "data": {
                "created": [h.to_dict() for h in created],
                "created_count": len(created),
                "skipped_count": skipped,
            },
            "token_response": token_response,
        }
    ), 200

@organization_bp.route("/holiday/preview-government", methods=["GET"])
@jwt_required()
@with_token
def preview_government_holidays(token_response):
    year = request.args.get("year")
    country_code = (request.args.get("country_code") or "IN").upper()

    if not year:
        return jsonify({"message": "year is required"}), 400

    try:
        year = int(year)
    except (TypeError, ValueError):
        return jsonify({"message": "year must be an integer"}), 400

    url = f"https://date.nager.at/api/v3/PublicHolidays/{year}/{country_code}"

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.RequestException as exc:
        return jsonify({"message": f"Failed to fetch holidays: {exc}"}), 502

    if response.status_code == 204 or not response.text.strip():
        return jsonify(
            {
                "message": f"No public holiday data available yet for {year} ({country_code}).",
                "data": [],
                "token_response": token_response,
            }
        ), 200

    try:
        holidays_data = response.json()
    except ValueError:
        return jsonify({"message": "Received an invalid response from the holiday provider"}), 502

    if not isinstance(holidays_data, list):
        return jsonify({"message": "Unexpected response format from the holiday provider"}), 502

    preview = [
        {
            "date": item.get("date"),
            "name": item.get("localName") or item.get("name"),
            "country_code": country_code,
        }
        for item in holidays_data
        if item.get("date") and (item.get("localName") or item.get("name"))
    ]

    return jsonify(
        {
            "message": f"Preview fetched for {year} ({country_code})",
            "data": preview,
            "token_response": token_response,
        }
    ), 200