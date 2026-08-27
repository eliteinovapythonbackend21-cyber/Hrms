from datetime import datetime, timedelta, timezone
import secrets

from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import (
    get_jwt,
    get_jwt_identity,
    jwt_required,
)

from extensions import db
from models import BaseUser
from utils import (
    hash_password,
    verify_password,
    send_otp_email,
    with_token,
)


auth_bp = Blueprint("auth_bp", __name__)

# ============================================================
# OTP CONFIGURATION
# ============================================================

OTP_LENGTH = 6
OTP_TTL_MINUTES_DEFAULT = 10


# ============================================================
# INTERNAL HELPERS
# ============================================================

def _generate_otp():
    """
    Cryptographically secure 6-digit numeric OTP.
    """
    return "".join(
        secrets.choice("0123456789")
        for _ in range(OTP_LENGTH)
    )


def _fetch_user(user_id):
    """
    Fetch a BaseUser by primary key.
    Returns:
        (user, None) on success
        (None, (jsonify(...), status_code)) on failure
    """
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None, (
            jsonify({"message": "Invalid user id"}),
            400,
        )

    user = BaseUser.query.get(user_id)

    if not user:
        return None, (
            jsonify({"message": "User not found"}),
            404,
        )

    return user, None


# ============================================================
# FORGOT PASSWORD
# ============================================================

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """
    Generate and send an OTP to the email registered against
    the user's HRMS account.

    SMTP_USER / SMTP_FROM are only the sender credentials.
    user.email is always the OTP recipient.
    """

    data = request.get_json(silent=True) or {}

    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({
            "message": "email is required"
        }), 400

    user = BaseUser.query.filter_by(
        email=email
    ).first()

    # Generic response prevents account enumeration.
    generic_response = jsonify({
        "message": (
            "If an account exists for this email, "
            "an OTP has been sent."
        )
    })

    # Do not reveal whether the email exists.
    if not user or not user.is_active:
        return generic_response, 200

    otp_code = _generate_otp()

    try:
        # IMPORTANT:
        # The SMTP account is the sender.
        # user.email is the registered recipient.
        send_otp_email(
            recipient_email=user.email,
            otp_code=otp_code,
        )

    except Exception as exc:
        import traceback

        print("========== OTP EMAIL ERROR ==========")
        print("Recipient:", user.email)
        print("Error:", repr(exc))
        traceback.print_exc()
        print("=====================================")

        db.session.rollback()

        return jsonify({
            "message": (
                "Failed to send OTP email. "
                "Please try again later."
            )
        }), 502

    # Read the OTP expiry from application config.
    otp_ttl_minutes = current_app.config.get(
        "OTP_EXPIRES_MINUTES",
        OTP_TTL_MINUTES_DEFAULT,
    )

    try:
        otp_ttl_minutes = int(otp_ttl_minutes)
    except (TypeError, ValueError):
        otp_ttl_minutes = OTP_TTL_MINUTES_DEFAULT

    # Store the OTP only after the email has been accepted
    # successfully by the SMTP server.
    user.otp = hash_password(otp_code)

    user.otp_expires_at = (
        datetime.now(timezone.utc)
        + timedelta(minutes=otp_ttl_minutes)
    )

    user.smtp_verified = False

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()

        return jsonify({
            "message": (
                "OTP was sent, but the verification state "
                "could not be saved. Please request a new OTP."
            )
        }), 500

    return generic_response, 200


# ============================================================
# VERIFY OTP
# ============================================================

@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json(silent=True) or {}

    email = (data.get("email") or "").strip().lower()
    otp = str(data.get("otp") or "").strip()

    if not email or not otp:
        return jsonify({
            "message": "email and otp are required"
        }), 400

    if not otp.isdigit() or len(otp) != OTP_LENGTH:
        return jsonify({
            "message": "Invalid OTP"
        }), 400

    user = BaseUser.query.filter_by(
        email=email
    ).first()

    if not user:
        return jsonify({
            "message": "Invalid or expired OTP"
        }), 400

    if not user.otp or not user.otp_expires_at:
        return jsonify({
            "message": "Invalid or expired OTP"
        }), 400

    expires_at = user.otp_expires_at

    # Normalize a naive database datetime to UTC.
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(
            tzinfo=timezone.utc
        )

    if datetime.now(timezone.utc) > expires_at:
        return jsonify({
            "message": (
                "OTP has expired. "
                "Please request a new one."
            )
        }), 400

    if not verify_password(otp, user.otp):
        return jsonify({
            "message": "Invalid OTP"
        }), 400

    user.smtp_verified = True

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()

        return jsonify({
            "message": "Failed to save OTP verification"
        }), 500

    return jsonify({
        "message": (
            "OTP verified. "
            "You may now reset your password."
        )
    }), 200


# ============================================================
# RESET PASSWORD
# ============================================================

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json(silent=True) or {}

    email = (data.get("email") or "").strip().lower()
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")

    if not email or not new_password or not confirm_password:
        return jsonify({
            "message": (
                "email, new_password and "
                "confirm_password are required"
            )
        }), 400

    if new_password != confirm_password:
        return jsonify({
            "message": (
                "new_password and "
                "confirm_password do not match"
            )
        }), 400

    if len(new_password) < 6:
        return jsonify({
            "message": (
                "password must be at least 6 characters"
            )
        }), 400

    user = BaseUser.query.filter_by(
        email=email
    ).first()

    if not user:
        return jsonify({
            "message": "User not found"
        }), 404

    if not user.smtp_verified:
        return jsonify({
            "message": (
                "OTP verification is required "
                "before resetting the password"
            )
        }), 403

    user.password = hash_password(
        new_password
    )

    # Consume the OTP so it cannot be reused.
    user.otp = None
    user.otp_expires_at = None
    user.smtp_verified = False

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()

        return jsonify({
            "message": "Failed to reset password"
        }), 500

    return jsonify({
        "message": "Password reset successfully"
    }), 200


# ============================================================
# CHANGE PASSWORD
# ============================================================

@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
@with_token
def change_password(token_response):
    data = request.get_json(silent=True) or {}

    current_password = data.get("current_password")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")

    if (
        not current_password
        or not new_password
        or not confirm_password
    ):
        return jsonify({
            "message": (
                "current_password, new_password and "
                "confirm_password are required"
            )
        }), 400

    if new_password != confirm_password:
        return jsonify({
            "message": (
                "new_password and "
                "confirm_password do not match"
            )
        }), 400

    if len(new_password) < 6:
        return jsonify({
            "message": (
                "password must be at least 6 characters"
            )
        }), 400

    current_user_id = int(
        get_jwt_identity()
    )

    user, error_response = _fetch_user(
        current_user_id
    )

    if error_response:
        return error_response

    if not user.is_active:
        return jsonify({
            "message": "User account is inactive"
        }), 403

    if not verify_password(
        current_password,
        user.password,
    ):
        return jsonify({
            "message": "Current password is incorrect"
        }), 401

    if verify_password(
        new_password,
        user.password,
    ):
        return jsonify({
            "message": (
                "New password must be different "
                "from the current password"
            )
        }), 400

    user.password = hash_password(
        new_password
    )

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()

        return jsonify({
            "message": "Failed to change password"
        }), 500

    return jsonify({
        "message": "Password changed successfully",
        "token_response": token_response,
    }), 200