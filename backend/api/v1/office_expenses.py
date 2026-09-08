from datetime import date, timedelta

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from extensions import db
from models import Employee, OfficeExpense
from utils import (
    get_current_user,
    handle_upload,
    is_admin,
    is_finance_department_user,
    paginate_query,
    with_token,
)


office_expenses_bp = Blueprint(
    "office_expenses_bp",
    __name__,
)


def _is_privileged(user):
    return is_admin(user) or is_finance_department_user(user)


def _own_employee(user):
    if not user:
        return None

    return Employee.query.filter_by(
        user_id=user.id
    ).first()


def _parse_date(value):
    if not value:
        return None

    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def _truthy(value):
    return str(value).strip().lower() in {
        "true",
        "1",
        "yes",
    }


def _upload_receipt(file_storage):
    if not file_storage or not file_storage.filename:
        return None, None

    try:
        uploaded = handle_upload(
            file_storage,
            current_app.config["ALLOWED_DOCUMENT_EXTENSIONS"],
            folder="hrms/office_expenses",
            resource_type="auto",
        )
    except ValueError as exc:
        return None, (
            jsonify({"message": str(exc)}),
            400,
        )

    return (
        uploaded["url"] if uploaded else None,
        None,
    )


def _resolve_employee(current_user, employee_id):
    if _is_privileged(current_user) and employee_id:
        try:
            employee_id = int(employee_id)
        except (TypeError, ValueError):
            return None, (
                jsonify(
                    {"message": "Invalid employee_id"}
                ),
                400,
            )

        employee = Employee.query.get(employee_id)

        if not employee:
            return None, (
                jsonify(
                    {"message": "Employee not found"}
                ),
                404,
            )

        return employee, None

    employee = _own_employee(current_user)

    if not employee and not _is_privileged(current_user):
        return None, (
            jsonify(
                {
                    "message":
                    "No employee record is linked to your account."
                }
            ),
            400,
        )

    # Admin/finance logins routinely have no Employee record of their
    # own — that's fine here, employee_id is just an optional
    # attribution; "Purchased By" (free text) is the real record of
    # who bought the item.
    return employee, None


@office_expenses_bp.route("/", methods=["GET"])
@jwt_required()
@with_token
def list_office_expenses(token_response):
    current_user = get_current_user()

    query = OfficeExpense.query

    if _is_privileged(current_user):
        employee_id = request.args.get("employee_id")

        if employee_id:
            query = query.filter(
                OfficeExpense.employee_id == employee_id
            )
    else:
        own = _own_employee(current_user)

        query = query.filter(
            OfficeExpense.employee_id ==
            (own.id if own else -1)
        )

    category = request.args.get("category")

    if category:
        query = query.filter(
            OfficeExpense.category == category
        )

    purchase_type = request.args.get("purchase_type")

    if purchase_type:
        query = query.filter(
            OfficeExpense.purchase_type == purchase_type
        )

    collection_status = request.args.get(
        "collection_status"
    )

    if collection_status:
        query = query.filter(
            OfficeExpense.collection_status ==
            collection_status
        )

    is_active = request.args.get("is_active")

    if is_active is not None:
        query = query.filter(
            OfficeExpense.is_active ==
            _truthy(is_active)
        )

    from_date = _parse_date(
        request.args.get("from_date")
    )

    to_date = _parse_date(
        request.args.get("to_date")
    )

    if from_date:
        query = query.filter(
            OfficeExpense.expense_date >= from_date
        )

    if to_date:
        query = query.filter(
            OfficeExpense.expense_date <= to_date
        )

    query = query.order_by(
        OfficeExpense.expense_date.desc(),
        OfficeExpense.id.desc(),
    )

    return jsonify(
        {
            "message": "Office expenses fetched",
            "data": paginate_query(
                query,
                request.args,
            ),
            "token_response": token_response,
        }
    ), 200


