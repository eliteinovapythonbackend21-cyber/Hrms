"""CRM incentive engine — plan-based Weekly/Monthly/Quarterly incentive.

Registrations are the Registration-page (Meeting) records a CRM
employee adds (`Meeting.registered_by`), not raw Customer rows.

Per employee, per period (Weekly/Monthly/Quarterly):

    period_target = the employee's EmployeeTarget for that period, or the
                     PERIOD_TARGETS default (10 / 40 / 120) when none is set
    registrations = active Meeting rows added by the employee in the
                     period, ordered chronologically
    total_count   = len(registrations)

    Eligibility gate (must ALL hold, else amount = 0):
      - total_count >= 10 (MIN_ELIGIBLE_REGISTRATIONS)
      - for at least one membership plan, that plan's registration count
        in the period >= PLAN_ELIGIBILITY_PCT[plan] * period_target
        (Silver 50%, Gold 30%, Diamond 20%)

    Amount: only registrations AFTER the first `period_target` of them
    (chronologically) can earn incentive — and only if their plan passed
    its own eligibility gate above. Each qualifying registration earns
    INCENTIVE_RATE_PERCENT (6%) of that plan's current MembershipPlan.rate.

Per employee, per ISO week (Mon-Sun; a week belongs to the month its
Monday falls in) a WeeklyIncentive row is kept for the weekly
breakdown; IncentiveTier is unrelated (a separate, older "performance
badge" concept) and is no longer consulted by this calculation.

MonthlyPayout.amount = the Monthly-period formula above (independent of
the sum of weekly amounts, since eligibility/target are period-specific).
YearlyPayout  = sum of the 12 MonthlyPayout rows.
EmployeeIncentive (legacy monthly table) is mirrored so the Finance
Attendance "Incentive (CRM)" column keeps working.

Quarterly figures are computed on demand (see `quarterly_summary` below)
for the CRM dashboard's Weekly/Monthly/Quarterly toggle — there is no
persisted QuarterlyPayout table; only the existing 20th-of-month payout
cadence (Monthly) triggers real invoicing/payment.

Payment schedule: MonthlyPayout.due_date is the 20th of the month
following the incentive period, and an "Incentive" Invoice is
auto-generated for any payout with amount > 0 (see
_auto_generate_invoice / run_period).
"""

from calendar import monthrange
from datetime import date, datetime, time, timedelta

from extensions import db
from models import (
    Department,
    Employee,
    EmployeeIncentive,
    EmployeeTarget,
    IncentivePayoutRun,
    IncentiveTier,
    Invoice,
    Meeting,
    MembershipPlan,
    MonthlyPayout,
    Payment,
    WeeklyIncentive,
    YearlyPayout,
)

# Defaults for the (separate, unrelated) employee-performance tier badge
# shown on the CRM employee Incentive screen. Not used by the payable
# amount calculation below.
DEFAULT_TIERS = [
    {"name": "Bronze", "min_registrations": 5, "rate_per_registration": 50, "sort_order": 1},
    {"name": "Silver", "min_registrations": 10, "rate_per_registration": 75, "sort_order": 2},
    {"name": "Gold", "min_registrations": 15, "rate_per_registration": 100, "sort_order": 3},
]

# ------------------------------------------------------------------ plan-based rule
PERIOD_TARGETS = {"Weekly": 10, "Monthly": 40, "Quarterly": 120}
MIN_ELIGIBLE_REGISTRATIONS = 10
PLAN_ELIGIBILITY_PCT = {"Silver": 0.50, "Gold": 0.30, "Diamond": 0.20}
INCENTIVE_RATE_PERCENT = 6.0  # % of a plan's rate, per qualifying registration


def _plan_rates():
    return {
        row.name: float(row.rate or 0)
        for row in MembershipPlan.query.filter_by(is_active=True).all()
    }


