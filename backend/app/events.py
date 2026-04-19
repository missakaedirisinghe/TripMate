"""
Socket.IO Event Handlers

Manages WebSocket connections for real-time collaboration.
Each trip has its own room. Members join/leave rooms as they
navigate to/from the trip workspace.
"""

import jwt
from flask import current_app

from app.models import TripMember, User


def register_socket_events(socketio):
    """Register all Socket.IO event handlers.

    Args:
        socketio: Flask-SocketIO instance.
    """

    @socketio.on("connect")
    def handle_connect(auth=None):
        """Authenticate the WebSocket connection via JWT."""
        # Auth data is passed from the client on connect
        if not auth or "token" not in auth:
            return False  # Reject connection

        try:
            payload = jwt.decode(
                auth["token"],
                current_app.config["SECRET_KEY"],
                algorithms=[current_app.config.get("JWT_ALGORITHM", "HS256")],
            )
            from app import db
            user = db.session.get(User, payload.get("user_id"))
            if user is None:
                return False
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return False

    @socketio.on("join_trip")
    def handle_join_trip(data):
        """Join a trip's WebSocket room for live updates.

        Args:
            data: Dict with 'trip_id' and 'token' keys.
        """
        trip_id = data.get("trip_id")
        token = data.get("token")

        if not trip_id or not token:
            return

        try:
            payload = jwt.decode(
                token,
                current_app.config["SECRET_KEY"],
                algorithms=[current_app.config.get("JWT_ALGORITHM", "HS256")],
            )
            user_id = payload.get("user_id")

            # Verify membership
            membership = TripMember.query.filter_by(
                trip_id=trip_id, user_id=user_id
            ).first()

            if not membership:
                return

            from flask_socketio import join_room, emit
            join_room(f"trip_{trip_id}")

            user = User.query.get(user_id)
            emit(
                "user_joined",
                {"user_id": user_id, "user_name": user.name if user else "Unknown"},
                to=f"trip_{trip_id}",
                include_self=False,
            )
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return

    @socketio.on("leave_trip")
    def handle_leave_trip(data):
        """Leave a trip's WebSocket room.

        Args:
            data: Dict with 'trip_id' key.
        """
        trip_id = data.get("trip_id")
        if trip_id:
            from flask_socketio import leave_room
            leave_room(f"trip_{trip_id}")

    @socketio.on("disconnect")
    def handle_disconnect():
        """Handle client disconnection."""
        pass


def emit_trip_event(socketio, trip_id, event_type, data, skip_sid=None):
    """Emit a real-time event to all members in a trip room.

    Args:
        socketio: Flask-SocketIO instance.
        trip_id: Trip ID for the room.
        event_type: Event name (e.g., 'itinerary_updated').
        data: Event payload.
        skip_sid: Optional session ID to exclude from broadcast.
    """
    socketio.emit(
        event_type,
        data,
        to=f"trip_{trip_id}",
        skip_sid=skip_sid,
    )
