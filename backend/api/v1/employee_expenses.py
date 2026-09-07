"""Day-to-day personal expense log — an employee freely adds/edits/
deactivates their own entries (no approval workflow); admin and
Finance-department logins can view everyone's. Hand-written (not the
generic register_crud_blueprint helper) for the same self-vs-privileged
employee scoping pattern used by leave.py's list_leaves/create_leave,
plus multipart handling for the optional receipt upload.
"""

from datetime import date

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required

from extensions import db
from models import Employee, EmployeeExpense
from utils import (
    get_current_user,
    handle_upload,
    is_admin,
    is_finance_department_user,
    paginate_query,
    with_token,
)

employee_expenses_bp = Blueprint("employee_expenses_bp", __name__)


def _is_privileged(user):
    return is_admin(user) or is_finance_department_user(user)


def _own_employee(user):
    return Employee.query.filter_by(user_id=user.id).first() if user else None


def _parse_date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _truthy(value):
    return str(value).strip().lower() in {"true", "1", "yes"}


def _upload_receipt(file_storage):
    """Returns (url, error_response). error_response is a (jsonify, status)
    tuple on failure, else None."""
    if not file_storage or not file_storage.filename:
        return None, None
    try:
        uploaded = handle_upload(
            file_storage,
            current_app.config["ALLOWED_DOCUMENT_EXTENSIONS"],
            folder="hrms/expense_receipts",
            resource_type="auto",
        )
    except ValueError as exc:
        return None, (jsonify({"message": str(exc)}), 400)
    return (uploaded["url"] if uploaded else None), None


@employee_expenses_bp.route("/", methods=["GET"])
@jwt_required()
@with_token
def list_employee_expenses(token_response):
    current_user = get_current_user()
    query = EmployeeExpense.query

    if _is_privileged(current_user):
        if request.args.get("employee_id"):
            query = query.filter_by(employee_id=request.args.get("employee_id"))
    else:
        own = _own_employee(current_user)
        query = query.filter_by(employee_id=own.id if own else -1)

    if request.args.get("category"):
        query = query.filter_by(category=request.args.get("category"))

    if request.args.get("is_active") is not None:
        query = query.filter(EmployeeExpense.is_active == _truthy(request.args.get("is_active")))

    from_date = _parse_date(request.args.get("from_date"))
    to_date = _parse_date(request.args.get("to_date"))
    if from_date:
        query = query.filter(EmployeeExpense.expense_date >= from_date)
    if to_date:
        query = query.filter(EmployeeExpense.expense_date <= to_date)

    return jsonify({
        "message": "Employee expenses fetched",
        "data": paginate_query(query.order_by(EmployeeExpense.expense_date.desc()), request.args),
        "token_response": token_response,
    }), 200


@employee_expenses_bp.route("/categories", methods=["GET"])
@jwt_required()
@with_token
def list_employee_expense_categories(token_response):
    return jsonify({
        "message": "Expense categories fetched",
        "data": {"categories": list(EmployeeExpense.CATEGORIES)},
        "token_response": token_response,
    }), 200


@employee_expenses_bp.route("/<int:expense_id>", methods=["GET"])
@jwt_required()
@with_token
def get_employee_expense(expense_id, token_response):
    expense = EmployeeExpense.query.get(expense_id)
    if not expense:
        return jsonify({"message": "Expense not found"}), 404

    current_user = get_current_user()
    if not _is_privileged(current_user):
        own = _own_employee(current_user)
        if not own or expense.employee_id != own.id:
            return jsonify({"message": "You do not have permission to view this expense"}), 403

    return jsonify({
        "message": "Expense fetched",
        "data": expense.to_dict(),
        "token_response": token_response,
    }), 200


