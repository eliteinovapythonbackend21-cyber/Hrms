"""Tier-based CRM incentive API — tier config, period run, and the
weekly / monthly / yearly payout + summary reads.

Access:
  - admin (and HR-department employee logins) see every employee's rows
    and may run the calculation / edit tiers / generate invoices.
  - a CRM-department "employee" login is read-only and scoped to their
    own rows (mirrors employee_incentives / quotations / invoices).
"""

from datetime import date

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from extensions import db
from models import (
    Employee,
    IncentiveTier,
    Invoice,
    MonthlyPayout,
    WeeklyIncentive,
    YearlyPayout,
)
from utils import (
    fetch_or_404,
    get_current_user,
    is_admin,
    is_crm_department_user,
    is_hr_department_user,
    paginate_query,
    with_token,
)

from .incentive_engine import (
    dashboard_period_summary,
    employee_summary,
    payable_due_date,
    process_payout_for_period,
    run_period,
    seed_default_tiers,
)

incentives_bp = Blueprint("incentives_bp", __name__)


# ------------------------------------------------------------------ helpers

def _can_manage(user):
    return is_admin(user)


def _can_view_all(user):
    return is_admin(user) or is_hr_department_user(user)


def _own_employee_id(user):
    if not user:
        return None
    emp = Employee.query.filter_by(user_id=user.id).first()
    return emp.id if emp else None


def _resolve_scope(user):
    """(employee_id_filter, error_response).

    - view-all users: honour ?employee_id= (or None for everyone)
    - CRM-department employee: forced to their own id
    - anyone else: 403
    """
    if _can_view_all(user):
        raw = request.args.get("employee_id")
        try:
            return (int(raw) if raw else None), None
        except (TypeError, ValueError):
            return None, (jsonify({"message": "Invalid employee_id"}), 400)

    if is_crm_department_user(user):
        own = _own_employee_id(user)
        if own is None:
            return None, (jsonify({"message": "No employee record linked"}), 403)
        return own, None

    return None, (jsonify({"message": "You do not have permission to view incentives"}), 403)


def _int_arg(name):
    raw = request.args.get(name)
    try:
        return int(raw) if raw not in (None, "") else None
    except (TypeError, ValueError):
        return None


# ------------------------------------------------------------------ tiers

@incentives_bp.route("/tiers", methods=["GET"])
@jwt_required()
@with_token
def list_tiers(token_response):
    seed_default_tiers()
    rows = IncentiveTier.query.order_by(IncentiveTier.sort_order, IncentiveTier.min_registrations).all()
    return jsonify({
        "message": "Incentive tiers fetched",
        "data": [t.to_dict() for t in rows],
        "token_response": token_response,
    }), 200


@incentives_bp.route("/tiers", methods=["POST"])
@jwt_required()
@with_token
def create_tier(token_response):
    if not _can_manage(get_current_user()):
        return jsonify({"message": "Admin privileges required"}), 403

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"message": "name is required"}), 400
    if IncentiveTier.query.filter(db.func.lower(IncentiveTier.name) == name.lower()).first():
        return jsonify({"message": "A tier with that name already exists"}), 409

    try:
        tier = IncentiveTier(
            name=name,
            min_registrations=max(0, int(data.get("min_registrations") or 0)),
            rate_per_registration=max(0, float(data.get("rate_per_registration") or 0)),
            sort_order=int(data.get("sort_order") or 0),
            is_active=data.get("is_active", True) is not False,
        )
    except (TypeError, ValueError):
        return jsonify({"message": "min_registrations / rate_per_registration must be numbers"}), 400

    db.session.add(tier)
    db.session.commit()
    return jsonify({"message": "Tier created", "data": tier.to_dict(), "token_response": token_response}), 201


@incentives_bp.route("/tiers/<int:tier_id>", methods=["PUT"])
@jwt_required()
@with_token
def update_tier(tier_id, token_response):
    if not _can_manage(get_current_user()):
        return jsonify({"message": "Admin privileges required"}), 403

    tier, err = fetch_or_404(IncentiveTier, tier_id)
    if err:
        return err

    data = request.get_json(silent=True) or {}
    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"message": "name cannot be empty"}), 400
        tier.name = name
    try:
        if "min_registrations" in data:
            tier.min_registrations = max(0, int(data["min_registrations"]))
        if "rate_per_registration" in data:
            tier.rate_per_registration = max(0, float(data["rate_per_registration"]))
        if "sort_order" in data:
            tier.sort_order = int(data["sort_order"])
    except (TypeError, ValueError):
        return jsonify({"message": "min_registrations / rate_per_registration must be numbers"}), 400
    if "is_active" in data:
        tier.is_active = data["is_active"] is not False

    db.session.commit()
    return jsonify({"message": "Tier updated", "data": tier.to_dict(), "token_response": token_response}), 200


