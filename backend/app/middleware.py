"""
JWT Authentication Middleware

Provides decorators for route protection and trip membership verification.
"""

from functools import wraps

import jwt
from flask import current_app, jsonify, request

from app.models import TripMember, User


def token_required(f):
    """Decorator that validates JWT from Authorization header.

    Attaches the authenticated user to kwargs as 'current_user'.
    """

    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get("Authorization", "")

        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

        if not token:
            return jsonify({"error": "Authentication token is missing"}), 401

        try:
            from app import db

            payload = jwt.decode(
                token,
                current_app.config["SECRET_KEY"],
                algorithms=[current_app.config.get("JWT_ALGORITHM", "HS256")],
            )
            user = db.session.get(User, payload.get("user_id"))
            if user is None:
                return jsonify({"error": "User not found"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, current_user=user, **kwargs)

    return decorated


def trip_member_required(f):
    """Decorator that ensures authenticated user belongs to the trip.

    Must be used AFTER @token_required. Expects 'trip_id' in the route
    parameters and 'current_user' in kwargs.
    """

    @wraps(f)
    def decorated(*args, **kwargs):
        current_user = kwargs.get("current_user")
        trip_id = kwargs.get("trip_id")

        if not current_user or not trip_id:
            return jsonify({"error": "Unauthorized"}), 401

        membership = TripMember.query.filter_by(
            trip_id=trip_id, user_id=current_user.id
        ).first()

        if membership is None:
            return jsonify({"error": "You are not a member of this trip"}), 403

        kwargs["membership"] = membership
        return f(*args, **kwargs)

    return decorated
