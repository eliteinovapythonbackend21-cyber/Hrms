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
# TOP-LEVEL TICKET CATEGORIES — sent/received as `category`
# ============================================================================

CATEGORY_OPTIONS = [
    "Official Issues",
    "New Feature Issues",
    "Hrms Issues",
    "Personal Problems",
    "Other",
]


# ============================================================================
# DETAILED TICKET REASONS — sent/received as `reason`
#
# Shown in the "Support Ticket Reason" dropdown on the Add Ticket form,
# scoped to whichever `category` is currently selected — each category
# has its own reason list below. "Hrms Issues" keeps the original,
# already-correct HRMS reason list; the other four are new.
# ============================================================================

OFFICIAL_ISSUES_REASONS = [
    "Office Infrastructure Issue",
    "Seating / Workstation Issue",
    "Internet / Network Connectivity Issue",
    "Laptop / Desktop Hardware Issue",
    "Software / Application Access Issue",
    "Email / Communication Issue",
    "ID Card / Access Card Issue",
    "Parking / Facility Issue",
    "Meeting Room Booking Issue",
    "Travel / Conveyance Issue",
    "Vendor / Client Coordination Issue",
    "Documentation / Approval Issue",
    "Other Official Issue",
]

NEW_FEATURE_ISSUES_REASONS = [
    "New Feature Request",
    "Feature Enhancement Request",
    "UI / UX Improvement Suggestion",
    "New Module Request",
    "Report / Dashboard Enhancement Request",
    "Automation Request",
    "Integration Request",
    "Mobile App Feature Request",
    "Workflow Improvement Request",
    "Other Feature Request",
]