def compute_period_incentive(employee_id, start, end, target, plan_rates=None):
    """Core plan-based formula for one employee over [start, end).

    Returns a dict: total, target, eligible (bool), amount, breakdown
    (per-plan incentive amount for registrations that qualified)."""
    plan_rates = plan_rates if plan_rates is not None else _plan_rates()

    rows = (
        Meeting.query.filter(
            Meeting.registered_by == employee_id,
            Meeting.is_active == True,
            Meeting.created_at >= start,
            Meeting.created_at < end,
        )
        .order_by(Meeting.created_at.asc())
        .all()
    )

    total = len(rows)
    result = {"total": total, "target": target, "eligible": False, "amount": 0.0, "breakdown": {}}

    if total < MIN_ELIGIBLE_REGISTRATIONS:
        return result

    plan_counts = {}
    for row in rows:
        plan_counts[row.membership_plan] = plan_counts.get(row.membership_plan, 0) + 1

    eligible_plans = {
        plan
        for plan, count in plan_counts.items()
        if count >= PLAN_ELIGIBILITY_PCT.get(plan, 1.0) * target
    }

    result["eligible"] = bool(eligible_plans)
    if not eligible_plans:
        return result

    beyond_target_rows = rows[target:]
    amount = 0.0
    breakdown = {}
    for row in beyond_target_rows:
        if row.membership_plan not in eligible_plans:
            continue
        rate = plan_rates.get(row.membership_plan, 0.0)
        incentive = round((INCENTIVE_RATE_PERCENT / 100) * rate, 2)
        amount += incentive
        breakdown[row.membership_plan] = round(breakdown.get(row.membership_plan, 0.0) + incentive, 2)

    result["amount"] = round(amount, 2)
    result["breakdown"] = breakdown
    return result


def compute_monthly_incentive_amount(count):
    """Backward-compatible helper retained for any external caller that
    only has a raw count (no plan breakdown) — approximates the old flat
    rule's shape but is NOT used by rebuild_monthly_payout anymore, which
    calls compute_period_incentive with the real per-plan breakdown."""
    if count <= 0:
        return 0.0
    target = PERIOD_TARGETS["Monthly"]
    extra = max(0, count - target)
    return round(extra * (INCENTIVE_RATE_PERCENT / 100) * 1000.0, 2)


def payable_due_date(month, year):
    """The 20th of the month following the incentive period — when the
    calculated incentive is marked payable."""
    next_month = month + 1
    next_year = year
    if next_month > 12:
        next_month = 1
        next_year += 1
    return date(next_year, next_month, 20)


def seed_default_tiers():
    if IncentiveTier.query.count():
        return
    for row in DEFAULT_TIERS:
        db.session.add(IncentiveTier(is_active=True, **row))
    db.session.commit()


# ------------------------------------------------------------------ helpers

def monday_of(d):
    return d - timedelta(days=d.weekday())


def weeks_touching_month(month, year):
    """Every Monday that falls inside the given month — those weeks 'belong'
    to this month even if their Sunday spills into the next one."""
    first = date(year, month, 1)
    last = date(year, month, monthrange(year, month)[1])
    m = monday_of(first)
    out = []
    while m <= last:
        if m.month == month and m.year == year:
            out.append(m)
        m += timedelta(days=7)
    return out


def _crm_employee_ids():
    return [
        row.id
        for row in Employee.query.join(Department).filter(
            db.func.lower(db.func.trim(Department.department_name)) == "crm",
            Employee.is_active == True,
        ).all()
    ]


def _weekly_registration_count(employee_id, monday):
    start = datetime.combine(monday, time.min)
    end = datetime.combine(monday + timedelta(days=7), time.min)
    return (
        db.session.query(db.func.count(Meeting.id))
        .filter(
            Meeting.registered_by == employee_id,
            Meeting.is_active == True,
            Meeting.created_at >= start,
            Meeting.created_at < end,
        )
        .scalar()
        or 0
    )


def _monthly_registration_count(employee_id, month, year):
    """Total Registration-page (Meeting) rows the employee added in the
    given calendar month — the source of truth for the flat monthly
    incentive amount (distinct from the sum of weekly counts, which can
    double-count/undercount at week boundaries that spill across months)."""
    days_in_month = monthrange(year, month)[1]
    start = datetime.combine(date(year, month, 1), time.min)
    end = datetime.combine(date(year, month, days_in_month) + timedelta(days=1), time.min)
    return (
        db.session.query(db.func.count(Meeting.id))
        .filter(
            Meeting.registered_by == employee_id,
            Meeting.is_active == True,
            Meeting.created_at >= start,
            Meeting.created_at < end,
        )
        .scalar()
        or 0
    )


