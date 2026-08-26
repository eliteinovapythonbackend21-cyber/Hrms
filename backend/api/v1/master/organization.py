import requests
from datetime import date as date_cls

from flask import jsonify, request
from flask_jwt_extended import jwt_required

from extensions import db
from models import Holiday
from utils import (
    get_current_user,
    is_admin,
    register_crud_blueprint,
    with_token,
)


organization_bp = register_crud_blueprint(
    "organization_bp",
    Holiday,
    create_fields=[
        "name",
        "holiday_date",
        "holiday_type",
        "is_active",
    ],
    search_fields=[
        "name",
        "holiday_type",
    ],
    url_prefix_singular="holiday",
    editable=True,
    deletable=True,
    admin_only=True,
)


# ============================================================
# INDIA GOVERNMENT HOLIDAYS
# ============================================================

INDIA_CENTRAL_GAZETTED_HOLIDAYS = {
    2026: [
        {
            "date": "2026-01-26",
            "name": "Republic Day",
        },
        {
            "date": "2026-03-04",
            "name": "Holi",
        },
        {
            "date": "2026-03-21",
            "name": "Id-ul-Fitr",
        },
        {
            "date": "2026-03-26",
            "name": "Ram Navami",
        },
        {
            "date": "2026-03-31",
            "name": "Mahavir Jayanti",
        },
        {
            "date": "2026-04-03",
            "name": "Good Friday",
        },
        {
            "date": "2026-05-01",
            "name": "Buddha Purnima",
        },
        {
            "date": "2026-05-27",
            "name": "Id-ul-Zuha (Bakrid)",
        },
        {
            "date": "2026-06-26",
            "name": "Muharram",
        },
        {
            "date": "2026-08-15",
            "name": "Independence Day",
        },
        {
            "date": "2026-08-26",
            "name": "Milad-un-Nabi / Id-e-Milad",
        },
        {
            "date": "2026-09-04",
            "name": "Janmashtami",
        },
        {
            "date": "2026-10-02",
            "name": "Mahatma Gandhi's Birthday",
        },
        {
            "date": "2026-10-20",
            "name": "Dussehra (Vijay Dashmi)",
        },
        {
            "date": "2026-11-08",
            "name": "Diwali (Deepavali)",
        },
        {
            "date": "2026-11-24",
            "name": "Guru Nanak's Birthday",
        },
        {
            "date": "2026-12-25",
            "name": "Christmas Day",
        },
    ]
}


INDIA_FIXED_NATIONAL_HOLIDAYS = [
    {
        "month": 1,
        "day": 26,
        "name": "Republic Day",
    },
    {
        "month": 8,
        "day": 15,
        "name": "Independence Day",
    },
    {
        "month": 10,
        "day": 2,
        "name": "Mahatma Gandhi's Birthday",
    },
]


def _india_fallback_holidays(year):
    return [
        {
            "date": date_cls(
                year,
                holiday["month"],
                holiday["day"],
            ).isoformat(),
            "localName": holiday["name"],
            "name": holiday["name"],
        }
        for holiday in INDIA_FIXED_NATIONAL_HOLIDAYS
    ]


# ============================================================
# GOVERNMENT HOLIDAY PROVIDER
# ============================================================

def _get_government_holidays(
    year,
    country_code,
):
    country_code = (
        country_code or "IN"
    ).upper()

    # --------------------------------------------------------
    # INDIA
    # --------------------------------------------------------

    if country_code == "IN":
        configured = INDIA_CENTRAL_GAZETTED_HOLIDAYS.get(year)

        if configured:
            return [
                {
                    "date": item["date"],
                    "localName": item["name"],
                    "name": item["name"],
                }
                for item in configured
            ], True

        return (
            _india_fallback_holidays(year),
            True,
        )

    # --------------------------------------------------------
    # OTHER COUNTRIES
    # --------------------------------------------------------

    url = (
        f"https://date.nager.at/api/v3/"
        f"PublicHolidays/{year}/{country_code}"
    )

    response = requests.get(
        url,
        timeout=15,
        headers={
            "Accept": "application/json",
            "User-Agent": "HRMS-Holiday-Sync/1.0",
        },
    )

    response.raise_for_status()

    if response.status_code == 204:
        return [], False

    if not response.text.strip():
        return [], False

    holidays_data = response.json()

    if not isinstance(
        holidays_data,
        list,
    ):
        raise ValueError(
            "Unexpected response format from the holiday provider"
        )

    return holidays_data, False


# ============================================================
# NORMALIZE HOLIDAY DATA
# ============================================================

