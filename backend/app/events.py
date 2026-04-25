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

    active_connections = {}

    @socketio.on("connect")
    def handle_connect(auth=None):
        """Authenticate the WebSocket connection via JWT."""
        from flask import request
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
            
            active_connections[request.sid] = user.id

            from flask_socketio import join_room, emit
            join_room(f"user_{user.id}")

            from app.models import Friendship
            from sqlalchemy import or_
            friendships = Friendship.query.filter(
                (Friendship.status == 'accepted') &
                or_(Friendship.user_id == user.id, Friendship.friend_id == user.id)
            ).all()

            for f in friendships:
                friend_id = f.friend_id if f.user_id == user.id else f.user_id
                emit("friend_presence", {"user_id": user.id, "status": "online"}, to=f"user_{friend_id}")

        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return False   

    @socketio.on("join_trip")
    def handle_join_trip(data):
        """Join a trip's WebSocket room for live updates."""
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
        """Leave a trip's WebSocket room."""
        trip_id = data.get("trip_id")
        if trip_id:
            from flask_socketio import leave_room
            leave_room(f"trip_{trip_id}")

    @socketio.on("disconnect")
    def handle_disconnect():
        """Handle client disconnection."""
        from flask import request
        user_id = active_connections.pop(request.sid, None)
        if user_id:
            if user_id not in active_connections.values():
                from flask_socketio import emit
                from app.models import Friendship
                from sqlalchemy import or_
                friendships = Friendship.query.filter(
                    (Friendship.status == 'accepted') &
                    or_(Friendship.user_id == user_id, Friendship.friend_id == user_id)
                ).all()

                for f in friendships:
                    friend_id = f.friend_id if f.user_id == user_id else f.user_id
                    emit("friend_presence", {"user_id": user_id, "status": "offline"}, to=f"user_{friend_id}")
            
    @socketio.on("get_online_friends")
    def handle_get_online_friends():
        """Return a list of currently online friends to the caller."""
        from flask import request
        from flask_socketio import emit
        user_id = active_connections.get(request.sid)
        if not user_id:
            return
            
        from app.models import Friendship
        from sqlalchemy import or_
        friendships = Friendship.query.filter(
            (Friendship.status == 'accepted') &
            or_(Friendship.user_id == user_id, Friendship.friend_id == user_id)
        ).all()

        online_friends = []
        for f in friendships:
            friend_id = f.friend_id if f.user_id == user_id else f.user_id
            if friend_id in active_connections.values():
                online_friends.append(friend_id)
                
        emit("online_friends_list", {"online_user_ids": online_friends})



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
