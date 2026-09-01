"""Tier-based CRM incentive engine.

Per employee, per ISO week (Mon-Sun; a week belongs to the month its
Monday falls in):

    weekly_count   = active Customer rows registered_by the employee in the week
    weekly_target  = EmployeeTarget (period_type "Weekly") for that Monday, else 0
    tier           = highest IncentiveTier with min_registrations <= weekly_count
    eligible_count = max(0, weekly_count - weekly_target)
    weekly_amount  = tier.rate_per_registration * eligible_count

MonthlyPayout = sum of that month's WeeklyIncentive rows.
YearlyPayout  = sum of the 12 MonthlyPayout rows.
EmployeeIncentive (legacy monthly table) is mirrored so the Finance
Attendance "Incentive (CRM)" column keeps working.
"""

from calendar import monthrange
from datetime import date, datetime, time, timedelta

from extensions import db
from models import (
    Customer,
    Department,
    Employee,
    EmployeeIncentive,
    EmployeeTarget,
    IncentiveTier,
    MonthlyPayout,
    WeeklyIncentive,
    YearlyPayout,
)

# Defaults C from the plan — admin edits these on the Incentive Tiers screen.
DEFAULT_TIERS = [
    {"name": "Bronze", "min_registrations": 5, "rate_per_registration": 50, "sort_order": 1},
    {"name": "Silver", "min_registrations": 10, "rate_per_registration": 75, "sort_order": 2},
    {"name": "Gold", "min_registrations": 15, "rate_per_registration": 100, "sort_order": 3},
]


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
        db.session.query(db.func.count(Customer.id))
        .filter(
            Customer.registered_by == employee_id,
            Customer.is_active == True,
            Customer.created_at >= start,
            Customer.created_at < end,
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

    amount = round(sum(float(w.amount or 0) for w in rows), 2)
    reg = sum(w.registration_count or 0 for w in rows)
    eligible = sum(w.eligible_count or 0 for w in rows)

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
    payout.is_active = True

    _mirror_employee_incentive(employee_id, month, year, amount, reg, eligible, rows)

    if commit:
        db.session.commit()
    return payout


def _mirror_employee_incentive(employee_id, month, year, amount, reg, eligible, weekly_rows):
    rec = EmployeeIncentive.query.filter_by(
        employee_id=employee_id, month=month, year=year
    ).first()
    if rec is None:
        if amount <= 0:
            return
        rec = EmployeeIncentive(employee_id=employee_id, month=month, year=year)
        db.session.add(rec)

    rec.target_customer_count = sum(w.target_count or 0 for w in weekly_rows)
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


def run_period(month, year):
    """Full weekly + monthly + yearly recompute for every active CRM
    employee for the given month/year. One commit at the end."""
    seed_default_tiers()

    employee_ids = _crm_employee_ids()
    mondays = weeks_touching_month(month, year)

    for emp_id in employee_ids:
        for monday in mondays:
            recompute_week(emp_id, monday)
        rebuild_monthly_payout(emp_id, month, year)
        rebuild_yearly_payout(emp_id, year)

    db.session.commit()

    return {
        "month": month,
        "year": year,
        "employees_processed": len(employee_ids),
        "weeks_per_employee": len(mondays),
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
