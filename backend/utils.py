from functools import wraps

import cloudinary.uploader
from flask import jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash


def serialize_model(item):
    if hasattr(item, "to_dict"):
        return item.to_dict()
    return {column.name: getattr(item, column.name) for column in item.__table__.columns}


def apply_sort(query, args):
    sort_by = args.get("sort_by")
    model = query.column_descriptions[0]["type"]

    if not sort_by:
        # Default listing order: most recently updated record first.
        if hasattr(model, "__table__") and "updated_at" in model.__table__.columns:
            return query.order_by(model.updated_at.desc())
        return query

    if not hasattr(model, "__table__") or sort_by not in model.__table__.columns:
        return query

    column = getattr(model, sort_by)
    sort_dir = (args.get("sort_dir") or "asc").lower()
    return query.order_by(column.desc() if sort_dir == "desc" else column.asc())


def paginate_query(query, args):
    page = int(args.get("page", 1))
    per_page = int(args.get("per_page", 20))
    query = apply_sort(query, args)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return {
        "items": [serialize_model(item) for item in pagination.items],
        "page": page,
        "per_page": per_page,
        "total": pagination.total,
        "pages": pagination.pages,
    }


def apply_search_filters(query, args, fields):
    search = args.get("search")
    if not search:
        return query

    filters = [getattr(query.column_descriptions[0]["type"], field).ilike(f"%{search}%") for field in fields]
    return query.filter(or_(*filters))


def allowed_file_extension(filename, allowed_extensions):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_extensions


def handle_image_upload(file, allowed_extensions):
    return handle_upload(file, allowed_extensions, folder="hrms/profile_pictures", resource_type="image")


def handle_document_upload(file, allowed_extensions):
    return handle_upload(file, allowed_extensions, folder="hrms/employee_documents", resource_type="auto")


def handle_upload(file, allowed_extensions, folder, resource_type="auto"):
    if not file or file.filename == "":
        return None

    if not allowed_file_extension(file.filename, allowed_extensions):
        raise ValueError("File type not allowed")

    result = cloudinary.uploader.upload(file, folder=folder, resource_type=resource_type)

    return {
        "url": result["secure_url"],
        "public_id": result["public_id"],
    }


def parse_datetime(date_str, time_str):
    if not date_str or not time_str:
        return None

    if isinstance(date_str, date):
        date_part = date_str
    else:
        try:
            date_part = datetime.fromisoformat(date_str).date()
        except ValueError:
            return None

    try:
        if isinstance(time_str, datetime):
            time_part = time_str.time()
        else:
            time_part = datetime.fromisoformat(f"{date_part}T{time_str}").time()
    except ValueError:
        return None

    return datetime.combine(date_part, time_part)


def hash_password(password):
    return generate_password_hash(password)


def verify_password(password, hashed_password):
    return check_password_hash(hashed_password, password)


# ---------------------------------------------------------------------------
# Shared auth / CRUD-shape helpers reused across the new blueprints (Phase 0+)
# so the `_is_admin`/`_get_current_user`/`with_token` pattern that used to be
# copy-pasted per blueprint file (see master.py, role.py) is implemented once.
# ---------------------------------------------------------------------------

def get_current_user():
    from models import BaseUser
    user_id = int(get_jwt_identity())
    return BaseUser.query.get(user_id)


def is_admin(user):
    return bool(user and user.role == "admin")


