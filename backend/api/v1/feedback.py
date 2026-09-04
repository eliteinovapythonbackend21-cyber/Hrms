from datetime import datetime

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import BaseUser, Employee, FeedbackTicket, SupportTicketHistory
from utils import (
    fetch_or_404,
    get_current_user,
    handle_feedback_screenshot_upload,
    handle_integrity_error,
    is_admin,
    paginate_query,
    with_token,
)


feedback_bp = Blueprint("feedback_bp", __name__)


# ============================================================================
# TOP-LEVEL BUG CATEGORIES — sent/received as `category`
# ============================================================================

CATEGORY_OPTIONS = [
    "Feature Bug",
    "Internal Bug",
    "Other Bugs/Issues",
]


# ============================================================================
# DETAILED TICKET REASONS — sent/received as `reason`
#
# Shown in the "Support Ticket Reason" dropdown on the Add Ticket form.
# ============================================================================

REASON_OPTIONS = [
    "Login / Password Issue",
    "Account Locked / Access Issue",
    "Employee Profile Update",
    "Employee Master Data Correction",
    "New Employee Creation",
    "Employee Exit / Deactivation",
    "Attendance Issue",
    "Attendance Regularization",
    "Leave Balance Issue",
    "Leave Application Issue",
    "Leave Approval Issue",
    "Holiday / Calendar Issue",
    "Shift / Roster Issue",
    "Work From Home / Remote Work Issue",
    "Overtime Issue",
    "Payroll / Salary Issue",
    "Payslip Issue",
    "Tax / TDS Issue",
    "Reimbursement Issue",
    "Expense Claim Issue",
    "Loan / Advance Issue",
    "Bank Account / Payment Details Update",
    "Benefits / Insurance Issue",
    "Performance Management Issue",
    "Appraisal / Rating Issue",
    "Training / Learning Issue",
    "Recruitment / Hiring Issue",
    "Onboarding Issue",
    "Employee Documents Issue",
    "HR Letter / Certificate Request",
    "Organization / Department Change",
    "Manager / Reporting Structure Change",
    "Transfer / Location Change",
    "Notification / Email Issue",
    "Mobile App Issue",
    "HRMS System Error",
    "Data / Report Issue",
    "Integration Issue",
    "Approval Workflow Issue",
    "Permission / Role Access Request",
    "Feature / Configuration Request",
    "HR Policy / Process Clarification",
    "General HRMS Query",
    "Other / Miscellaneous",
]


STATUS_OPTIONS = [
    "Open",
    "In Progress",
    "Resolved",
]


# Owner (non-admin) edits are only allowed while the ticket sits in this
# status — once an admin has picked it up (In Progress/Resolved), the
# reporter can no longer change the underlying category/reason/purpose/
# description out from under them.
EDITABLE_STATUS = "Open"


FeedbackTicket.CATEGORIES = tuple(CATEGORY_OPTIONS)
FeedbackTicket.SUBCATEGORIES = tuple(REASON_OPTIONS)
FeedbackTicket.STATUSES = tuple(STATUS_OPTIONS)


def _next_ticket_number():
    """Generate the next support-ticket number in the FB00001 format."""

    taken = {
        number
        for (number,) in db.session.query(FeedbackTicket.ticket_number)
        .filter(FeedbackTicket.ticket_number.isnot(None))
        .all()
        if number
    }

    seq = 1

    for number in taken:
        value = str(number).upper()

        if value.startswith("FB"):
            try:
                seq = max(
                    seq,
                    int(value[2:]) + 1,
                )
            except (ValueError, TypeError):
                continue

    candidate = f"FB{seq:05d}"

    while candidate in taken:
        seq += 1
        candidate = f"FB{seq:05d}"

    return candidate


def _get_employee_for_user(user):
    """Return the Employee record associated with the logged-in user."""

    if not user:
        return None

    return Employee.query.filter_by(
        user_id=user.id
    ).first()


def _serialize_ticket(ticket):
    """Serialize a support ticket for API responses."""

    return ticket.to_dict()


def _add_history(
    ticket,
    action,
    performed_by,
    notes=None,
):
    """Create a support-ticket history entry."""

    history = SupportTicketHistory(
        ticket_id=ticket.id,
        action=action,
        performed_by=performed_by,
        notes=notes,
        is_active=True,
    )

    db.session.add(history)

    return history


def _validate_category(category):
    """Validate against the top-level bug categories."""

    return category in CATEGORY_OPTIONS


