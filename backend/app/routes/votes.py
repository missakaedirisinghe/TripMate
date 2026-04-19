"""
Voting Blueprint

Group decision-making through votes on destinations, routes, and activities.
Emits real-time events via Socket.IO and creates notifications.
"""

from flask import Blueprint, jsonify, request

from app import db, socketio
from app.middleware import token_required, trip_member_required
from app.models import Vote
from app.notifications import notify_trip_members

votes_bp = Blueprint("votes", __name__)


@votes_bp.route("/<trip_id>/votes", methods=["POST"])
@token_required
@trip_member_required
def cast_vote(trip_id, current_user, membership):
    """Cast a vote for a destination, route, or activity.

    Request Body:
        vote_type (str): destination/route/activity/accommodation
        target_id (str): Identifier of what is being voted on
        target_value (str, optional): Human-readable label

    Returns:
        201: Vote cast
        409: Already voted for this item
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    vote_type = data.get("vote_type", "").strip()
    target_id = data.get("target_id", "").strip()

    if not vote_type or not target_id:
        return jsonify({"error": "vote_type and target_id are required"}), 400

    valid_types = ("destination", "route", "activity", "accommodation")
    if vote_type not in valid_types:
        return jsonify({"error": f"vote_type must be one of: {', '.join(valid_types)}"}), 400

    # Check duplicate vote
    existing = Vote.query.filter_by(
        trip_id=trip_id,
        user_id=current_user.id,
        vote_type=vote_type,
        target_id=target_id,
    ).first()

    if existing:
        return jsonify({"error": "You have already voted for this item"}), 409

    vote = Vote(
        trip_id=trip_id,
        user_id=current_user.id,
        vote_type=vote_type,
        target_id=target_id,
        target_value=data.get("target_value"),
    )
    db.session.add(vote)

    # Notify trip members
    target_label = data.get("target_value") or target_id
    notify_trip_members(
        trip_id=trip_id,
        notification_type="vote_cast",
        title="New Vote",
        message=f"{current_user.name} voted for '{target_label}' ({vote_type})",
        exclude_user_id=current_user.id,
        data={"vote_type": vote_type, "target_value": target_label},
    )

    db.session.commit()

    # Emit real-time event
    socketio.emit(
        "vote_updated",
        {"action": "vote_cast", "vote": vote.to_dict(), "user_name": current_user.name},
        to=f"trip_{trip_id}",
    )

    return jsonify({"message": "Vote cast", "vote": vote.to_dict()}), 201


@votes_bp.route("/<trip_id>/votes", methods=["GET"])
@token_required
@trip_member_required
def get_votes(trip_id, current_user, membership):
    """Get vote tallies for a trip, grouped by vote type and target.

    Query Parameters:
        vote_type (str, optional): Filter by type

    Returns:
        200: Vote tallies and individual votes
    """
    vote_type_filter = request.args.get("vote_type")

    query = Vote.query.filter_by(trip_id=trip_id)
    if vote_type_filter:
        query = query.filter_by(vote_type=vote_type_filter)

    votes = query.all()

    # Build tallies
    tallies = {}
    for vote in votes:
        key = f"{vote.vote_type}:{vote.target_id}"
        if key not in tallies:
            tallies[key] = {
                "vote_type": vote.vote_type,
                "target_id": vote.target_id,
                "target_value": vote.target_value,
                "count": 0,
                "voters": [],
            }
        tallies[key]["count"] += 1
        tallies[key]["voters"].append({
            "user_id": vote.user_id,
            "voter_name": vote.voter.name if vote.voter else None,
        })

    # Sort by count descending
    sorted_tallies = sorted(tallies.values(), key=lambda x: x["count"], reverse=True)

    return jsonify({
        "tallies": sorted_tallies,
        "total_votes": len(votes),
    }), 200


@votes_bp.route("/<trip_id>/votes/<vote_id>", methods=["DELETE"])
@token_required
@trip_member_required
def retract_vote(trip_id, current_user, membership, vote_id):
    """Retract your own vote.

    Returns:
        200: Vote retracted
        403: Cannot retract others' votes
    """
    vote = Vote.query.filter_by(id=vote_id, trip_id=trip_id).first_or_404()

    if vote.user_id != current_user.id:
        return jsonify({"error": "You can only retract your own votes"}), 403

    db.session.delete(vote)
    db.session.commit()

    # Emit real-time event
    socketio.emit(
        "vote_updated",
        {"action": "vote_retracted", "vote_id": vote_id, "user_name": current_user.name},
        to=f"trip_{trip_id}",
    )

    return jsonify({"message": "Vote retracted"}), 200