def _weekly_target(employee_id, monday):
    row = EmployeeTarget.query.filter_by(
        employee_id=employee_id,
        period_type="Weekly",
        week_start_date=monday,
        is_active=True,
    ).first()
    return row.target_customer_count if row else PERIOD_TARGETS["Weekly"]


def _monthly_target(employee_id, month, year):
    row = EmployeeTarget.query.filter_by(
        employee_id=employee_id,
        period_type="Monthly",
        month=month,
        year=year,
        is_active=True,
    ).first()
    return row.target_customer_count if row else PERIOD_TARGETS["Monthly"]


def _quarterly_target(employee_id, quarter, year):
    row = EmployeeTarget.query.filter_by(
        employee_id=employee_id,
        period_type="Quarterly",
        quarter=quarter,
        year=year,
        is_active=True,
    ).first()
    return row.target_customer_count if row else PERIOD_TARGETS["Quarterly"]


# ------------------------------------------------------------------ recompute

def recompute_week(employee_id, monday, commit=False):
    count = _weekly_registration_count(employee_id, monday)

    row = WeeklyIncentive.query.filter_by(
        employee_id=employee_id, week_start_date=monday
    ).first()

    if count == 0 and row is None:
        return None  # nothing to record for an empty week

    target = _weekly_target(employee_id, monday)
    # The weekly "tier" badge is a separate, older performance-badge
    # concept — kept only for display, unrelated to the payable amount.
    tier = IncentiveTier.resolve(count)

    start = datetime.combine(monday, time.min)
    end = datetime.combine(monday + timedelta(days=7), time.min)
    calc = compute_period_incentive(employee_id, start, end, target)

    eligible = max(0, count - target)
    amount = calc["amount"]

    iso_year, iso_week, _ = monday.isocalendar()

    if row is None:
        row = WeeklyIncentive(
            employee_id=employee_id,
            week_start_date=monday,
            week_end_date=monday + timedelta(days=6),
        )
        db.session.add(row)

    row.week_end_date = monday + timedelta(days=6)
    row.iso_year = iso_year
    row.iso_week = iso_week
    row.registration_count = count
    row.target_count = target
    row.eligible_count = eligible
    row.tier_id = tier.id if tier else None
    row.tier_name = tier.name if tier else None
    row.rate_per_registration = 0.0
    row.amount = amount
    row.is_active = True

    if commit:
        db.session.commit()
    return row


def rebuild_monthly_payout(employee_id, month, year, commit=False):
    rows = [
        w
        for w in WeeklyIncentive.query.filter_by(
            employee_id=employee_id, is_active=True
        ).all()
        if w.week_start_date
        and w.week_start_date.month == month
        and w.week_start_date.year == year
    ]

    # Registration count and payable amount both come from the
    # plan-based Monthly-period rule (not summed weekly amounts — the
    # target/eligibility is evaluated per calendar month, and weeks can
    # spill across month boundaries).
    days_in_month = monthrange(year, month)[1]
    start = datetime.combine(date(year, month, 1), time.min)
    end = datetime.combine(date(year, month, days_in_month) + timedelta(days=1), time.min)
    target = _monthly_target(employee_id, month, year)
    calc = compute_period_incentive(employee_id, start, end, target)

    reg = calc["total"]
    eligible = max(0, reg - target)
    amount = calc["amount"]

    payout = MonthlyPayout.query.filter_by(
        employee_id=employee_id, month=month, year=year
    ).first()
    if payout is None:
        payout = MonthlyPayout(employee_id=employee_id, month=month, year=year)
        db.session.add(payout)

    payout.week_count = len(rows)
    payout.registration_count = reg
    payout.eligible_count = eligible
    payout.amount = amount
    payout.due_date = payable_due_date(month, year)
    payout.is_active = True
    # Once an amount is payable, mark it Approved so it's ready for the
    # 20th-of-next-month invoice; leave an existing Invoiced/Paid status
    # (or 0-amount Pending) alone.
    if amount > 0 and payout.status == "Pending":
        payout.status = "Approved"

    _mirror_employee_incentive(employee_id, month, year, amount, reg, eligible, rows, target)

    if commit:
        db.session.commit()
    return payout


def _auto_generate_invoice(payout):
    """Auto-generate the Incentive invoice for a payable MonthlyPayout,
    due on the 20th of the following month. Returns (invoice, created) —
    created is False when the amount is 0 or an active invoice already
    exists for this payout."""
    if float(payout.amount or 0) <= 0:
        return None, False

    existing = Invoice.query.filter_by(
        monthly_payout_id=payout.id, is_active=True
    ).first()
    if existing:
        return existing, False

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
    return invoice, True


