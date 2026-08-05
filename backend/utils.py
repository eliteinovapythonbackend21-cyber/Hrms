import cloudinary.uploader
from werkzeug.security import check_password_hash, generate_password_hash
from sqlalchemy import or_


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
    if not file or file.filename == "":
        return None

    if not allowed_file_extension(file.filename, allowed_extensions):
        raise ValueError("File type not allowed")

    result = cloudinary.uploader.upload(file, folder="hrms/profile_pictures")

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