@employee_expenses_bp.route("/", methods=["POST"])
@jwt_required()
@with_token
def create_employee_expense(token_response):
    current_user = get_current_user()
    # Multipart/form-data — an optional receipt file can accompany it.
    data = request.form.to_dict()

    category = (data.get("category") or "").strip()
    if category not in EmployeeExpense.CATEGORIES:
        return jsonify({
            "message": "category must be one of: " + ", ".join(EmployeeExpense.CATEGORIES)
        }), 400

    try:
        amount = float(data.get("amount"))
    except (TypeError, ValueError):
        return jsonify({"message": "amount must be a number"}), 400
    if amount <= 0:
        return jsonify({"message": "amount must be greater than 0"}), 400

    expense_date = _parse_date(data.get("expense_date"))
    if not expense_date:
        return jsonify({"message": "expense_date is required (YYYY-MM-DD)"}), 400

    # Resolve the employee — a privileged login may log an expense on
    # someone else's behalf; everyone else always logs their own.
    if _is_privileged(current_user) and data.get("employee_id"):
        employee_id = int(data.get("employee_id"))
    else:
        own = _own_employee(current_user)
        if not own:
            return jsonify({"message": "No employee record is linked to your account."}), 400
        employee_id = own.id

    receipt_url, error_response = _upload_receipt(request.files.get("receipt"))
    if error_response:
        return error_response

    expense = EmployeeExpense(
        employee_id=employee_id,
        category=category,
        amount=amount,
        expense_date=expense_date,
        description=(data.get("description") or "").strip() or None,
        receipt_url=receipt_url,
        is_active=True,
    )
    db.session.add(expense)
    db.session.commit()

    return jsonify({
        "message": "Expense recorded",
        "data": expense.to_dict(),
        "token_response": token_response,
    }), 201


@employee_expenses_bp.route("/<int:expense_id>", methods=["PUT"])
@jwt_required()
@with_token
def update_employee_expense(expense_id, token_response):
    expense = EmployeeExpense.query.get(expense_id)
    if not expense:
        return jsonify({"message": "Expense not found"}), 404

    current_user = get_current_user()
    if not _is_privileged(current_user):
        own = _own_employee(current_user)
        if not own or expense.employee_id != own.id:
            return jsonify({"message": "You do not have permission to edit this expense"}), 403

    data = request.form.to_dict() if request.form else (request.get_json(silent=True) or {})

    if "category" in data:
        category = (data.get("category") or "").strip()
        if category not in EmployeeExpense.CATEGORIES:
            return jsonify({
                "message": "category must be one of: " + ", ".join(EmployeeExpense.CATEGORIES)
            }), 400
        expense.category = category

    if "amount" in data:
        try:
            amount = float(data.get("amount"))
        except (TypeError, ValueError):
            return jsonify({"message": "amount must be a number"}), 400
        if amount <= 0:
            return jsonify({"message": "amount must be greater than 0"}), 400
        expense.amount = amount

    if "expense_date" in data:
        parsed = _parse_date(data.get("expense_date"))
        if not parsed:
            return jsonify({"message": "Invalid expense_date"}), 400
        expense.expense_date = parsed

    if "description" in data:
        expense.description = (data.get("description") or "").strip() or None

    if "is_active" in data:
        raw = data.get("is_active")
        expense.is_active = raw if isinstance(raw, bool) else _truthy(raw)

    receipt_url, error_response = _upload_receipt(
        request.files.get("receipt") if request.files else None
    )
    if error_response:
        return error_response
    if receipt_url:
        expense.receipt_url = receipt_url

    db.session.commit()
    return jsonify({
        "message": "Expense updated",
        "data": expense.to_dict(),
        "token_response": token_response,
    }), 200


@employee_expenses_bp.route("/<int:expense_id>/deactivate", methods=["DELETE"])
@jwt_required()
@with_token
def deactivate_employee_expense(expense_id, token_response):
    expense = EmployeeExpense.query.get(expense_id)
    if not expense:
        return jsonify({"message": "Expense not found"}), 404

    current_user = get_current_user()
    if not _is_privileged(current_user):
        own = _own_employee(current_user)
        if not own or expense.employee_id != own.id:
            return jsonify({"message": "You do not have permission to deactivate this expense"}), 403

    if expense.is_active is False:
        return jsonify({
            "message": "Expense is already inactive",
            "data": expense.to_dict(),
            "token_response": token_response,
        }), 409

    expense.is_active = False
    db.session.commit()
    return jsonify({
        "message": "Expense deactivated",
        "data": expense.to_dict(),
        "token_response": token_response,
    }), 200