@office_expenses_bp.route(
    "/categories",
    methods=["GET"],
)
@jwt_required()
@with_token
def office_expense_categories(token_response):
    return jsonify(
        {
            "message": "Office expense categories fetched",
            "data": {
                "categories":
                    list(OfficeExpense.CATEGORIES),
                "purchase_types":
                    list(OfficeExpense.PURCHASE_TYPES),
                "collection_statuses":
                    list(
                        OfficeExpense.COLLECTION_STATUSES
                    ),
                "collection_modes":
                    list(
                        OfficeExpense.COLLECTION_MODES
                    ),
                "paid_from_defaults":
                    list(
                        OfficeExpense.PAID_FROM_DEFAULTS
                    ),
                "collector_defaults":
                    list(
                        OfficeExpense.COLLECTOR_DEFAULTS
                    ),
                "payment_statuses":
                    list(
                        OfficeExpense.PAYMENT_STATUSES
                    ),
            },
            "token_response": token_response,
        }
    ), 200


@office_expenses_bp.route(
    "/",
    methods=["POST"],
)
@jwt_required()
@with_token
def create_office_expense(token_response):
    current_user = get_current_user()

    data = request.form.to_dict()

    employee, error_response = _resolve_employee(
        current_user,
        data.get("employee_id"),
    )

    if error_response:
        return error_response

    purchase_type = (
        data.get("purchase_type")
        or ""
    ).strip()

    if purchase_type not in OfficeExpense.PURCHASE_TYPES:
        return jsonify(
            {
                "message":
                "purchase_type must be one of: "
                + ", ".join(
                    OfficeExpense.PURCHASE_TYPES
                )
            }
        ), 400

    category = (
        data.get("category")
        or ""
    ).strip()

    if category not in OfficeExpense.CATEGORIES:
        return jsonify(
            {
                "message":
                "category must be one of: "
                + ", ".join(
                    OfficeExpense.CATEGORIES
                )
            }
        ), 400

    item_name = (
        data.get("item_name")
        or ""
    ).strip()

    if not item_name:
        return jsonify(
            {"message": "item_name is required"}
        ), 400

    purchased_by = (
        data.get("purchased_by")
        or ""
    ).strip()

    if not purchased_by:
        return jsonify(
            {"message": "purchased_by is required"}
        ), 400

    try:
        amount = float(data.get("amount"))
    except (TypeError, ValueError):
        return jsonify(
            {"message": "amount must be a number"}
        ), 400

    if amount <= 0:
        return jsonify(
            {
                "message":
                "amount must be greater than 0"
            }
        ), 400

    expense_date = _parse_date(
        data.get("expense_date")
    )

    if not expense_date:
        return jsonify(
            {
                "message":
                "expense_date is required (YYYY-MM-DD)"
            }
        ), 400

    collection_status = (
        data.get("collection_status")
        or "Not Collected"
    ).strip()

    if collection_status not in (
        OfficeExpense.COLLECTION_STATUSES
    ):
        return jsonify(
            {
                "message":
                "Invalid collection_status"
            }
        ), 400

    collection_mode = (
        data.get("collection_mode")
        or ""
    ).strip() or None

    if collection_status == "Collected":
        if not collection_mode:
            return jsonify(
                {
                    "message":
                    "collection_mode is required "
                    "when amount is collected"
                }
            ), 400

        if collection_mode not in (
            OfficeExpense.COLLECTION_MODES
        ):
            return jsonify(
                {
                    "message":
                    "Invalid collection_mode"
                }
            ), 400

    collection_date = None

    if data.get("collection_date"):
        collection_date = _parse_date(
            data.get("collection_date")
        )

        if not collection_date:
            return jsonify(
                {
                    "message":
                    "Invalid collection_date"
                }
            ), 400

    try:
        amount_paid = float(data.get("amount_paid") or 0)
    except (TypeError, ValueError):
        return jsonify(
            {"message": "amount_paid must be a number"}
        ), 400

    if amount_paid < 0:
        return jsonify(
            {"message": "amount_paid cannot be negative"}
        ), 400

    payment_status = (
        data.get("payment_status")
        or "Pending"
    ).strip()

    if payment_status not in OfficeExpense.PAYMENT_STATUSES:
        return jsonify(
            {
                "message":
                "payment_status must be one of: "
                + ", ".join(OfficeExpense.PAYMENT_STATUSES)
            }
        ), 400

    reimbursement_date = None

    if data.get("reimbursement_date"):
        reimbursement_date = _parse_date(
            data.get("reimbursement_date")
        )

        if not reimbursement_date:
            return jsonify(
                {"message": "Invalid reimbursement_date"}
            ), 400

    receipt_url, error_response = _upload_receipt(
        request.files.get("receipt")
    )

    if error_response:
        return error_response

    expense = OfficeExpense(
        employee_id=employee.id if employee else None,
        purchase_type=purchase_type,
        category=category,
        item_name=item_name,
        amount=amount,
        purchased_by=purchased_by,
        purchased_from=(
            data.get("purchased_from")
            or ""
        ).strip() or None,
        expense_date=expense_date,
        description=(
            data.get("description")
            or ""
        ).strip() or None,
        receipt_url=receipt_url,
        collection_status=collection_status,
        collection_mode=collection_mode,
        collection_date=collection_date,
        paid_from=(
            data.get("paid_from")
            or ""
        ).strip() or None,
        amount_paid=amount_paid,
        payment_status=payment_status,
        reimbursement_date=reimbursement_date,
        is_active=True,
    )

    db.session.add(expense)
    db.session.commit()

    return jsonify(
        {
            "message":
                "Office expense recorded",
            "data": expense.to_dict(),
            "token_response": token_response,
        }
    ), 201


