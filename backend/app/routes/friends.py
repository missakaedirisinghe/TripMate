"""
Friendship Management Blueprint

CRUD operations for tracking friends, sending requests, and accepting requests.
"""

from flask import Blueprint, jsonify, request
from sqlalchemy import or_, and_

from app import db, mail, socketio
from app.middleware import token_required
from app.models import Friendship, User
from app.email_service import send_friend_request_email

friends_bp = Blueprint("friends", __name__)


@friends_bp.route("", methods=["GET"])
@token_required
def get_friendships(current_user):
    """List all friendships (pending and accepted).

    Returns:
        200: List of friendships categorized.
    """
    friendships = Friendship.query.filter(
        or_(Friendship.user_id == current_user.id, Friendship.friend_id == current_user.id)
    ).all()

    friends_list = []
    pending_sent = []
    pending_received = []

    for f in friendships:
        data = f.to_dict()
        
        if f.user_id == current_user.id:
            other_user = f.friend
            if f.status == "accepted":
                friends_list.append({"id": f.id, "user": {"id": other_user.id, "name": other_user.name, "email": other_user.email}, "status": "accepted"})
            else:
                pending_sent.append({"id": f.id, "user": {"id": other_user.id, "name": other_user.name, "email": other_user.email}, "status": "pending"})
        else:
            other_user = f.user
            if f.status == "accepted":
                friends_list.append({"id": f.id, "user": {"id": other_user.id, "name": other_user.name, "email": other_user.email}, "status": "accepted"})
            else:
                pending_received.append({"id": f.id, "user": {"id": other_user.id, "name": other_user.name, "email": other_user.email}, "status": "pending"})

    return jsonify({
        "friends": friends_list,
        "pending_sent": pending_sent,
        "pending_received": pending_received
    }), 200


@friends_bp.route("/request", methods=["POST"])
@token_required
def send_request(current_user):
    """Send a friend request to a user by email.

    Request Body:
        email (str): Email of the friend
    """
    data = request.get_json()
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    if email == current_user.email:
        return jsonify({"error": "Cannot friend yourself"}), 400

    target = User.query.filter_by(email=email).first()
    if not target:
        return jsonify({"error": "User with this email not found"}), 404

    existing = Friendship.query.filter(
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == target.id),
            and_(Friendship.user_id == target.id, Friendship.friend_id == current_user.id)
        )
    ).first()

    if existing:
        return jsonify({"error": f"Friendship already exists or is pending"}), 409

    f = Friendship(user_id=current_user.id, friend_id=target.id, status="pending")
    db.session.add(f)
    db.session.commit()

    socketio.emit(
        "social_update",
        {"action": "friend_request", "user_id": current_user.id, "user_name": current_user.name},
        to=f"user_{target.id}",
    )

    send_friend_request_email(
        mail=mail,
        to_email=target.email,
        to_name=target.name,
        from_name=current_user.name,
    )

    return jsonify({"message": "Friend request sent!", "friendship": f.to_dict()}), 201


@friends_bp.route("/accept/<friendship_id>", methods=["PUT"])
@token_required
def accept_request(current_user, friendship_id):
    """Accept an incoming friend request."""
    f = Friendship.query.get_or_404(friendship_id)

    if f.friend_id != current_user.id:
        return jsonify({"error": "Not authorized to accept this request"}), 403

    f.status = "accepted"
    db.session.commit()

    socketio.emit(
        "social_update",
        {"action": "friend_accepted", "user_id": current_user.id, "user_name": current_user.name},
        to=f"user_{f.user_id}",
    )

    return jsonify({"message": "Friend request accepted"}), 200

@friends_bp.route("/<friendship_id>", methods=["DELETE"])
@token_required
def remove_friend(current_user, friendship_id):
    """Remove a friend or cancel a request."""
    f = Friendship.query.get_or_404(friendship_id)

    if f.user_id != current_user.id and f.friend_id != current_user.id:
        return jsonify({"error": "Not authorized"}), 403

    db.session.delete(f)
    db.session.commit()

    return jsonify({"message": "Friendship removed"}), 200
