"""Salary Payroll — auto-generates each active employee's monthly Payroll
row from their base salary plus (for CRM employees) their most recently
finalized CRM incentive amount, self-triggering on the 1st-10th of every
month. Mirrors incentive_engine.auto_process_due_payouts's pattern for the
20th-of-month CRM incentive payout — same opportunistic
"first request on/after the window" trigger, same idempotency-via-run-row
guard.

CRM Incentive Payroll itself is unchanged/pre-existing — see
incentive_engine.py (MonthlyPayout / auto_process_due_payouts, due the
20th of the month following the incentive period). Salary Payroll just
reads its result: an employee's incentive component here is the amount
from their latest MonthlyPayout that has already been Invoiced/Paid — i.e.
an incentive figure this month's salary run can rely on as final, not one
still being computed for the in-progress period.
"""

from datetime import date

from extensions import db
from models import Employee, MonthlyPayout, Payroll, SalaryPayrollRun
from utils import is_crm_employee


def _latest_finalized_incentive_amount(employee_id):
    payout = (
        MonthlyPayout.query.filter_by(employee_id=employee_id, is_active=True)
        .filter(MonthlyPayout.status.in_(["Invoiced", "Paid"]))
        .order_by(MonthlyPayout.year.desc(), MonthlyPayout.month.desc())
        .first()
    )
    return float(payout.amount) if payout else 0.0


def generate_salary_payroll(pay_month, pay_year, force=False):
    """Upserts a Payroll row (gross = base salary + CRM incentive, net =
    gross - deductions) for every active employee for pay_month/pay_year.
    Idempotent per (month, year) via SalaryPayrollRun unless force=True
    (admin "Run Now" / manual re-run — e.g. after correcting an
    employee's salary or once an incentive that was still pending has
    since been finalized). Never touches a Payroll row already marked
    Paid."""
    existing_run = SalaryPayrollRun.query.filter_by(
        month=pay_month, year=pay_year
    ).first()

    if existing_run and not force:
        return None

    if existing_run and force:
        db.session.delete(existing_run)
        db.session.flush()

    pay_month_key = f"{pay_year:04d}-{pay_month:02d}"
    employees = Employee.query.filter_by(is_active=True).all()

    processed = 0
    for employee in employees:
        row = Payroll.query.filter_by(
            employee_id=employee.id, pay_month=pay_month_key
        ).first()

        if row and row.status == "Paid":
            continue  # already paid out — never overwrite

        base_salary = float(employee.salary or 0)
        incentive_amount = (
            _latest_finalized_incentive_amount(employee.id)
            if is_crm_employee(employee)
            else 0.0
        )
        gross = round(base_salary + incentive_amount, 2)

        if row is None:
            row = Payroll(employee_id=employee.id, pay_month=pay_month_key)
            db.session.add(row)

        deductions = float(row.deductions or 0)
        row.gross_salary = gross
        row.net_salary = round(gross - deductions, 2)
        if row.status in (None, "Draft"):
            row.status = "Generated"
        row.is_active = True
        processed += 1

    run_record = SalaryPayrollRun(
        month=pay_month, year=pay_year, employees_processed=processed
    )
    db.session.add(run_record)
    db.session.commit()

    return {
        "month": pay_month,
        "year": pay_year,
        "employees_processed": processed,
    }


def auto_generate_due_salary_payroll(today=None):
    """Idempotent — safe to call on every request. Only generates once
    per (month, year), and only within the 1st-10th automation window."""
    today = today or date.today()

    if not (1 <= today.day <= 10):
        return None

    return generate_salary_payroll(today.month, today.year)