# Original HRMS reason list — kept exactly as-is (confirmed correct).
HRMS_ISSUES_REASONS = [
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

PERSONAL_PROBLEMS_REASONS = [
    "Health / Medical Issue",
    "Family Emergency",
    "Personal Leave Request Issue",
    "Work-Life Balance Concern",
    "Stress / Mental Health Concern",
    "Financial Difficulty",
    "Relocation / Commute Issue",
    "Harassment / Workplace Conduct Concern",
    "Interpersonal / Team Conflict",
    "Career Growth Concern",
    "Other Personal Issue",
]

OTHER_REASONS = [
    "General Query",
    "Suggestion / Feedback",
    "Complaint",
    "Miscellaneous Request",
    "Not Listed Above",
]

# category -> its own reason list. Every category in CATEGORY_OPTIONS
# must have an entry here — list_feedback_categories is the single
# source the frontend renders the reason dropdown from.
REASONS_BY_CATEGORY = {
    "Official Issues": OFFICIAL_ISSUES_REASONS,
    "New Feature Issues": NEW_FEATURE_ISSUES_REASONS,
    "Hrms Issues": HRMS_ISSUES_REASONS,
    "Personal Problems": PERSONAL_PROBLEMS_REASONS,
    "Other": OTHER_REASONS,
}

# Flat union of every reason across every category — kept for
# FeedbackTicket.SUBCATEGORIES / any consumer that just wants "is this a
# known reason at all" without caring which category it belongs to.
REASON_OPTIONS = [
    reason
    for reasons in REASONS_BY_CATEGORY.values()
    for reason in reasons
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
    """Validate against the top-level ticket categories."""

    return category in CATEGORY_OPTIONS


def _reasons_for(category):
    """The reason list scoped to one category — empty list for an
    unrecognized category rather than raising."""

    return REASONS_BY_CATEGORY.get(category, [])


def _validate_reason(category, reason):
    """A reason is only valid for the category it was submitted under —
    e.g. an "Hrms Issues" reason can't be attached to a "Personal
    Problems" ticket."""

    return reason in _reasons_for(category)


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
            # Flat union — kept for any consumer that doesn't care which
            # category a reason belongs to.
            "reasons": REASON_OPTIONS,
            # category -> its own reason list, so the frontend's "Support
            # Ticket Reason" dropdown can update live when the category
            # changes.
            "reasons_by_category": REASONS_BY_CATEGORY,
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
    # The Add Ticket form sends the top-level type as `category`:
    #
    #   Official Issues
    #   New Feature Issues
    #   Hrms Issues
    #   Personal Problems
    #   Other
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
    # The Add Ticket form sends the detailed reason as `reason`, scoped
    # to whichever category was selected (e.g. "Hrms Issues" ->
    # "Attendance Issue" / "Payroll / Salary Issue").
    # ------------------------------------------------------------------------

    if not _validate_reason(category, reason):
        return jsonify({
            "message": (
                f"reason must be one of: "
                + ", ".join(_reasons_for(category))
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

    # Once an admin has left a response, that's a signal they're already
    # working the ticket — even if they haven't moved status off "Open"
    # yet. From that point on, the owner can no longer edit or withdraw
    # it, matching the same reasoning as the status gate below.
    admin_has_engaged = bool(ticket.admin_response)

    # ------------------------------------------------------------------------
    # OWNER EDIT (non-admin): category / reason / purpose / description
    # ------------------------------------------------------------------------

    if not admin_user:

        editable_fields_requested = any(
            field in data
            for field in (
                "category",
                "reason",
                "purpose",
                "description",
            )
        )

        if editable_fields_requested and (
            ticket.status != EDITABLE_STATUS or admin_has_engaged
        ):
            return jsonify({
                "message": (
                    f"Only tickets with status '{EDITABLE_STATUS}' "
                    "that an admin hasn't responded to yet can be "
                    "edited"
                )
            }), 400

        # The reason is only meaningful in the context of a category, so
        # figure out the EFFECTIVE category first (the one being switched
        # to, if `category` is in this request; otherwise the ticket's
        # existing one) — then validate `reason` (whether newly submitted
        # or the ticket's existing one) against that category's list.
        # This catches both "changed category but left a now-mismatched
        # reason behind" and "changed reason without re-checking it still
        # belongs to the current category".
        effective_category = ticket.category

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

            effective_category = category

            if ticket.category != category:
                ticket.category = category
                history_parts.append(
                    f"Category changed to '{category}'."
                )

        if "reason" in data:
            reason = (
                data.get("reason") or ""
            ).strip()

            if not _validate_reason(effective_category, reason):
                return jsonify({
                    "message": (
                        "reason must be one of: "
                        + ", ".join(_reasons_for(effective_category))
                    )
                }), 400

            if ticket.subcategory != reason:
                ticket.subcategory = reason
                history_parts.append(
                    f"Reason changed to '{reason}'."
                )
        elif "category" in data and ticket.subcategory not in _reasons_for(
            effective_category
        ):
            return jsonify({
                "message": (
                    "The ticket's current reason doesn't belong to the "
                    "new category — please also choose a new "
                    "'reason' that matches: "
                    + ", ".join(_reasons_for(effective_category))
                )
            }), 400

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
    # ACTIVE / INACTIVE UPDATE — admin OR the ticket's owner.
    #
    # This is what powers "Reactivate" (turning a withdrawn ticket back
    # on) for both roles, mirroring the DELETE route's owner-or-admin
    # permission model. Deactivating via this path is still gated the
    # same way as deactivate_feedback below; reactivating (is_active
    # going back to True) has no such gate.
    # ------------------------------------------------------------------------

    if "is_active" in data and (admin_user or owns_ticket):
        next_active = (
            data.get("is_active") is not False
        )

        if not admin_user and not next_active:
            if ticket.status != EDITABLE_STATUS or admin_has_engaged:
                return jsonify({
                    "message": (
                        f"Only tickets with status '{EDITABLE_STATUS}' "
                        "that an admin hasn't responded to yet can be "
                        "deactivated by the employee who raised them."
                    )
                }), 400

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

    # The ticket's owner can only withdraw it while it's still sitting in
    # EDITABLE_STATUS ("Open") AND before an admin has left a response —
    # a response is a sign the admin is already working the ticket even
    # if they haven't moved status off "Open" yet. Once either is no
    # longer true, only the admin can deactivate it. Mirrors the same
    # restriction enforced on owner edits in update_feedback.
    if not admin_user and (
        ticket.status != EDITABLE_STATUS or ticket.admin_response
    ):
        return jsonify({
            "message": (
                f"Only tickets with status '{EDITABLE_STATUS}' that "
                "an admin hasn't responded to yet can be deactivated "
                "by the employee who raised them."
            )
        }), 400

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