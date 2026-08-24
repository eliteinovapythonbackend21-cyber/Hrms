from flask import jsonify, request
from flask_jwt_extended import jwt_required

from extensions import db
from models import EmployeeIncentive
from utils import fetch_or_404, get_current_user, is_admin, register_crud_blueprint, with_token


employee_incentives_bp = register_crud_blueprint(
    "employee_incentives_bp",
    EmployeeIncentive,
    create_fields=[],
    update_fields=["status", "is_active"],
    search_fields=[],
    url_prefix_singular="",          # CHANGED from "employee-incentives"
    editable=True,
    deletable=False,
    admin_only=True,
)


@employee_incentives_bp.route("/calculate", methods=["POST"])  # CHANGED: relative
@jwt_required()
@with_token
def calculate_employee_incentives(token_response):
    current_user = get_current_user()

    if not is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    data = request.json or {}
    month = data.get("month")
    year = data.get("year")

    if not month or not year:
        return jsonify({"message": "month and year are required"}), 400

    try:
        month = int(month)
        year = int(year)
    except (TypeError, ValueError):
        return jsonify({"message": "month and year must be integers"}), 400

    results = EmployeeIncentive.calculate_for_period(month, year)

    return jsonify(
        {
            "message": f"Incentives calculated for {month}/{year}",
            "data": [item.to_dict() for item in results],
            "token_response": token_response,
        }
    ), 200


@employee_incentives_bp.route("/<int:incentive_id>/deactivate", methods=["DELETE"])  # CHANGED: relative
@jwt_required()
@with_token
def deactivate_employee_incentive(incentive_id, token_response):
    current_user = get_current_user()

    if not is_admin(current_user):
        return jsonify({"message": "Admin privileges required"}), 403

    incentive, error_response = fetch_or_404(EmployeeIncentive, incentive_id)
    if error_response:
        return error_response

    if incentive.is_active is False:
        return jsonify(
            {
                "message": "Employee incentive is already inactive",
                "data": incentive.to_dict(),
                "token_response": token_response,
            }
        ), 409

    incentive.is_active = False
    db.session.commit()
    return jsonify(
        {
            "message": "Employee incentive deactivated",
            "data": incentive.to_dict(),
            "token_response": token_response,
        }
    ), 200