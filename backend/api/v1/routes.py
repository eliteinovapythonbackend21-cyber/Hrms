from flask import Blueprint, request, jsonify, current_app
from sqlalchemy.exc import IntegrityError
from models import BaseUser, Department, Designation, Employee, Attendance, Leave, NetworkStatus, AuditLog
from extensions import db
from utils import paginate_query, apply_search_filters, handle_image_upload

api_v1 = Blueprint("api_v1", __name__)


@api_v1.route("/users", methods=["GET"])
def list_users():
    query = BaseUser.query
    query = apply_search_filters(query, request.args, ["username", "email", "role"])
    results = paginate_query(query, request.args)
    return jsonify({"message": "Users fetched", "data": results}), 200


@api_v1.route("/departments", methods=["GET"])
def list_departments():
    query = Department.query
    query = apply_search_filters(query, request.args, ["department_name", "department_code"])
    results = paginate_query(query, request.args)
    return jsonify({"message": "Departments fetched", "data": results}), 200


@api_v1.route("/employees", methods=["GET"])
def list_employees():
    query = Employee.query
    query = apply_search_filters(query, request.args, ["first_name", "last_name", "employee_code"])
    results = paginate_query(query, request.args)
    return jsonify({"message": "Employees fetched", "data": results}), 200


@api_v1.route("/employees", methods=["POST"])
def create_employee():
    data = request.form.to_dict()
    picture_file = request.files.get("profile_picture")
    profile_picture = None
    if picture_file:
        profile_picture = handle_image_upload(picture_file, current_app.config["ALLOWED_IMAGE_EXTENSIONS"])

    user = BaseUser(
        username=data.get("username"),
        email=data.get("email"),
        password=data.get("password"),
        role=data.get("role", "employee"),
        profile_picture=profile_picture,
    )
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError as exc:
        db.session.rollback()
        orig = str(getattr(exc, "orig", exc)).lower()
        if "base_users_username_key" in orig or "username" in orig:
            return jsonify({"message": "Username already exists"}), 409
        if "base_users_email_key" in orig or "email" in orig:
            return jsonify({"message": "Email already exists"}), 409
        return jsonify({"message": "Database integrity error"}), 400

    employee = Employee(
        user_id=user.id,
        employee_code=data.get("employee_code"),
        department_id=data.get("department_id"),
        designation_id=data.get("designation_id"),
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        gender=data.get("gender"),
        dob=data.get("dob"),
        phone=data.get("phone"),
        emergency_contact=data.get("emergency_contact"),
        address=data.get("address"),
        city=data.get("city"),
        state=data.get("state"),
        country=data.get("country"),
        pincode=data.get("pincode"),
        joining_date=data.get("joining_date"),
        status=data.get("status", True),
    )
    db.session.add(employee)
    try:
        db.session.commit()
    except IntegrityError as exc:
        db.session.rollback()
        orig = str(getattr(exc, "orig", exc)).lower()
        if "employees_employee_code_key" in orig or "employee_code" in orig:
            return jsonify({"message": "Employee code already exists"}), 409
        return jsonify({"message": "Database integrity error"}), 400

    return jsonify({"message": "Employee created", "data": {"id": employee.id}}), 201