def _validate_reason(reason):
    """Validate against the detailed ticket reasons."""

    return reason in REASON_OPTIONS


def _parse_bool(value):
    """Convert common boolean query-string values to bool."""

    return str(value).lower() in {
        "true",
        "1",
        "yes",
    }


def _owns_ticket(user, ticket):
    """Whether the given user is the one who raised this ticket."""

    return bool(user) and ticket.raised_by == user.id


def _can_manage_ticket(user, ticket):
    """Whether the user is allowed to edit/deactivate this ticket at
    all — either as an admin, or as the person who raised it."""

    return is_admin(user) or _owns_ticket(user, ticket)



@feedback_bp.route("/", methods=["GET"])
@jwt_required()
@with_token
def list_feedback(token_response):
    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "message": "Invalid token",
        }), 401

    query = FeedbackTicket.query

    # Non-admin users can only see their own tickets.
    if not is_admin(current_user):
        query = query.filter(
            FeedbackTicket.raised_by == current_user.id
        )

    # Optional main-category filter.
    category = request.args.get("category")

    if category:
        query = query.filter(
            FeedbackTicket.category == category
        )

    # Optional detailed-reason filter.
    reason = request.args.get("reason")

    if reason:
        query = query.filter(
            FeedbackTicket.subcategory == reason
        )

    # Optional status filter.
    status = request.args.get("status")

    if status:
        query = query.filter(
            FeedbackTicket.status == status
        )

    # Optional active/inactive filter.
    if request.args.get("is_active") is not None:
        query = query.filter(
            FeedbackTicket.is_active
            == _parse_bool(
                request.args.get("is_active")
            )
        )

    return jsonify({
        "message": "Support tickets fetched",
        "data": paginate_query(
            query.order_by(
                FeedbackTicket.id.desc()
            ),
            request.args,
        ),
        "token_response": token_response,
    }), 200


# ============================================================================
# GET TICKET CATEGORIES / REASONS / STATUSES
# ============================================================================

@feedback_bp.route("/categories", methods=["GET"])
@jwt_required()
@with_token
def list_feedback_categories(token_response):
    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "message": "Invalid token",
        }), 401

    return jsonify({
        "message": "Support ticket categories fetched",
        "data": {
            "categories": CATEGORY_OPTIONS,
            "reasons": REASON_OPTIONS,
            "statuses": STATUS_OPTIONS,
        },
        "token_response": token_response,
    }), 200


# ============================================================================
# GET TICKET
# ============================================================================

@feedback_bp.route("/<int:ticket_id>", methods=["GET"])
@jwt_required()
@with_token
def get_feedback(ticket_id, token_response):
    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "message": "Invalid token",
        }), 401

    ticket, error_response = fetch_or_404(
        FeedbackTicket,
        ticket_id,
    )

    if error_response:
        return error_response

    # Non-admin users can only view their own tickets.
    if (
        not is_admin(current_user)
        and ticket.raised_by != current_user.id
    ):
        return jsonify({
            "message": "You do not have permission to view this ticket",
        }), 403

    return jsonify({
        "message": "Support ticket fetched",
        "data": _serialize_ticket(ticket),
        "token_response": token_response,
    }), 200


# ============================================================================
# CREATE TICKET
# ============================================================================

