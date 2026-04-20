"""
Trip Management Blueprint

CRUD operations for trips, member management, and email invitations.
Emits real-time events via Socket.IO and creates notifications.
"""

import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, jsonify, request

from app import db, mail, socketio
from app.email_service import send_trip_invite_email
from app.middleware import token_required, trip_member_required
from app.models import PendingInvite, Trip, TripMember, User
from app.notifications import create_notification, notify_trip_members

trips_bp = Blueprint("trips", __name__)


@trips_bp.route("", methods=["GET"])
@token_required
def list_trips(current_user):
    """List all trips the user is a member of.

    Returns:
        200: List of trips with member count and budget summary
    """
    memberships = TripMember.query.filter_by(user_id=current_user.id).all()
    trip_ids = [m.trip_id for m in memberships]
    trips = Trip.query.filter(Trip.id.in_(trip_ids)).order_by(Trip.created_at.desc()).all()

    return jsonify({
        "trips": [t.to_dict(include_members=True, include_budget=True) for t in trips]
    }), 200


@trips_bp.route("", methods=["POST"])
@token_required
def create_trip(current_user):
    """Create a new trip and add creator as owner.

    Request Body:
        title (str): Trip name
        destination (str): Primary destination
        description (str, optional): Trip description
        start_date (str, optional): ISO date
        end_date (str, optional): ISO date
        budget_limit (float, optional): Max budget in LKR
        trip_type (str, optional): beach/cultural/adventure/wildlife

    Returns:
        201: Created trip
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    title = data.get("title", "").strip()
    destination = data.get("destination", "").strip()

    if not title or not destination:
        return jsonify({"error": "Title and destination are required"}), 400

    from datetime import date

    trip = Trip(
        title=title,
        destination=destination,
        description=data.get("description"),
        start_date=date.fromisoformat(data["start_date"]) if data.get("start_date") else None,
        end_date=date.fromisoformat(data["end_date"]) if data.get("end_date") else None,
        budget_limit=data.get("budget_limit"),
        trip_type=data.get("trip_type"),
        creator_id=current_user.id,
    )
    db.session.add(trip)
    db.session.flush()

    # Add creator as owner member
    member = TripMember(trip_id=trip.id, user_id=current_user.id, role="owner")
    db.session.add(member)
    
    # Process invited friends immediately 
    invited_friends = data.get("invited_friends", [])
    if isinstance(invited_friends, list):
        for friend_id in invited_friends:
            f_member = TripMember(trip_id=trip.id, user_id=friend_id, role="member")
            db.session.add(f_member)
            
            # Send notification
            create_notification(
                user_id=friend_id,
                notification_type="invite",
                title="Trip Invitation",
                message=f"{current_user.name} added you to '{trip.title}'",
                trip_id=trip.id,
                data={"inviter_name": current_user.name, "trip_title": trip.title},
            )

    db.session.commit()

    # Pre-calculate budgets and fetch members for the return object
    return jsonify({
        "message": "Trip created",
        "trip": trip.to_dict(include_members=True, include_budget=True),
    }), 201


@trips_bp.route("/<trip_id>", methods=["GET"])
@token_required
@trip_member_required
def get_trip(trip_id, current_user, membership):
    """Get trip details.

    Returns:
        200: Trip with members and budget summary
    """
    trip = Trip.query.get_or_404(trip_id)
    return jsonify({"trip": trip.to_dict(include_members=True, include_budget=True)}), 200


@trips_bp.route("/<trip_id>", methods=["PUT"])
@token_required
@trip_member_required
def update_trip(trip_id, current_user, membership):
    """Update trip details. Only owner/admin can update.

    Returns:
        200: Updated trip
        403: Not authorized
    """
    if membership.role not in ("owner", "admin"):
        return jsonify({"error": "Only owner or admin can update the trip"}), 403

    trip = Trip.query.get_or_404(trip_id)
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    from datetime import date

    if "title" in data:
        trip.title = data["title"].strip()
    if "destination" in data:
        trip.destination = data["destination"].strip()
    if "description" in data:
        trip.description = data["description"]
    if "start_date" in data:
        trip.start_date = date.fromisoformat(data["start_date"]) if data["start_date"] else None
    if "end_date" in data:
        trip.end_date = date.fromisoformat(data["end_date"]) if data["end_date"] else None
    if "budget_limit" in data:
        trip.budget_limit = data["budget_limit"]
    if "trip_type" in data:
        trip.trip_type = data["trip_type"]
    if "status" in data and data["status"] in ("planning", "ready", "active", "completed"):
        trip.status = data["status"]

    db.session.commit()

    # Emit real-time update
    socketio.emit(
        "trip_updated",
        {"trip": trip.to_dict(include_members=True, include_budget=True)},
        to=f"trip_{trip_id}",
    )

    return jsonify({
        "message": "Trip updated",
        "trip": trip.to_dict(include_members=True, include_budget=True),
    }), 200


@trips_bp.route("/<trip_id>", methods=["DELETE"])
@token_required
@trip_member_required
def delete_trip(trip_id, current_user, membership):
    """Delete a trip. Only owner can delete.

    Returns:
        200: Trip deleted
        403: Not authorized
    """
    if membership.role != "owner":
        return jsonify({"error": "Only the trip owner can delete"}), 403

    trip = Trip.query.get_or_404(trip_id)
    db.session.delete(trip)
    db.session.commit()

    return jsonify({"message": "Trip deleted"}), 200


@trips_bp.route("/<trip_id>/members/<target_user_id>", methods=["DELETE"])
@token_required
@trip_member_required
def remove_member(trip_id, current_user, membership, target_user_id):
    """Remove a member from the trip.
    
    Only the trip creator/owner can do this. Cannot remove the creator.
    """
    if membership.role != "owner":
        return jsonify({"error": "Only the trip owner can remove members"}), 403

    trip = Trip.query.get_or_404(trip_id)
    if trip.creator_id == target_user_id:
        return jsonify({"error": "Cannot remove the trip creator"}), 400
        
    target_membership = TripMember.query.filter_by(trip_id=trip_id, user_id=target_user_id).first()
    if not target_membership:
        return jsonify({"error": "Member not found in trip"}), 404
        
    db.session.delete(target_membership)
    db.session.commit()
    
    # Notify sockets
    socketio.emit(
        "member_removed",
        {"user_id": target_user_id, "trip_id": trip_id},
        to=f"trip_{trip_id}",
    )
    
    return jsonify({"message": "Member removed successfully"}), 200


@trips_bp.route("/<trip_id>/invite", methods=["POST"])
@token_required
@trip_member_required
def invite_member(trip_id, current_user, membership):
    """Invite a user to the trip by email.

    If the user exists, they are added directly. If not, a pending
    email invitation is sent with a signup link.

    Request Body:
        email (str): Email of user to invite
        role (str, optional): "member" or "admin" (default: "member")

    Returns:
        201: Member added (existing user)
        202: Invitation email sent (new user)
        409: Already a member
    """
    data = request.get_json()
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    role = data.get("role", "member")
    if role not in ("member", "admin"):
        role = "member"

    trip = Trip.query.get_or_404(trip_id)
    invitee = User.query.filter_by(email=email).first()

    if invitee:
        # User exists — add directly
        existing = TripMember.query.filter_by(trip_id=trip_id, user_id=invitee.id).first()
        if existing:
            return jsonify({"error": "User is already a member of this trip"}), 409

        member = TripMember(trip_id=trip_id, user_id=invitee.id, role=role)
        db.session.add(member)

        # Create notification for the invitee
        create_notification(
            user_id=invitee.id,
            notification_type="invite",
            title="Trip Invitation",
            message=f"{current_user.name} added you to '{trip.title}'",
            trip_id=trip_id,
            data={"inviter_name": current_user.name, "trip_title": trip.title},
        )

        # Notify existing members
        notify_trip_members(
            trip_id=trip_id,
            notification_type="member_joined",
            title="New Member",
            message=f"{invitee.name} joined '{trip.title}'",
            exclude_user_id=invitee.id,
            data={"member_name": invitee.name},
        )

        db.session.commit()

        # Emit real-time event
        socketio.emit(
            "member_joined",
            {"member": member.to_dict(), "trip_id": trip_id},
            to=f"trip_{trip_id}",
        )

        return jsonify({
            "message": f"{invitee.name} has been added to the trip",
            "member": member.to_dict(),
        }), 201
    else:
        # User doesn't exist — send email invitation
        # Check if invite already pending
        existing_invite = PendingInvite.query.filter_by(
            trip_id=trip_id, email=email, accepted=False
        ).first()

        if existing_invite:
            return jsonify({"error": "An invitation has already been sent to this email"}), 409

        invite_token = secrets.token_urlsafe(32)
        frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:3000")
        signup_url = f"{frontend_url}/register?invite={invite_token}"

        pending = PendingInvite(
            trip_id=trip_id,
            email=email,
            role=role,
            token=invite_token,
            invited_by=current_user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        db.session.add(pending)
        db.session.commit()

        # Send invitation email
        email_sent = send_trip_invite_email(
            mail=mail,
            to_email=email,
            trip_title=trip.title,
            inviter_name=current_user.name,
            signup_url=signup_url,
        )

        return jsonify({
            "message": f"Invitation email sent to {email}" if email_sent
                       else f"Invitation created for {email} (email delivery may be delayed)",
            "invite": pending.to_dict(),
            "email_sent": email_sent,
        }), 202


@trips_bp.route("/<trip_id>/members", methods=["GET"])
@token_required
@trip_member_required
def list_members(trip_id, current_user, membership):
    """List all members of a trip.

    Returns:
        200: List of members
    """
    members = TripMember.query.filter_by(trip_id=trip_id).all()
    return jsonify({"members": [m.to_dict() for m in members]}), 200


@trips_bp.route("/<trip_id>/members/<user_id>", methods=["DELETE"])
@token_required
@trip_member_required
def remove_member(trip_id, current_user, membership, user_id):
    """Remove a member from the trip. Owner/admin only.

    Returns:
        200: Member removed
        403: Not authorized
    """
    if membership.role not in ("owner", "admin"):
        return jsonify({"error": "Only owner or admin can remove members"}), 403

    if user_id == current_user.id and membership.role == "owner":
        return jsonify({"error": "Owner cannot remove themselves"}), 400

    target = TripMember.query.filter_by(trip_id=trip_id, user_id=user_id).first()
    if not target:
        return jsonify({"error": "Member not found"}), 404

    removed_name = target.user.name if target.user else "Unknown"
    db.session.delete(target)
    db.session.commit()

    # Emit real-time event
    socketio.emit(
        "member_removed",
        {"user_id": user_id, "trip_id": trip_id, "removed_name": removed_name},
        to=f"trip_{trip_id}",
    )

    return jsonify({"message": "Member removed"}), 200