@office_expenses_bp.route(
    "/<int:expense_id>",
    methods=["GET"],
)
@jwt_required()
@with_token
def get_office_expense(
    expense_id,
    token_response,
):
    expense = OfficeExpense.query.get(
        expense_id
    )

    if not expense:
        return jsonify(
            {"message": "Office expense not found"}
        ), 404

    current_user = get_current_user()

    if not _is_privileged(current_user):
        own = _own_employee(current_user)

        if (
            not own
            or expense.employee_id != own.id
        ):
            return jsonify(
                {
                    "message":
                    "You do not have permission "
                    "to view this expense"
                }
            ), 403

    return jsonify(
        {
            "message": "Office expense fetched",
            "data": expense.to_dict(),
            "token_response": token_response,
        }
    ), 200


@office_expenses_bp.route(
    "/<int:expense_id>",
    methods=["PUT"],
)
@jwt_required()
@with_token
def update_office_expense(
    expense_id,
    token_response,
):
    expense = OfficeExpense.query.get(
        expense_id
    )

    if not expense:
        return jsonify(
            {"message": "Office expense not found"}
        ), 404

    current_user = get_current_user()

    if not _is_privileged(current_user):
        own = _own_employee(current_user)

        if (
            not own
            or expense.employee_id != own.id
        ):
            return jsonify(
                {
                    "message":
                    "You do not have permission "
                    "to edit this expense"
                }
            ), 403

    data = (
        request.form.to_dict()
        if request.form
        else (
            request.get_json(silent=True)
            or {}
        )
    )

    if (
        _is_privileged(current_user)
        and data.get("employee_id")
    ):
        try:
            employee_id = int(
                data.get("employee_id")
            )
        except (TypeError, ValueError):
            return jsonify(
                {"message": "Invalid employee_id"}
            ), 400

        if not Employee.query.get(employee_id):
            return jsonify(
                {"message": "Employee not found"}
            ), 404

        expense.employee_id = employee_id

    if "purchase_type" in data:
        value = (
            data.get("purchase_type")
            or ""
        ).strip()

        if value not in OfficeExpense.PURCHASE_TYPES:
            return jsonify(
                {
                    "message":
                    "Invalid purchase_type"
                }
            ), 400

        expense.purchase_type = value

    if "category" in data:
        value = (
            data.get("category")
            or ""
        ).strip()

        if value not in OfficeExpense.CATEGORIES:
            return jsonify(
                {
                    "message":
                    "Invalid category"
                }
            ), 400

        expense.category = value

    if "item_name" in data:
        value = (
            data.get("item_name")
            or ""
        ).strip()

        if not value:
            return jsonify(
                {"message": "item_name is required"}
            ), 400

        expense.item_name = value

    if "amount" in data:
        try:
            amount = float(
                data.get("amount")
            )
        except (TypeError, ValueError):
            return jsonify(
                {"message": "Invalid amount"}
            ), 400

        if amount <= 0:
            return jsonify(
                {
                    "message":
                    "amount must be greater than 0"
                }
            ), 400

        expense.amount = amount

    if "purchased_by" in data:
        value = (
            data.get("purchased_by")
            or ""
        ).strip()

        if not value:
            return jsonify(
                {
                    "message":
                    "purchased_by is required"
                }
            ), 400

        expense.purchased_by = value

    if "purchased_from" in data:
        expense.purchased_from = (
            data.get("purchased_from")
            or ""
        ).strip() or None

    if "expense_date" in data:
        parsed = _parse_date(
            data.get("expense_date")
        )

        if not parsed:
            return jsonify(
                {
                    "message":
                    "Invalid expense_date"
                }
            ), 400

        expense.expense_date = parsed

    if "description" in data:
        expense.description = (
            data.get("description")
            or ""
        ).strip() or None

    if "collection_status" in data:
        status = (
            data.get("collection_status")
            or ""
        ).strip()

        if status not in (
            OfficeExpense.COLLECTION_STATUSES
        ):
            return jsonify(
                {
                    "message":
                    "Invalid collection_status"
                }
            ), 400

        expense.collection_status = status

    if "collection_mode" in data:
        expense.collection_mode = (
            data.get("collection_mode")
            or ""
        ).strip() or None

    if "collection_date" in data:
        raw_date = data.get(
            "collection_date"
        )

        if raw_date:
            parsed = _parse_date(raw_date)

            if not parsed:
                return jsonify(
                    {
                        "message":
                        "Invalid collection_date"
                    }
                ), 400

            expense.collection_date = parsed
        else:
            expense.collection_date = None

    if "paid_from" in data:
        expense.paid_from = (
            data.get("paid_from")
            or ""
        ).strip() or None

    if "amount_paid" in data:
        try:
            amount_paid = float(
                data.get("amount_paid") or 0
            )
        except (TypeError, ValueError):
            return jsonify(
                {"message": "Invalid amount_paid"}
            ), 400

        if amount_paid < 0:
            return jsonify(
                {
                    "message":
                    "amount_paid cannot be negative"
                }
            ), 400

        expense.amount_paid = amount_paid

    if "payment_status" in data:
        value = (
            data.get("payment_status")
            or ""
        ).strip()

        if value not in OfficeExpense.PAYMENT_STATUSES:
            return jsonify(
                {
                    "message":
                    "Invalid payment_status"
                }
            ), 400

        expense.payment_status = value

    if "reimbursement_date" in data:
        raw_date = data.get("reimbursement_date")

        if raw_date:
            parsed = _parse_date(raw_date)

            if not parsed:
                return jsonify(
                    {
                        "message":
                        "Invalid reimbursement_date"
                    }
                ), 400

            expense.reimbursement_date = parsed
        else:
            expense.reimbursement_date = None

    if (
        expense.collection_status == "Collected"
        and not expense.collection_mode
    ):
        return jsonify(
            {
                "message":
                "collection_mode is required "
                "when amount is collected"
            }
        ), 400

    if "is_active" in data:
        raw = data.get("is_active")

        expense.is_active = (
            raw
            if isinstance(raw, bool)
            else _truthy(raw)
        )

    receipt_url, error_response = _upload_receipt(
        request.files.get("receipt")
        if request.files
        else None
    )

    if error_response:
        return error_response

    if receipt_url:
        expense.receipt_url = receipt_url

    db.session.commit()

    return jsonify(
        {
            "message":
                "Office expense updated",
            "data": expense.to_dict(),
            "token_response": token_response,
        }
    ), 200