@feedback_bp.route("/", methods=["POST"])
@jwt_required()
@with_token
def create_feedback(token_response):
    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "message": "Invalid token",
        }), 401

    # Multipart/form-data is used because the ticket can contain
    # an optional screenshot.
    data = request.form.to_dict()

    category = (
        data.get("category") or ""
    ).strip()

    reason = (
        data.get("reason") or ""
    ).strip()

    purpose = (
        data.get("purpose") or ""
    ).strip()

    description = (
        data.get("description") or ""
    ).strip()

    # ------------------------------------------------------------------------
    # CATEGORY VALIDATION
    # ------------------------------------------------------------------------
    #
    # The Add Ticket form sends the top-level bug type as `category`:
    #
    #   Feature Bug
    #   Internal Bug
    #   Other Bugs/Issues
    # ------------------------------------------------------------------------

    if not _validate_category(category):
        return jsonify({
            "message": (
                "category must be one of: "
                + ", ".join(CATEGORY_OPTIONS)
            )
        }), 400

    # ------------------------------------------------------------------------
    # REASON VALIDATION
    # ------------------------------------------------------------------------
    #
    # The Add Ticket form sends the detailed reason as `reason`
    # (e.g. "Attendance Issue", "Payroll / Salary Issue").
    # ------------------------------------------------------------------------

    if not _validate_reason(reason):
        return jsonify({
            "message": (
                "reason must be one of: "
                + ", ".join(REASON_OPTIONS)
            )
        }), 400

    # Purpose is required.
    if not purpose:
        return jsonify({
            "message": "purpose is required",
        }), 400

    # Description is required.
    if not description:
        return jsonify({
            "message": "description is required",
        }), 400

    # Resolve the employee from the authenticated user instead of
    # trusting employee identity values submitted by the frontend.
    employee = _get_employee_for_user(
        current_user
    )

    if not employee:
        return jsonify({
            "message": "Employee record not found for the current user",
        }), 400

    # ------------------------------------------------------------------------
    # SCREENSHOT UPLOAD
    # ------------------------------------------------------------------------

    screenshot_url = None

    upload = request.files.get(
        "screenshot"
    )

    if upload and upload.filename:
        try:
            uploaded = handle_feedback_screenshot_upload(
                upload,
                current_app.config[
                    "ALLOWED_IMAGE_EXTENSIONS"
                ],
            )
        except ValueError as exc:
            return jsonify({
                "message": str(exc),
            }), 400

        if uploaded:
            screenshot_url = uploaded["url"]

    # ------------------------------------------------------------------------
    # CREATE TICKET
    # ------------------------------------------------------------------------

    ticket = FeedbackTicket(
        ticket_number=_next_ticket_number(),
        raised_by=current_user.id,
        employee_id=employee.id,
        category=category,
        subcategory=reason,
        purpose=purpose,
        description=description,
        screenshot_url=screenshot_url,
        status="Open",
        is_active=True,
    )

    db.session.add(ticket)

    try:
        # Flush first so ticket.id is available for history.
        db.session.flush()

        _add_history(
            ticket=ticket,
            action="Created",
            performed_by=current_user.id,
            notes=(
                f"Support ticket created under category "
                f"'{category}', reason '{reason}'."
            ),
        )

        db.session.commit()

    except IntegrityError as exc:
        db.session.rollback()

        return handle_integrity_error(
            exc
        )

    return jsonify({
        "message": "Support ticket raised",
        "data": _serialize_ticket(ticket),
        "token_response": token_response,
    }), 201


# ============================================================================
# UPDATE TICKET
#
# Two distinct actors use this same route, gated by role:
#
#   - Admin: manages status / admin_response / is_active (unchanged
#     from before).
#   - Ticket owner (non-admin): can edit category / reason / purpose /
#     description of their OWN ticket, but only while it is still
#     "Open" (EDITABLE_STATUS) — once picked up by an admin they can no
#     longer change the underlying report out from under them.
#
# Field values are assigned via plain attribute setattr (same pattern
# as performance.py's update_performance), not constructor kwargs.
# ============================================================================