def _mirror_employee_incentive(employee_id, month, year, amount, reg, eligible, weekly_rows, target):
    rec = EmployeeIncentive.query.filter_by(
        employee_id=employee_id, month=month, year=year
    ).first()
    if rec is None:
        if amount <= 0:
            return
        rec = EmployeeIncentive(employee_id=employee_id, month=month, year=year)
        db.session.add(rec)

    rec.target_customer_count = target
    rec.actual_customer_count = reg
    rec.eligible_customer_count = eligible
    rec.calculated_amount = amount
    rec.calculation_date = date.today()
    if rec.status == "Pending" and amount > 0:
        rec.status = "Approved"


def rebuild_yearly_payout(employee_id, year, commit=False):
    rows = MonthlyPayout.query.filter_by(
        employee_id=employee_id, year=year, is_active=True
    ).all()

    payout = YearlyPayout.query.filter_by(
        employee_id=employee_id, year=year
    ).first()
    if payout is None:
        payout = YearlyPayout(employee_id=employee_id, year=year)
        db.session.add(payout)

    payout.month_count = len(rows)
    payout.registration_count = sum(m.registration_count or 0 for m in rows)
    payout.eligible_count = sum(m.eligible_count or 0 for m in rows)
    payout.amount = round(sum(float(m.amount or 0) for m in rows), 2)
    payout.is_active = True

    if commit:
        db.session.commit()
    return payout


def run_period(month, year, auto_invoice=True):
    """Full weekly + monthly + yearly recompute for every active CRM
    employee for the given month/year, then (by default) auto-generates
    the Incentive invoice for every payable MonthlyPayout, due on the
    20th of the following month. One commit at the end."""
    seed_default_tiers()

    employee_ids = _crm_employee_ids()
    mondays = weeks_touching_month(month, year)

    invoices_created = 0
    for emp_id in employee_ids:
        for monday in mondays:
            recompute_week(emp_id, monday)
        payout = rebuild_monthly_payout(emp_id, month, year)
        rebuild_yearly_payout(emp_id, year)
        if auto_invoice:
            db.session.flush()  # payout.id must exist before invoicing it
            _invoice, created = _auto_generate_invoice(payout)
            if created:
                invoices_created += 1

    db.session.commit()

    return {
        "month": month,
        "year": year,
        "employees_processed": len(employee_ids),
        "weeks_per_employee": len(mondays),
        "invoices_created": invoices_created,
    }


# ------------------------------------------------------------------ automated payout
#
# No manual invoice creation, payment entry, or incentive calculation is
# needed from the backend team: this makes the whole chain
#   registrations -> incentive amount -> invoice -> payment
# self-driving. Real money movement goes through RazorpayX
# (razorpay_gateway.pay_incentive) when RAZORPAY_KEY_ID / _KEY_SECRET /
# _ACCOUNT_NUMBER are set as environment variables (never hardcoded —
# see config.py) and the employee has bank details on file; otherwise —
# the default, credential-free state — the invoice is still settled
# internally (a Payment row dated today) so the workflow completes
# end-to-end with zero manual entry either way, just without an actual
# gateway payout until those are configured.

