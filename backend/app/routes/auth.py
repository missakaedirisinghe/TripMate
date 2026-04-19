"""
Authentication Blueprint

Handles user registration, login, and profile management via JWT tokens.
Automatically processes pending trip invitations on registration.
"""

from datetime import datetime, timedelta, timezone

import jwt
from flask import Blueprint, current_app, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from app import db
from app.middleware import token_required
from app.models import PendingInvite, TripMember, User
from app.notifications import create_notification

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user account.

    Automatically accepts any pending trip invitations for the user's email.
    Supports an optional `invite` query parameter containing an invite token.

    Request Body:
        name (str): Full name
        email (str): Email address (must be unique)
        password (str): Password (min 6 characters)

    Returns:
        201: User created with JWT token
        400: Validation error
        409: Email already exists
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    # Validation
    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    if "@" not in email or "." not in email:
        return jsonify({"error": "Invalid email format"}), 400

    # Check duplicate
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    # Create user
    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
    )
    db.session.add(user)
    db.session.flush()  # Get user.id before commit

    # Process pending invitations for this email
    pending_invites = PendingInvite.query.filter_by(
        email=email, accepted=False
    ).all()

    accepted_trips = []
    now = datetime.now(timezone.utc)

    for invite in pending_invites:
        if invite.expires_at < now:
            continue  # Skip expired invites

        # Check if not already a member (edge case)
        existing = TripMember.query.filter_by(
            trip_id=invite.trip_id, user_id=user.id
        ).first()
        if existing:
            invite.accepted = True
            continue

        # Add user to the trip
        member = TripMember(
            trip_id=invite.trip_id,
            user_id=user.id,
            role=invite.role,
        )
        db.session.add(member)

        # Mark invite as accepted
        invite.accepted = True

        # Create notification
        trip_title = invite.trip.title if invite.trip else "a trip"
        inviter_name = invite.inviter.name if invite.inviter else "Someone"
        create_notification(
            user_id=user.id,
            notification_type="invite",
            title="Trip Invitation Accepted",
            message=f"You've been added to '{trip_title}' (invited by {inviter_name})",
            trip_id=invite.trip_id,
            data={"trip_title": trip_title, "inviter_name": inviter_name},
        )
        accepted_trips.append(trip_title)

    db.session.commit()

    # Generate token
    token = _generate_token(user)

    response_data = {
        "message": "Account created successfully",
        "token": token,
        "user": user.to_dict(),
    }

    if accepted_trips:
        response_data["accepted_invites"] = accepted_trips
        response_data["message"] += f" — you've been added to {len(accepted_trips)} trip(s)!"

    return jsonify(response_data), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate user and return JWT token.

    Request Body:
        email (str): Email address
        password (str): Password

    Returns:
        200: JWT token + user data
        400: Missing fields
        401: Invalid credentials
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if user is None or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = _generate_token(user)

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": user.to_dict(),
    }), 200


@auth_bp.route("/me", methods=["GET"])
@token_required
def get_profile(current_user):
    """Get the authenticated user's profile.

    Returns:
        200: User profile including preferences
    """
    return jsonify({"user": current_user.to_dict(include_preferences=True)}), 200


@auth_bp.route("/me", methods=["PUT"])
@token_required
def update_profile(current_user):
    """Update the authenticated user's profile.

    Request Body (all optional):
        name (str): Full name
        avatar_url (str): Avatar image URL
        preferred_activities (list): Activity preferences
        bucket_list (list): Bucket list destinations

    Returns:
        200: Updated user profile
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    if "name" in data:
        current_user.name = data["name"].strip()
    if "avatar_url" in data:
        current_user.avatar_url = data["avatar_url"]
    if "preferred_activities" in data:
        current_user.preferred_activities = data["preferred_activities"]
    if "bucket_list" in data:
        current_user.bucket_list = data["bucket_list"]

    db.session.commit()

    return jsonify({
        "message": "Profile updated",
        "user": current_user.to_dict(include_preferences=True),
    }), 200


def _generate_token(user):
    """Generate a JWT token for the given user."""
    expiry_hours = current_app.config.get("JWT_EXPIRATION_HOURS", 24)
    payload = {
        "user_id": user.id,
        "email": user.email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=expiry_hours),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(
        payload,
        current_app.config["SECRET_KEY"],
        algorithm=current_app.config.get("JWT_ALGORITHM", "HS256"),
    )