@incentives_bp.route("/tiers/<int:tier_id>", methods=["DELETE"])
@jwt_required()
@with_token
def deactivate_tier(tier_id, token_response):
    if not _can_manage(get_current_user()):
        return jsonify({"message": "Admin privileges required"}), 403
    tier, err = fetch_or_404(IncentiveTier, tier_id)
    if err:
        return err
    tier.is_active = False
    db.session.commit()
    return jsonify({"message": "Tier deactivated", "data": tier.to_dict(), "token_response": token_response}), 200


# ------------------------------------------------------------------ run

@incentives_bp.route("/run", methods=["POST"])
@jwt_required()
@with_token
def run_incentive_period(token_response):
    if not _can_manage(get_current_user()):
        return jsonify({"message": "Admin privileges required"}), 403

    data = request.get_json(silent=True) or {}
    try:
        month = int(data.get("month"))
        year = int(data.get("year"))
    except (TypeError, ValueError):
        return jsonify({"message": "month and year are required integers"}), 400
    if not 1 <= month <= 12:
        return jsonify({"message": "month must be 1-12"}), 400

    result = run_period(month, year)
    return jsonify({
        "message": f"Incentives recomputed for {month}/{year}",
        "data": result,
        "token_response": token_response,
    }), 200


@incentives_bp.route("/run-payout", methods=["POST"])
@jwt_required()
@with_token
def run_payout_now(token_response):
    """Admin-only "Run Payout Now": invoices every payable amount for the
    given period and settles it — via a real Razorpay payout when
    configured, otherwise an internal settlement — exactly like the
    automated 20th-of-the-month run, but on demand for any period. Safe
    to click again later (already-Paid invoices aren't double-paid)."""
    if not _can_manage(get_current_user()):
        return jsonify({"message": "Admin privileges required"}), 403

    data = request.get_json(silent=True) or {}
    try:
        month = int(data.get("month"))
        year = int(data.get("year"))
    except (TypeError, ValueError):
        return jsonify({"message": "month and year are required integers"}), 400
    if not 1 <= month <= 12:
        return jsonify({"message": "month must be 1-12"}), 400

    result = process_payout_for_period(month, year, force=True)
    return jsonify({
        "message": f"Payout run for {month}/{year} — "
        f"{result['invoices_created']} invoice(s), {result['payments_created']} payment(s)",
        "data": result,
        "token_response": token_response,
    }), 200


# ------------------------------------------------------------------ reads

def _paginated(query):
    return jsonify({
        "message": "OK",
        "data": paginate_query(query, request.args),
    }), 200


@incentives_bp.route("/weekly", methods=["GET"])
@jwt_required()
@with_token
def list_weekly(token_response):
    scope, err = _resolve_scope(get_current_user())
    if err:
        return err

    q = WeeklyIncentive.query
    if scope is not None:
        q = q.filter(WeeklyIncentive.employee_id == scope)

    month, year = _int_arg("month"), _int_arg("year")
    if year:
        q = q.filter(db.extract("year", WeeklyIncentive.week_start_date) == year)
    if month:
        q = q.filter(db.extract("month", WeeklyIncentive.week_start_date) == month)
    if request.args.get("status"):
        q = q.filter(WeeklyIncentive.status == request.args.get("status"))
    if request.args.get("is_active") is not None:
        q = q.filter(
            WeeklyIncentive.is_active
            == (request.args.get("is_active").lower() in {"true", "1", "yes"})
        )

    return _paginated(q.order_by(WeeklyIncentive.week_start_date.desc()))


@incentives_bp.route("/monthly", methods=["GET"])
@jwt_required()
@with_token
def list_monthly(token_response):
    scope, err = _resolve_scope(get_current_user())
    if err:
        return err

    q = MonthlyPayout.query
    if scope is not None:
        q = q.filter(MonthlyPayout.employee_id == scope)
    if _int_arg("year"):
        q = q.filter(MonthlyPayout.year == _int_arg("year"))
    if _int_arg("month"):
        q = q.filter(MonthlyPayout.month == _int_arg("month"))
    if request.args.get("status"):
        q = q.filter(MonthlyPayout.status == request.args.get("status"))

    return _paginated(q.order_by(MonthlyPayout.year.desc(), MonthlyPayout.month.desc()))


