"""RazorpayX payout wrapper for the automated CRM incentive payout.

Credentials are never hardcoded — `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`
/ `RAZORPAY_ACCOUNT_NUMBER` come from Config (which reads them from real
environment variables, see config.py). With any of the three unset — which
is the default, out-of-the-box state — every call here is a safe no-op:
`is_configured()` is False, `pay_incentive(...)` returns a "skipped"
result, and the caller (incentive_engine.auto_process_due_payouts) falls
back to its own internal settlement so the payout workflow still
completes end-to-end with zero manual entry, just without money actually
moving through Razorpay.

A payout additionally needs the employee to have `account_number` +
`bank_ifsc` on file (RazorpayX pays a "fund account", which is created
from those two once and cached on the Employee row) — an employee
missing either is skipped the same way, invoice/payment bookkeeping still
happens, just marked as not gateway-settled.
"""

from flask import current_app

from extensions import db

try:
    import razorpay
except ImportError:  # pragma: no cover - package not installed yet
    razorpay = None


def is_configured():
    cfg = current_app.config
    return bool(
        razorpay
        and cfg.get("RAZORPAY_KEY_ID")
        and cfg.get("RAZORPAY_KEY_SECRET")
        and cfg.get("RAZORPAY_ACCOUNT_NUMBER")
    )


def _client():
    cfg = current_app.config
    return razorpay.Client(auth=(cfg["RAZORPAY_KEY_ID"], cfg["RAZORPAY_KEY_SECRET"]))


def _ensure_fund_account(client, employee):
    """Returns the RazorpayX fund_account id to pay this employee, creating
    (and caching on the Employee row) the Razorpay Contact + Fund Account
    the first time. Returns None if the employee has no bank details on
    file to create one from."""
    if employee.razorpay_fund_account_id:
        return employee.razorpay_fund_account_id

    if not employee.account_number or not employee.bank_ifsc:
        return None

    contact_id = employee.razorpay_contact_id
    if not contact_id:
        contact = client.contact.create({
            "name": f"{employee.first_name or ''} {employee.last_name or ''}".strip()
            or employee.employee_code,
            "type": "employee",
            "reference_id": employee.employee_code,
        })
        contact_id = contact["id"]
        employee.razorpay_contact_id = contact_id

    fund_account = client.fund_account.create({
        "contact_id": contact_id,
        "account_type": "bank_account",
        "bank_account": {
            "name": f"{employee.first_name or ''} {employee.last_name or ''}".strip(),
            "account_number": employee.account_number,
            "ifsc": employee.bank_ifsc,
        },
    })
    employee.razorpay_fund_account_id = fund_account["id"]
    db.session.add(employee)
    return employee.razorpay_fund_account_id


def pay_incentive(employee, amount, reference_id):
    """Attempts to pay `amount` (Rs.) to `employee` via RazorpayX.

    Returns a dict:
      {"status": "skipped", "reason": "..."}   - not configured / no bank details
      {"status": "success", "payout_id": "..."} - payout created
      {"status": "failed", "error": "..."}       - Razorpay call raised

    Never raises — a gateway hiccup should never break the incentive
    calculation/invoicing that already happened.
    """
    if not is_configured():
        return {"status": "skipped", "reason": "not_configured"}

    try:
        client = _client()
        fund_account_id = _ensure_fund_account(client, employee)
        if not fund_account_id:
            return {"status": "skipped", "reason": "no_bank_details"}

        payout = client.payout.create({
            "account_number": current_app.config["RAZORPAY_ACCOUNT_NUMBER"],
            "fund_account_id": fund_account_id,
            "amount": int(round(float(amount) * 100)),  # paise
            "currency": "INR",
            "mode": "IMPS",
            "purpose": "salary",
            "queue_if_low_balance": True,
            "reference_id": reference_id,
            "narration": "CRM incentive payout",
        })
        return {"status": "success", "payout_id": payout.get("id")}
    except Exception as exc:  # noqa: BLE001 - any SDK/network error, never crash the caller
        return {"status": "failed", "error": str(exc)}