def process_payout_for_period(month, year, today=None, force=False):
    """Recomputes the period, invoices every payable amount, and settles
    each invoice — via a real Razorpay payout when configured, else an
    internal settlement — creating zero manual invoice/payment entries
    either way. Idempotent per (month, year) via IncentivePayoutRun,
    unless `force=True` (admin "Run Payout Now" / manual testing), which
    clears any existing run record first so the period can be reprocessed
    — new/changed registrations are picked up and any not-yet-paid
    invoice gets a fresh settlement attempt; already-Paid invoices are
    left alone (no double payment)."""
    today = today or date.today()

    existing_run = IncentivePayoutRun.query.filter_by(month=month, year=year).first()
    if existing_run and not force:
        return None  # already processed this period

    if existing_run and force:
        db.session.delete(existing_run)
        db.session.flush()

    result = run_period(month, year, auto_invoice=True)

    payments_created = 0
    invoices = Invoice.query.filter(
        Invoice.invoice_type == "Incentive",
        Invoice.status == "Unpaid",
        Invoice.is_active == True,
    ).join(MonthlyPayout, Invoice.monthly_payout_id == MonthlyPayout.id).filter(
        MonthlyPayout.month == month,
        MonthlyPayout.year == year,
    ).all()

    from .razorpay_gateway import pay_incentive

    for invoice in invoices:
        already_paid = sum((p.amount or 0) for p in invoice.payments)
        remaining = float(invoice.amount or 0) - float(already_paid or 0)
        if remaining <= 0:
            continue

        employee = invoice.employee
        pay_result = (
            pay_incentive(employee, remaining, reference_id=invoice.invoice_number)
            if employee is not None
            else {"status": "skipped", "reason": "no_employee"}
        )

        if pay_result["status"] == "success":
            mode, gateway, gateway_reference = "Razorpay", "razorpay", pay_result.get("payout_id")
        else:
            # Not configured, no bank details on file, or the gateway call
            # itself failed — either way the invoice still gets settled
            # internally so "no manual payment entry" holds. `mode` stays
            # short (column is 30 chars); the full reason/error is kept
            # in gateway_reference for anyone who needs to see why.
            reason_labels = {
                "not_configured": "Auto (no Razorpay)",
                "no_bank_details": "Auto (no bank info)",
                "no_employee": "Auto (no employee)",
            }
            reason = pay_result.get("reason") or "gateway error"
            mode = reason_labels.get(reason, "Auto (gateway error)")
            gateway = None
            gateway_reference = (pay_result.get("error") or reason)[:80]

        payment = Payment(
            invoice_id=invoice.id,
            amount=remaining,
            payment_date=today,
            mode=mode,
            gateway=gateway,
            gateway_reference=gateway_reference,
            is_active=True,
        )
        db.session.add(payment)
        invoice.status = "Paid"
        payments_created += 1

    run_record = IncentivePayoutRun(
        month=month,
        year=year,
        invoices_created=result.get("invoices_created", 0),
        payments_created=payments_created,
    )
    db.session.add(run_record)
    db.session.commit()

    return {
        "month": month,
        "year": year,
        **result,
        "payments_created": payments_created,
    }


def auto_process_due_payouts(today=None):
    """Idempotent — safe to call on every request. On/after the 20th of
    month M, the incentive period that just became payable is (M-1, its
    year); this recomputes it (registrations may have kept coming in
    right up to the 20th), invoices every payable amount, and
    immediately auto-settles each invoice with a system Payment row —
    all without any admin action. A period is only ever processed once
    (see IncentivePayoutRun's unique (month, year) guard)."""
    today = today or date.today()

    if today.day < 20:
        return None  # nothing becomes payable before the 20th

    period_month = today.month - 1
    period_year = today.year
    if period_month < 1:
        period_month = 12
        period_year -= 1

    return process_payout_for_period(period_month, period_year, today=today)


def employee_summary(employee_id, year):
    """Tier + weekly / monthly / yearly figures for one employee — drives
    the CRM-employee Incentive login."""
    weekly = (
        WeeklyIncentive.query.filter_by(employee_id=employee_id, is_active=True)
        .filter(WeeklyIncentive.iso_year == year)
        .order_by(WeeklyIncentive.week_start_date)
        .all()
    )
    monthly = (
        MonthlyPayout.query.filter_by(employee_id=employee_id, year=year, is_active=True)
        .order_by(MonthlyPayout.month)
        .all()
    )
    yearly = YearlyPayout.query.filter_by(
        employee_id=employee_id, year=year, is_active=True
    ).first()

    current_tier = weekly[-1].tier_name if weekly else None

    return {
        "employee_id": employee_id,
        "year": year,
        "current_tier": current_tier,
        "tiers": [t.to_dict() for t in IncentiveTier.query.filter_by(is_active=True).order_by(IncentiveTier.sort_order).all()],
        "weekly": [w.to_dict() for w in weekly],
        "monthly": [m.to_dict() for m in monthly],
        "yearly": yearly.to_dict() if yearly else None,
    }