@office_expenses_bp.route(
    "/<int:expense_id>/deactivate",
    methods=["DELETE"],
)
@jwt_required()
@with_token
def deactivate_office_expense(
    expense_id,
    token_response,
):
    expense = OfficeExpense.query.get(
        expense_id
    )

    if not expense:
        return jsonify(
            {"message": "Office expense not found"}
        ), 404

    current_user = get_current_user()

    if not _is_privileged(current_user):
        own = _own_employee(current_user)

        if (
            not own
            or expense.employee_id != own.id
        ):
            return jsonify(
                {
                    "message":
                    "You do not have permission "
                    "to deactivate this expense"
                }
            ), 403

    expense.is_active = False

    db.session.commit()

    return jsonify(
        {
            "message":
                "Office expense deactivated",
            "data": expense.to_dict(),
            "token_response": token_response,
        }
    ), 200


@office_expenses_bp.route(
    "/reports",
    methods=["GET"],
)
@jwt_required()
@with_token
def office_expense_reports(token_response):
    current_user = get_current_user()

    period = (
        request.args.get("period")
        or "weekly"
    ).lower()

    selected_date = _parse_date(
        request.args.get("date")
    ) or date.today()

    query = OfficeExpense.query.filter(
        OfficeExpense.is_active.is_(True)
    )

    if not _is_privileged(current_user):
        own = _own_employee(current_user)

        query = query.filter(
            OfficeExpense.employee_id ==
            (own.id if own else -1)
        )

    if period == "weekly":
        start_date = (
            selected_date
            - timedelta(
                days=selected_date.weekday()
            )
        )
        end_date = (
            start_date
            + timedelta(days=6)
        )

        rows = (
            query.filter(
                OfficeExpense.expense_date
                .between(start_date, end_date)
            )
            .order_by(
                OfficeExpense.expense_date.asc()
            )
            .all()
        )

        day_names = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ]

        days = []

        for offset, day_name in enumerate(day_names):
            current_date = (
                start_date
                + timedelta(days=offset)
            )

            day_rows = [
                row
                for row in rows
                if row.expense_date == current_date
            ]

            total = sum(
                float(row.amount or 0)
                for row in day_rows
            )

            collected = sum(
                float(row.amount or 0)
                for row in day_rows
                if row.collection_status
                == "Collected"
            )

            days.append(
                {
                    "date":
                        current_date.isoformat(),
                    "day":
                        day_name,
                    "entries":
                        len(day_rows),
                    "amount":
                        total,
                    "collected_amount":
                        collected,
                    "pending_amount":
                        total - collected,
                    "expenses":
                        [
                            row.to_dict()
                            for row in day_rows
                        ],
                }
            )

        total_amount = sum(
            item["amount"]
            for item in days
        )

        collected_amount = sum(
            item["collected_amount"]
            for item in days
        )

        return jsonify(
            {
                "message":
                    "Weekly office expense report",
                "data": {
                    "period": "weekly",
                    "from_date":
                        start_date.isoformat(),
                    "to_date":
                        end_date.isoformat(),
                    "total_amount":
                        total_amount,
                    "collected_amount":
                        collected_amount,
                    "pending_amount":
                        total_amount
                        - collected_amount,
                    "days": days,
                },
                "token_response":
                    token_response,
            }
        ), 200

    if period == "monthly":
        month_start = selected_date.replace(
            day=1
        )

        if month_start.month == 12:
            next_month = month_start.replace(
                year=month_start.year + 1,
                month=1,
            )
        else:
            next_month = month_start.replace(
                month=month_start.month + 1
            )

        month_end = next_month - timedelta(days=1)

        rows = (
            query.filter(
                OfficeExpense.expense_date
                .between(month_start, month_end)
            )
            .order_by(
                OfficeExpense.expense_date.asc()
            )
            .all()
        )

        weeks = {}

        for row in rows:
            week_number = row.expense_date.isocalendar().week

            if week_number not in weeks:
                weeks[week_number] = []

            weeks[week_number].append(row)

        monthly_entries = []

        for week_number, week_rows in sorted(
            weeks.items()
        ):
            total = sum(
                float(row.amount or 0)
                for row in week_rows
            )

            collected = sum(
                float(row.amount or 0)
                for row in week_rows
                if row.collection_status
                == "Collected"
            )

            monthly_entries.append(
                {
                    "week":
                        f"Week {len(monthly_entries) + 1}",
                    "entries":
                        len(week_rows),
                    "amount":
                        total,
                    "collected_amount":
                        collected,
                    "pending_amount":
                        total - collected,
                    "expenses":
                        [
                            row.to_dict()
                            for row in week_rows
                        ],
                }
            )

        total_amount = sum(
            item["amount"]
            for item in monthly_entries
        )

        collected_amount = sum(
            item["collected_amount"]
            for item in monthly_entries
        )

        return jsonify(
            {
                "message":
                    "Monthly office expense report",
                "data": {
                    "period": "monthly",
                    "month":
                        month_start.strftime("%B %Y"),
                    "from_date":
                        month_start.isoformat(),
                    "to_date":
                        month_end.isoformat(),
                    "total_amount":
                        total_amount,
                    "collected_amount":
                        collected_amount,
                    "pending_amount":
                        total_amount
                        - collected_amount,
                    "weeks":
                        monthly_entries,
                },
                "token_response":
                    token_response,
            }
        ), 200

    if period == "quarterly":
        quarter = (
            (selected_date.month - 1) // 3
        ) + 1

        first_month = (
            (quarter - 1) * 3
        ) + 1

        quarter_start = date(
            selected_date.year,
            first_month,
            1,
        )

        if first_month == 10:
            quarter_end = date(
                selected_date.year,
                12,
                31,
            )
        else:
            next_quarter = date(
                selected_date.year,
                first_month + 3,
                1,
            )

            quarter_end = (
                next_quarter
                - timedelta(days=1)
            )

        rows = (
            query.filter(
                OfficeExpense.expense_date
                .between(
                    quarter_start,
                    quarter_end,
                )
            )
            .order_by(
                OfficeExpense.expense_date.asc()
            )
            .all()
        )

        months = []

        for month_offset in range(3):
            month_number = (
                first_month + month_offset
            )

            month_rows = [
                row
                for row in rows
                if row.expense_date.month
                == month_number
            ]

            total = sum(
                float(row.amount or 0)
                for row in month_rows
            )

            collected = sum(
                float(row.amount or 0)
                for row in month_rows
                if row.collection_status
                == "Collected"
            )

            months.append(
                {
                    "month":
                        date(
                            selected_date.year,
                            month_number,
                            1,
                        ).strftime("%B"),
                    "entries":
                        len(month_rows),
                    "amount":
                        total,
                    "collected_amount":
                        collected,
                    "pending_amount":
                        total - collected,
                    "expenses":
                        [
                            row.to_dict()
                            for row in month_rows
                        ],
                }
            )

        total_amount = sum(
            item["amount"]
            for item in months
        )

        collected_amount = sum(
            item["collected_amount"]
            for item in months
        )

        return jsonify(
            {
                "message":
                    "Quarterly office expense report",
                "data": {
                    "period": "quarterly",
                    "quarter":
                        f"Q{quarter} {selected_date.year}",
                    "from_date":
                        quarter_start.isoformat(),
                    "to_date":
                        quarter_end.isoformat(),
                    "total_amount":
                        total_amount,
                    "collected_amount":
                        collected_amount,
                    "pending_amount":
                        total_amount
                        - collected_amount,
                    "months": months,
                },
                "token_response":
                    token_response,
            }
        ), 200

    return jsonify(
        {
            "message":
                "period must be weekly, monthly or quarterly"
        }
    ), 400