@feedback_bp.route("/<int:ticket_id>", methods=["PUT"])
@jwt_required()
@with_token
def update_feedback(ticket_id, token_response):
    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "message": "Invalid token",
        }), 401

    ticket, error_response = fetch_or_404(
        FeedbackTicket,
        ticket_id,
    )

    if error_response:
        return error_response

    admin_user = is_admin(current_user)
    owns_ticket = _owns_ticket(current_user, ticket)

    if not admin_user and not owns_ticket:
        return jsonify({
            "message": "You do not have permission to update this ticket",
        }), 403

    data = request.get_json(
        silent=True
    ) or {}

    history_parts = []

    # ------------------------------------------------------------------------
    # OWNER EDIT (non-admin): category / reason / purpose / description
    # ------------------------------------------------------------------------

    if not admin_user:

        if ticket.status != EDITABLE_STATUS:
            return jsonify({
                "message": (
                    f"Only tickets with status '{EDITABLE_STATUS}' "
                    "can be edited"
                )
            }), 400

        if "category" in data:
            category = (
                data.get("category") or ""
            ).strip()

            if not _validate_category(category):
                return jsonify({
                    "message": (
                        "category must be one of: "
                        + ", ".join(CATEGORY_OPTIONS)
                    )
                }), 400

            if ticket.category != category:
                ticket.category = category
                history_parts.append(
                    f"Category changed to '{category}'."
                )

        if "reason" in data:
            reason = (
                data.get("reason") or ""
            ).strip()

            if not _validate_reason(reason):
                return jsonify({
                    "message": (
                        "reason must be one of: "
                        + ", ".join(REASON_OPTIONS)
                    )
                }), 400

            if ticket.subcategory != reason:
                ticket.subcategory = reason
                history_parts.append(
                    f"Reason changed to '{reason}'."
                )

        if "purpose" in data:
            purpose = (
                data.get("purpose") or ""
            ).strip()

            if not purpose:
                return jsonify({
                    "message": "purpose cannot be empty",
                }), 400

            ticket.purpose = purpose

        if "description" in data:
            description = (
                data.get("description") or ""
            ).strip()

            if not description:
                return jsonify({
                    "message": "description cannot be empty",
                }), 400

            ticket.description = description

        if history_parts:
            history_parts.append(
                "Ticket edited by employee."
            )

    # ------------------------------------------------------------------------
    # ADMIN: STATUS UPDATE
    # ------------------------------------------------------------------------

    if admin_user and "status" in data:
        status = (
            data.get("status") or ""
        ).strip()

        if status not in STATUS_OPTIONS:
            return jsonify({
                "message": (
                    "status must be one of: "
                    + ", ".join(STATUS_OPTIONS)
                )
            }), 400

        previous_status = ticket.status

        ticket.status = status

        if status == "Resolved":
            ticket.resolved_by = current_user.id
            ticket.resolved_at = datetime.utcnow()

        else:
            ticket.resolved_by = None
            ticket.resolved_at = None

        if previous_status != status:
            history_parts.append(
                (
                    f"Status changed from "
                    f"'{previous_status}' to '{status}'."
                )
            )

    # ------------------------------------------------------------------------
    # ADMIN: RESPONSE UPDATE
    # ------------------------------------------------------------------------

    if admin_user and "admin_response" in data:
        response = (
            data.get("admin_response") or ""
        ).strip()

        ticket.admin_response = (
            response or None
        )

        if response:
            history_parts.append(
                f"Admin note: {response}"
            )
        else:
            history_parts.append(
                "Admin resolution note cleared."
            )

    # ------------------------------------------------------------------------
    # ADMIN: ACTIVE / INACTIVE UPDATE
    # ------------------------------------------------------------------------

    if admin_user and "is_active" in data:
        next_active = (
            data.get("is_active") is not False
        )

        if ticket.is_active != next_active:
            ticket.is_active = next_active

            history_parts.append(
                "Ticket activated."
                if next_active
                else "Ticket deactivated."
            )

    # ------------------------------------------------------------------------
    # SAVE UPDATE
    # ------------------------------------------------------------------------

    try:
        if history_parts:
            _add_history(
                ticket=ticket,
                action="Updated",
                performed_by=current_user.id,
                notes=" ".join(history_parts),
            )

        db.session.commit()

    except IntegrityError as exc:
        db.session.rollback()

        return handle_integrity_error(
            exc
        )

    return jsonify({
        "message": "Support ticket updated",
        "data": _serialize_ticket(ticket),
        "token_response": token_response,
    }), 200


# ============================================================================
# DEACTIVATE TICKET
#
# Registered at BOTH:
#   DELETE /<id>              (matches the CRUD-factory convention used
#                               elsewhere in this codebase)
#   DELETE /<id>/deactivate   (matches performance_bp's / training_bp's
#                               convention)
#
# Both point at the same handler — whichever shape the frontend calls,
# it works. Callable by the ticket's owner (withdrawing their own
# ticket) or by an admin.
# ============================================================================

@feedback_bp.route("/<int:ticket_id>", methods=["DELETE"])
@feedback_bp.route("/<int:ticket_id>/deactivate", methods=["DELETE"])
@jwt_required()
@with_token
def deactivate_feedback(ticket_id, token_response):
    current_user = get_current_user()

    if not current_user:
        return jsonify({
            "message": "Invalid token",
        }), 401

    ticket, error_response = fetch_or_404(
        FeedbackTicket,
        ticket_id,
    )

    if error_response:
        return error_response

    if not _can_manage_ticket(current_user, ticket):
        return jsonify({
            "message": "You do not have permission to deactivate this ticket",
        }), 403

    admin_user = is_admin(current_user)

    ticket.is_active = False

    try:
        _add_history(
            ticket=ticket,
            action="Deactivated",
            performed_by=current_user.id,
            notes=(
                "Ticket deactivated by admin."
                if admin_user
                else "Ticket deactivated by employee."
            ),
        )

        db.session.commit()

    except IntegrityError as exc:
        db.session.rollback()

        return handle_integrity_error(
            exc
        )

    return jsonify({
        "message": "Support ticket deactivated",
        "data": _serialize_ticket(ticket),
        "token_response": token_response,
    }), 200