def with_token(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            token = get_jwt()
        except Exception:
            token = None
        return func(*args, token_response=token, **kwargs)

    return wrapper


def admin_required(func):
    """Rejects the request with 403 unless the caller is an admin user.
    Combine with @jwt_required() (applied first / outermost)."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        current_user = get_current_user()
        if not is_admin(current_user):
            return jsonify({"message": "Admin privileges required"}), 403
        return func(*args, **kwargs)

    return wrapper


def add_only(func):
    """Applied to PUT (edit) handlers on add-only ("transactional") resources.
    Guarantees the 405 holds no matter what the frontend sends, per the plan's
    full-CRUD-vs-add-only rule enforced at the API layer, not just the UI."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        return jsonify({"message": "Editing is not permitted for this resource"}), 405

    return wrapper


def handle_integrity_error(exc, duplicates=None):
    from extensions import db
    db.session.rollback()
    orig = str(exc.orig).lower() if getattr(exc, "orig", None) else str(exc).lower()
    if duplicates:
        for key, message in duplicates.items():
            if key in orig:
                return jsonify({"message": message}), 409
    return jsonify({"message": "Database integrity error"}), 400


def parse_date(value):
    from datetime import date
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def fetch_or_404(model, item_id, id_name="id"):
    if item_id is None:
        return None, (jsonify({"message": f"{id_name} is required"}), 400)
    try:
        item_id = int(item_id)
    except (TypeError, ValueError):
        return None, (jsonify({"message": f"Invalid {id_name}"}), 400)
    item = model.query.get(item_id)
    if not item:
        return None, (jsonify({"message": f"{model.__name__} not found for the provided id"}), 404)
    return item, None


def register_crud_blueprint(
    name,
    model,
    create_fields,
    search_fields=None,
    update_fields=None,
    editable=True,
    deletable=True,
    admin_only=True,
    allowed_roles=None,
    url_prefix_singular=None,
    on_create=None,
    serialize=None,
):
    """Factory that builds a Blueprint exposing GET (list) / GET (detail) /
    POST (create) / PUT (edit, only if `editable`) / DELETE (soft-delete
    via is_active=False, only if `deletable`) for a model, following the
    exact response shape and conventions used by master.py / role.py.

    Used for both Master Control (full CRUD, editable=True) and add-only
    module lists (editable=False) so the CRUD-shape isn't re-implemented
    per blueprint file — only the field lists/business hooks differ.
    """
    from extensions import db

    bp = __import__("flask").Blueprint(name, __name__)
    url = name if url_prefix_singular is None else url_prefix_singular
    search_fields = search_fields or []
    update_fields = update_fields if update_fields is not None else create_fields
    serialize = serialize or (lambda item: item.to_dict())

    def _guard():
        user = get_current_user()
        if allowed_roles is not None:
            if not user or user.role not in allowed_roles:
                return jsonify({"message": "You do not have permission to access this resource"}), 403
            return None
        if not admin_only:
            return None
        if not is_admin(user):
            return jsonify({"message": "Admin privileges required"}), 403
        return None

    @jwt_required()
    @with_token
    def list_items(token_response):
        guard = _guard()
        if guard:
            return guard
        query = model.query
        if search_fields:
            query = apply_search_filters(query, request.args, search_fields)
        if request.args.get("is_active") is not None and hasattr(model, "is_active"):
            query = query.filter(model.is_active == (request.args.get("is_active").lower() in {"true", "1", "yes"}))
        return jsonify({
            "message": f"{model.__name__} list fetched",
            "data": paginate_query(query, request.args),
            "token_response": token_response,
        }), 200

    @jwt_required()
    @with_token
    def get_item(item_id, token_response):
        item, error_response = fetch_or_404(model, item_id)
        if error_response:
            return error_response
        return jsonify({"message": f"{model.__name__} fetched", "data": serialize(item), "token_response": token_response}), 200

    @jwt_required()
    @with_token
    def create_item(token_response):
        guard = _guard()
        if guard:
            return guard
        data = request.json or {}
        payload = {field: data.get(field) for field in create_fields if field in data}
        item = model(**payload)
        if on_create:
            hook_response = on_create(item, data)
            if hook_response is not None:
                return hook_response
        db.session.add(item)
        try:
            db.session.commit()
        except IntegrityError as exc:
            return handle_integrity_error(exc)
        return jsonify({"message": f"{model.__name__} created", "data": serialize(item), "token_response": token_response}), 201

    @jwt_required()
    @with_token
    def update_item(item_id, token_response):
        if not editable:
            return jsonify({"message": "Editing is not permitted for this resource"}), 405
        guard = _guard()
        if guard:
            return guard
        item, error_response = fetch_or_404(model, item_id)
        if error_response:
            return error_response
        data = request.json or {}
        for field in update_fields:
            if field in data:
                setattr(item, field, data[field])
        try:
            db.session.commit()
        except IntegrityError as exc:
            return handle_integrity_error(exc)
        return jsonify({"message": f"{model.__name__} updated", "data": serialize(item), "token_response": token_response}), 200

    @jwt_required()
    @with_token
    def delete_item(item_id, token_response):
        if not deletable:
            return jsonify({"message": "Deleting is not permitted for this resource"}), 405
        guard = _guard()
        if guard:
            return guard
        item, error_response = fetch_or_404(model, item_id)
        if error_response:
            return error_response
        item.is_active = False
        db.session.commit()
        return jsonify({"message": f"{model.__name__} deactivated", "token_response": token_response}), 200

    bp.add_url_rule(f"/{url}", f"list_{name}", list_items, methods=["GET"])
    bp.add_url_rule(f"/{url}/<int:item_id>", f"get_{name}", get_item, methods=["GET"])
    bp.add_url_rule(f"/{url}", f"create_{name}", create_item, methods=["POST"])
    bp.add_url_rule(f"/{url}/<int:item_id>", f"update_{name}", update_item, methods=["PUT"])
    bp.add_url_rule(f"/{url}/<int:item_id>", f"delete_{name}", delete_item, methods=["DELETE"])
    return bp
