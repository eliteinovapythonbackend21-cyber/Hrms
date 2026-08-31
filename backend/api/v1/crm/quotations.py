"""
Quotation records track priced quotes sent to a Customer. Deactivation
mirrors leads.py's / customers.py's / follow_ups.py's / meetings.py's
dedicated /deactivate route rather than the generic DELETE route,
which is intentionally blocked (deletable=False).
"""

from flask import jsonify
from flask_jwt_extended import jwt_required

from extensions import db
from models import Quotation
from utils import (
    fetch_or_404,
    is_admin,
    get_current_user,
    register_crud_blueprint,
    with_token,
)


def _generate_quotation_number(item, data):
    """Assign a unique QT##### number when the caller didn't supply one.

    The old implementation derived the sequence from gaps in the `id`
    column, which could hand back a number that an existing row already
    owns (rows are soft-deleted, never removed, and a manually-entered
    number can shift things out of sync) - the insert then failed with a
    UNIQUE violation surfaced to the UI as "Database integrity error".

    Derive the next value from the existing QT##### numbers themselves and
    skip anything already taken.
    """
    supplied = (item.quotation_number or "").strip()
    if supplied:
        item.quotation_number = supplied
        return None

    taken = {
        number
        for (number,) in db.session.query(Quotation.quotation_number)
        .filter(Quotation.quotation_number.isnot(None))
        .all()
        if number
    }

    seq = 1
    for number in taken:
        if number.upper().startswith("QT"):
            try:
                seq = max(seq, int(number[2:]) + 1)
            except (ValueError, TypeError):
                continue

    candidate = f"QT{seq:05d}"
    while candidate in taken:
        seq += 1
        candidate = f"QT{seq:05d}"

    item.quotation_number = candidate
    return None


quotations_bp = register_crud_blueprint(
    "quotations_bp",
    Quotation,
    create_fields=[
        "customer_id",
        "quotation_number",
        "amount",
        "status",
        "is_active",
    ],
    search_fields=[
        "quotation_number",
    ],
    url_prefix_singular="",
    editable=True,
    deletable=False,
    admin_only=False,
    on_create=_generate_quotation_number,
)


@quotations_bp.route(
    "/<int:quotation_id>/deactivate",
    methods=["DELETE"],
)
@jwt_required()
@with_token
def deactivate_quotation(
    quotation_id,
    token_response,
):
    current_user = get_current_user()

    if not is_admin(current_user):
        return jsonify(
            {
                "message":
                    "Admin privileges required"
            }
        ), 403

    quotation, error_response = fetch_or_404(
        Quotation,
        quotation_id,
    )

    if error_response:
        return error_response

    if quotation.is_active is False:
        return jsonify(
            {
                "message":
                    "Quotation is already inactive",
                "data":
                    quotation.to_dict(),
                "token_response":
                    token_response,
            }
        ), 409

    quotation.is_active = False
    db.session.commit()
    return jsonify(
        {
            "message":
                "Quotation deactivated",
            "data":
                quotation.to_dict(),
            "token_response":
                token_response,
        }
    ), 200