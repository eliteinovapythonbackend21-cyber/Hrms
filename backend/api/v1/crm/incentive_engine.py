"""CRM incentive engine — flat monthly registration incentive.

Registrations are the Registration-page (Meeting) records a CRM
employee adds (`Meeting.registered_by`), not raw Customer rows.

Per employee, per calendar month:

    monthly_count = active Registration rows added by the employee that month
    base_amount   = INCENTIVE_BASE_AMOUNT (Rs. 1,000) once monthly_count >= 1,
                    covering the first INCENTIVE_TARGET_COUNT (30) registrations
    extra_count   = max(0, monthly_count - INCENTIVE_TARGET_COUNT)
    extra_amount  = extra_count * (INCENTIVE_EXTRA_RATE_PERCENT/100 * INCENTIVE_BASE_AMOUNT)
                    i.e. +0.6% of Rs. 1,000 (Rs. 6) per registration past the 30th
    monthly_amount = base_amount + extra_amount

Per employee, per ISO week (Mon-Sun; a week belongs to the month its
Monday falls in) a WeeklyIncentive row is still kept for the weekly
breakdown / tier badge shown on the CRM employee Incentive screen —
IncentiveTier only decides that badge, it no longer drives the payable
amount, which is always the flat monthly formula above.

MonthlyPayout.amount = the flat monthly formula (not a sum of weekly
amounts, since the 30-registration threshold is monthly, not weekly).
YearlyPayout  = sum of the 12 MonthlyPayout rows.
EmployeeIncentive (legacy monthly table) is mirrored so the Finance
Attendance "Incentive (CRM)" column keeps working.

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
    MonthlyPayout,
    Payment,
    WeeklyIncentive,
    YearlyPayout,
)

# Defaults C from the plan — admin edits these on the Incentive Tiers screen.
# Kept only to resolve the weekly "tier" badge shown on the CRM employee
# Incentive screen; the payable amount itself uses the flat formula below.
DEFAULT_TIERS = [
    {"name": "Bronze", "min_registrations": 5, "rate_per_registration": 50, "sort_order": 1},
    {"name": "Silver", "min_registrations": 10, "rate_per_registration": 75, "sort_order": 2},
    {"name": "Gold", "min_registrations": 15, "rate_per_registration": 100, "sort_order": 3},
]

# ------------------------------------------------------------------ flat rule
INCENTIVE_TARGET_COUNT = 30          # registrations covered by the flat base amount
INCENTIVE_BASE_AMOUNT = 1000.0       # Rs. paid for the first 30 registrations in a month
INCENTIVE_EXTRA_RATE_PERCENT = 0.6   # % of INCENTIVE_BASE_AMOUNT added per registration past 30


def compute_monthly_incentive_amount(count):
    """Rs. amount for a given monthly registration count, per the flat
    rule: Rs.1,000 for the first 30 registrations, then +0.6% of
    Rs.1,000 (Rs.6) for every registration from the 31st onward."""
    if count <= 0:
        return 0.0
    extra = max(0, count - INCENTIVE_TARGET_COUNT)
    extra_rate = (INCENTIVE_EXTRA_RATE_PERCENT / 100) * INCENTIVE_BASE_AMOUNT
    return round(INCENTIVE_BASE_AMOUNT + extra * extra_rate, 2)


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
    return row.target_customer_count if row else 0


# ------------------------------------------------------------------ recompute

def recompute_week(employee_id, monday, commit=False):
    count = _weekly_registration_count(employee_id, monday)

    row = WeeklyIncentive.query.filter_by(
        employee_id=employee_id, week_start_date=monday
    ).first()

    if count == 0 and row is None:
        return None  # nothing to record for an empty week

    target = _weekly_target(employee_id, monday)
    tier = IncentiveTier.resolve(count)            # decision B: raw weekly count
    eligible = max(0, count - target)              # decision A: above target
    rate = float(tier.rate_per_registration) if tier else 0.0
    amount = round(rate * eligible, 2)

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
    row.rate_per_registration = rate
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

    # Registration count and payable amount both come from the flat
    # monthly rule (not summed weekly amounts — the 30-registration
    # threshold is monthly, and weeks can spill across month boundaries).
    reg = _monthly_registration_count(employee_id, month, year)
    eligible = max(0, reg - INCENTIVE_TARGET_COUNT)
    amount = compute_monthly_incentive_amount(reg)

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

    _mirror_employee_incentive(employee_id, month, year, amount, reg, eligible, rows)

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


def _mirror_employee_incentive(employee_id, month, year, amount, reg, eligible, weekly_rows):
    rec = EmployeeIncentive.query.filter_by(
        employee_id=employee_id, month=month, year=year
    ).first()
    if rec is None:
        if amount <= 0:
            return
        rec = EmployeeIncentive(employee_id=employee_id, month=month, year=year)
        db.session.add(rec)

    rec.target_customer_count = INCENTIVE_TARGET_COUNT
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

    if IncentivePayoutRun.query.filter_by(month=period_month, year=period_year).first():
        return None  # already processed this period

    result = run_period(period_month, period_year, auto_invoice=True)

    payments_created = 0
    invoices = Invoice.query.filter(
        Invoice.invoice_type == "Incentive",
        Invoice.status == "Unpaid",
        Invoice.is_active == True,
    ).join(MonthlyPayout, Invoice.monthly_payout_id == MonthlyPayout.id).filter(
        MonthlyPayout.month == period_month,
        MonthlyPayout.year == period_year,
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
        month=period_month,
        year=period_year,
        invoices_created=result.get("invoices_created", 0),
        payments_created=payments_created,
    )
    db.session.add(run_record)
    db.session.commit()

    return {
        "month": period_month,
        "year": period_year,
        **result,
        "payments_created": payments_created,
    }


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