@incentives_bp.route("/yearly", methods=["GET"])
@jwt_required()
@with_token
def list_yearly(token_response):
    scope, err = _resolve_scope(get_current_user())
    if err:
        return err

    q = YearlyPayout.query
    if scope is not None:
        q = q.filter(YearlyPayout.employee_id == scope)
    if _int_arg("year"):
        q = q.filter(YearlyPayout.year == _int_arg("year"))

    return _paginated(q.order_by(YearlyPayout.year.desc()))


@incentives_bp.route("/summary", methods=["GET"])
@jwt_required()
@with_token
def incentive_summary(token_response):
    scope, err = _resolve_scope(get_current_user())
    if err:
        return err

    year = _int_arg("year") or date.today().year

    if scope is None:
        # a view-all user without ?employee_id — return every employee's roll-up
        emp_ids = [e.id for e, in db.session.query(Employee.id).all()]
        rows = [
            employee_summary(eid, year)
            for eid in emp_ids
            if MonthlyPayout.query.filter_by(employee_id=eid, year=year).first()
            or WeeklyIncentive.query.filter_by(employee_id=eid, iso_year=year).first()
        ]
        return jsonify({
            "message": "Incentive summaries fetched",
            "data": {"year": year, "items": rows},
            "token_response": token_response,
        }), 200

    return jsonify({
        "message": "Incentive summary fetched",
        "data": employee_summary(scope, year),
        "token_response": token_response,
    }), 200


@incentives_bp.route("/period-summary", methods=["GET"])
@jwt_required()
@with_token
def incentive_period_summary(token_response):
    """CRM dashboard's Weekly / Monthly / Quarterly toggle — current-
    period target, registrations, incentive slab/amount, payout and
    (Paid-only) invoice status for one employee."""
    scope, err = _resolve_scope(get_current_user())
    if err:
        return err

    if scope is None:
        return jsonify({"message": "employee_id is required for this view"}), 400

    period_type = (request.args.get("period") or "Monthly").strip().title()
    if period_type not in ("Weekly", "Monthly", "Quarterly"):
        return jsonify({"message": "period must be one of Weekly, Monthly, Quarterly"}), 400

    return jsonify({
        "message": "Incentive period summary fetched",
        "data": dashboard_period_summary(scope, period_type),
        "token_response": token_response,
    }), 200


# ------------------------------------------------------------------ invoice

@incentives_bp.route("/monthly/<int:payout_id>/invoice", methods=["POST"])
@jwt_required()
@with_token
def generate_monthly_invoice(payout_id, token_response):
    if not _can_manage(get_current_user()):
        return jsonify({"message": "Admin privileges required"}), 403

    payout, err = fetch_or_404(MonthlyPayout, payout_id)
    if err:
        return err
    if float(payout.amount or 0) <= 0:
        return jsonify({"message": "This payout has no amount to invoice"}), 400

    existing = Invoice.query.filter_by(
        monthly_payout_id=payout.id, is_active=True
    ).first()
    if existing:
        return jsonify({
            "message": "An invoice already exists for this payout",
            "data": existing.to_dict(),
            "token_response": token_response,
        }), 409

    next_id = Invoice.get_next_id()
    invoice = Invoice(
        invoice_type="Incentive",
        employee_id=payout.employee_id,
        monthly_payout_id=payout.id,
        invoice_number=f"INC{next_id:05d}",
        amount=payout.amount,
        due_date=payout.due_date or payable_due_date(payout.month, payout.year),
        status="Unpaid",
        is_active=True,
    )
    db.session.add(invoice)
    payout.status = "Invoiced"
    db.session.commit()

    return jsonify({
        "message": "Incentive invoice generated",
        "data": invoice.to_dict(),
        "token_response": token_response,
    }), 201


@incentives_bp.route("/invoices", methods=["GET"])
@jwt_required()
@with_token
def list_incentive_invoices(token_response):
    scope, err = _resolve_scope(get_current_user())
    if err:
        return err

    # Incentive invoices are only ever shown once payment has actually
    # gone through — an Unpaid/Invoiced incentive record stays hidden
    # from this list entirely until its status flips to Paid.
    q = Invoice.query.filter(Invoice.invoice_type == "Incentive", Invoice.status == "Paid")
    if scope is not None:
        q = q.filter(Invoice.employee_id == scope)

    return _paginated(q.order_by(Invoice.id.desc()))