def dashboard_period_summary(employee_id, period_type, today=None):
    """CURRENT Weekly/Monthly/Quarterly incentive snapshot for the CRM
    dashboard's period toggle — target, actual registrations, the
    per-week/per-month breakdown, the plan-based incentive slab amount,
    payout status, and whether the linked invoice is Paid (unpaid
    incentive invoices are never surfaced here, matching the CRM
    Incentive Invoice list's Paid-only visibility rule)."""
    today = today or date.today()

    if period_type == "Weekly":
        monday = monday_of(today)
        start = datetime.combine(monday, time.min)
        end = datetime.combine(monday + timedelta(days=7), time.min)
        target = _weekly_target(employee_id, monday)
        calc = compute_period_incentive(employee_id, start, end, target)
        weekly_row = WeeklyIncentive.query.filter_by(
            employee_id=employee_id, week_start_date=monday
        ).first()

        return {
            "period_type": "Weekly",
            "target_registration": target,
            "actual_registration": calc["total"],
            "incentive_slab": calc["breakdown"],
            "incentive_amount": calc["amount"],
            "incentive_payout": {
                "status": weekly_row.status if weekly_row else "Pending",
                "amount": float(weekly_row.amount) if weekly_row else calc["amount"],
            },
            # Weekly periods aren't individually invoiced — only the
            # Monthly payout generates a real Invoice.
            "incentive_invoice_paid": False,
        }

    if period_type == "Monthly":
        month, year = today.month, today.year
        target = _monthly_target(employee_id, month, year)
        days_in_month = monthrange(year, month)[1]
        start = datetime.combine(date(year, month, 1), time.min)
        end = datetime.combine(date(year, month, days_in_month) + timedelta(days=1), time.min)
        calc = compute_period_incentive(employee_id, start, end, target)

        weeks = [_weekly_registration_count(employee_id, monday) for monday in weeks_touching_month(month, year)]
        weeks = (weeks + [0, 0, 0, 0])[:4]

        payout = MonthlyPayout.query.filter_by(employee_id=employee_id, month=month, year=year).first()
        invoice = (
            Invoice.query.filter_by(monthly_payout_id=payout.id, is_active=True).first()
            if payout
            else None
        )

        return {
            "period_type": "Monthly",
            "target_registration": target,
            "actual_registration": calc["total"],
            "week_breakdown": weeks,
            "incentive_slab": calc["breakdown"],
            "incentive_amount": calc["amount"],
            "incentive_payout": {
                "status": payout.status if payout else "Pending",
                "due_date": (
                    payout.due_date.isoformat()
                    if payout and payout.due_date
                    else payable_due_date(month, year).isoformat()
                ),
                "amount": float(payout.amount) if payout else calc["amount"],
            },
            "incentive_invoice_paid": bool(invoice and invoice.status == "Paid"),
        }

    # Quarterly
    quarter = (today.month - 1) // 3 + 1
    year = today.year
    start_month = (quarter - 1) * 3 + 1
    quarter_months = [((start_month + i - 1) % 12) + 1 for i in range(3)]
    quarter_years = [year + ((start_month + i - 1) // 12) for i in range(3)]

    start = datetime.combine(date(quarter_years[0], quarter_months[0], 1), time.min)
    end_month, end_year = quarter_months[-1] + 1, quarter_years[-1]
    if end_month > 12:
        end_month, end_year = 1, end_year + 1
    end = datetime.combine(date(end_year, end_month, 1), time.min)

    target = _quarterly_target(employee_id, quarter, year)
    calc = compute_period_incentive(employee_id, start, end, target)

    months = [
        _monthly_registration_count(employee_id, m, y)
        for m, y in zip(quarter_months, quarter_years)
    ]

    monthly_payouts = [
        MonthlyPayout.query.filter_by(employee_id=employee_id, month=m, year=y).first()
        for m, y in zip(quarter_months, quarter_years)
    ]
    existing_payouts = [p for p in monthly_payouts if p]
    invoices_paid = [
        bool(Invoice.query.filter_by(monthly_payout_id=p.id, is_active=True, status="Paid").first())
        for p in existing_payouts
    ]
    all_paid = bool(existing_payouts) and all(invoices_paid)

    return {
        "period_type": "Quarterly",
        "target_registration": target,
        "actual_registration": calc["total"],
        "month_breakdown": months,
        "incentive_slab": calc["breakdown"],
        "incentive_amount": calc["amount"],
        "incentive_payout": {
            "status": "Paid" if all_paid else "Pending",
        },
        "incentive_invoice_paid": all_paid,
    }
