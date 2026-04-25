"""
Chat Blueprint

Real-time group chat within trip workspaces. Provides paginated message
history and new message creation with Socket.IO broadcast.
"""

from flask import Blueprint, jsonify, request

from app import db, socketio
from app.middleware import token_required
from app.models import ChatMessage, TripMember

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/<trip_id>/chat", methods=["GET"])
@token_required
def get_messages(current_user, trip_id):
    """Get paginated chat messages for a trip.

    Query Parameters:
        page (int): Page number (default 1)
        per_page (int): Messages per page (default 50)

    Returns:
        200: Paginated message history (newest first)
        403: Not a trip member
    """
    membership = TripMember.query.filter_by(
        trip_id=trip_id, user_id=current_user.id
    ).first()
    if not membership:
        return jsonify({"error": "Not a member of this trip"}), 403

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)

    pagination = (
        ChatMessage.query.filter_by(trip_id=trip_id)
        .order_by(ChatMessage.created_at.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    messages = [m.to_dict() for m in reversed(pagination.items)]

    return jsonify({
        "messages": messages,
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "has_more": pagination.has_prev,  # Older messages exist
    }), 200


@chat_bp.route("/<trip_id>/chat", methods=["POST"])
@token_required
def send_message(current_user, trip_id):
    """Send a chat message to the trip workspace.

    Request Body:
        message (str): The message text content

    Returns:
        201: Message created and broadcasted via Socket.IO
        400: Missing message content
        403: Not a trip member
    """
    membership = TripMember.query.filter_by(
        trip_id=trip_id, user_id=current_user.id
    ).first()
    if not membership:
        return jsonify({"error": "Not a member of this trip"}), 403

    data = request.get_json()
    if not data or not data.get("message", "").strip():
        return jsonify({"error": "Message content is required"}), 400

    msg = ChatMessage(
        trip_id=trip_id,
        user_id=current_user.id,
        message=data["message"].strip(),
    )
    db.session.add(msg)
    db.session.commit()

    msg_dict = msg.to_dict()

    socketio.emit(
        "chat_message",
        {"message": msg_dict, "trip_id": trip_id},
        room=f"trip_{trip_id}",
    )

    return jsonify({"message": msg_dict}), 201