def _normalize_holiday_items(
    holidays_data,
    country_code,
):
    normalized = []

    for item in holidays_data:

        if not isinstance(item, dict):
            continue

        date_value = item.get("date")

        name = (
            item.get("localName")
            or item.get("name")
            or ""
        ).strip()

        if not date_value or not name:
            continue

        try:
            holiday_date = date_cls.fromisoformat(
                str(date_value)[:10]
            )
        except (
            TypeError,
            ValueError,
        ):
            continue

        normalized.append(
            {
                "date": holiday_date,
                "name": name[:100],
                "country_code": country_code,
            }
        )

    return normalized


# ============================================================
# SYNC GOVERNMENT HOLIDAYS
# ============================================================

@organization_bp.route(
    "/holiday/sync-government",
    methods=["POST"],
)
@jwt_required()
@with_token
def sync_government_holidays(
    token_response,
):
    current_user = get_current_user()

    if not is_admin(current_user):
        return jsonify(
            {
                "message":
                    "Admin privileges required"
            }
        ), 403

    data = request.get_json(
        silent=True
    ) or {}

    year = data.get("year")

    country_code = (
        data.get("country_code")
        or "IN"
    ).upper()

    if not year:
        return jsonify(
            {
                "message":
                    "year is required"
            }
        ), 400

    try:
        year = int(year)
    except (
        TypeError,
        ValueError,
    ):
        return jsonify(
            {
                "message":
                    "year must be an integer"
            }
        ), 400

    if year < 1900 or year > 2100:
        return jsonify(
            {
                "message":
                    "year must be between 1900 and 2100"
            }
        ), 400

    try:
        holidays_data, used_fallback = (
            _get_government_holidays(
                year,
                country_code,
            )
        )

    except requests.RequestException as exc:
        return jsonify(
            {
                "message":
                    f"Failed to fetch holidays: {exc}"
            }
        ), 502

    except ValueError as exc:
        return jsonify(
            {
                "message": str(exc)
            }
        ), 502

    normalized_holidays = (
        _normalize_holiday_items(
            holidays_data,
            country_code,
        )
    )

    if not normalized_holidays:
        return jsonify(
            {
                "message": (
                    f"No government holiday "
                    f"data available for "
                    f"{year} ({country_code})."
                ),
                "data": {
                    "created": [],
                    "updated": [],
                    "created_count": 0,
                    "updated_count": 0,
                    "skipped_count": 0,
                    "used_fallback":
                        used_fallback,
                },
                "token_response":
                    token_response,
            }
        ), 200

    # --------------------------------------------------------
    # EXISTING GOVERNMENT HOLIDAYS
    # --------------------------------------------------------

    existing_holidays = (
        Holiday.query.filter(
            db.extract(
                "year",
                Holiday.holiday_date,
            ) == year,
            Holiday.holiday_type ==
                "Government",
        ).all()
    )

    existing_by_date = {
        holiday.holiday_date:
            holiday
        for holiday in existing_holidays
    }

    created = []
    updated = []
    skipped = 0

    # --------------------------------------------------------
    # UPSERT HOLIDAYS
    # --------------------------------------------------------

    for item in normalized_holidays:

        holiday_date = item["date"]
        holiday_name = item["name"]

        existing = (
            existing_by_date.get(
                holiday_date
            )
        )

        # ----------------------------------------------------
        # EXISTING RECORD
        # ----------------------------------------------------

        if existing:
            changed = False

            if existing.name != holiday_name:
                existing.name = holiday_name
                changed = True

            if (
                existing.holiday_type
                != "Government"
            ):
                existing.holiday_type = (
                    "Government"
                )
                changed = True

            if not existing.is_active:
                existing.is_active = True
                changed = True

            if changed:
                updated.append(existing)
            else:
                skipped += 1

            continue

        # ----------------------------------------------------
        # CREATE RECORD
        # ----------------------------------------------------

        holiday = Holiday(
            name=holiday_name,
            holiday_date=holiday_date,
            holiday_type="Government",
            is_active=True,
        )

        db.session.add(holiday)

        existing_by_date[
            holiday_date
        ] = holiday

        created.append(holiday)

    db.session.commit()

    source = (
        "Government of India central "
        "gazetted holiday list"
        if (
            country_code == "IN"
            and year in
            INDIA_CENTRAL_GAZETTED_HOLIDAYS
        )
        else (
            "India fixed national fallback"
            if country_code == "IN"
            else "Nager.Date"
        )
    )

    return jsonify(
        {
            "message": (
                f"Government holidays "
                f"synchronized successfully "
                f"for {year} "
                f"({country_code}). "
                f"Created: {len(created)}, "
                f"Updated: {len(updated)}, "
                f"Already current: {skipped}."
            ),
            "data": {
                "created": [
                    holiday.to_dict()
                    for holiday in created
                ],
                "updated": [
                    holiday.to_dict()
                    for holiday in updated
                ],
                "created_count":
                    len(created),
                "updated_count":
                    len(updated),
                "skipped_count":
                    skipped,
                "total_count":
                    (
                        len(created)
                        + len(updated)
                        + skipped
                    ),
                "used_fallback":
                    used_fallback,
                "source": source,
                "year": year,
                "country_code":
                    country_code,
            },
            "token_response":
                token_response,
        }
    ), 200



# ============================================================
# UNSYNC GOVERNMENT HOLIDAYS
# ============================================================

@organization_bp.route(
    "/holiday/unsync-government",
    methods=["POST"],
)
@jwt_required()
@with_token
def unsync_government_holidays(
    token_response,
):
    current_user = get_current_user()

    if not is_admin(current_user):
        return jsonify(
            {
                "message": "Admin privileges required"
            }
        ), 403

    data = request.get_json(
        silent=True
    ) or {}

    year = data.get("year")

    country_code = (
        data.get("country_code")
        or "IN"
    ).upper()

    if not year:
        return jsonify(
            {
                "message":
                    "year is required"
            }
        ), 400

    try:
        year = int(year)
    except (
        TypeError,
        ValueError,
    ):
        return jsonify(
            {
                "message":
                    "year must be an integer"
            }
        ), 400

    if year < 1900 or year > 2100:
        return jsonify(
            {
                "message":
                    "year must be between 1900 and 2100"
            }
        ), 400

    # --------------------------------------------------------
    # FIND GOVERNMENT HOLIDAYS FOR THE SELECTED YEAR
    # --------------------------------------------------------

    government_holidays = (
        Holiday.query.filter(
            db.extract(
                "year",
                Holiday.holiday_date,
            ) == year,
            Holiday.holiday_type ==
                "Government",
        ).all()
    )

    if not government_holidays:
        return jsonify(
            {
                "message": (
                    f"No government holidays "
                    f"found for {year}."
                ),
                "data": {
                    "deleted": [],
                    "deleted_count": 0,
                    "year": year,
                    "country_code":
                        country_code,
                },
                "token_response":
                    token_response,
            }
        ), 200

    # --------------------------------------------------------
    # CAPTURE DATA BEFORE DELETE
    # --------------------------------------------------------

    deleted = [
        holiday.to_dict()
        for holiday
        in government_holidays
    ]

    deleted_count = len(
        government_holidays
    )

    # --------------------------------------------------------
    # DELETE
    # --------------------------------------------------------

    for holiday in government_holidays:
        db.session.delete(
            holiday
        )

    db.session.commit()

    return jsonify(
        {
            "message": (
                f"Unsynced {deleted_count} "
                f"government holiday(s) "
                f"for {year} "
                f"({country_code})."
            ),
            "data": {
                "deleted": deleted,
                "deleted_count":
                    deleted_count,
                "year": year,
                "country_code":
                    country_code,
            },
            "token_response":
                token_response,
        }
    ), 200


# ============================================================
# PREVIEW GOVERNMENT HOLIDAYS
# ============================================================

@organization_bp.route(
    "/holiday/preview-government",
    methods=["GET"],
)
@jwt_required()
@with_token
def preview_government_holidays(
    token_response,
):
    year = request.args.get("year")

    country_code = (
        request.args.get(
            "country_code"
        )
        or "IN"
    ).upper()

    if not year:
        return jsonify(
            {
                "message":
                    "year is required"
            }
        ), 400

    try:
        year = int(year)
    except (
        TypeError,
        ValueError,
    ):
        return jsonify(
            {
                "message":
                    "year must be an integer"
            }
        ), 400

    try:
        holidays_data, used_fallback = (
            _get_government_holidays(
                year,
                country_code,
            )
        )

    except requests.RequestException as exc:
        return jsonify(
            {
                "message":
                    f"Failed to fetch holidays: {exc}"
            }
        ), 502

    except ValueError as exc:
        return jsonify(
            {
                "message": str(exc)
            }
        ), 502

    normalized = (
        _normalize_holiday_items(
            holidays_data,
            country_code,
        )
    )

    preview = [
        {
            "date":
                item["date"].isoformat(),
            "name":
                item["name"],
            "country_code":
                country_code,
            "holiday_type":
                "Government",
        }
        for item in normalized
    ]

    return jsonify(
        {
            "message": (
                f"Preview fetched for "
                f"{year} "
                f"({country_code})"
            ),
            "data": preview,
            "used_fallback":
                used_fallback,
            "year": year,
            "country_code":
                country_code,
            "token_response":
                token_response,
        }
    ), 200