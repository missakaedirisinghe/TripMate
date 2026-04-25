"""
Itinerary & Activities Blueprint

Manages days and activities within a trip itinerary.
Emits real-time events via Socket.IO and creates notifications.
"""

from datetime import date

from flask import Blueprint, jsonify, request

from app import db, socketio
from app.middleware import token_required, trip_member_required
from app.models import Activity, ItineraryDay, Trip
from app.notifications import notify_trip_members

itinerary_bp = Blueprint("itinerary", __name__)


@itinerary_bp.route("/<trip_id>/days", methods=["GET"])
@token_required
@trip_member_required
def list_days(trip_id, current_user, membership):
    """List all itinerary days with their activities.

    Returns:
        200: List of days with nested activities
    """
    days = (
        ItineraryDay.query.filter_by(trip_id=trip_id)
        .order_by(ItineraryDay.day_number)
        .all()
    )
    return jsonify({"days": [d.to_dict(include_activities=True) for d in days]}), 200


@itinerary_bp.route("/<trip_id>/days", methods=["POST"])
@token_required
@trip_member_required
def add_day(trip_id, current_user, membership):
    """Add a new day to the itinerary.

    Request Body:
        day_number (int): Day number (1-based)
        date (str, optional): ISO date string

    Returns:
        201: Created day
    """
    data = request.get_json()

    if not data or "day_number" not in data:
        return jsonify({"error": "day_number is required"}), 400

    day = ItineraryDay(
        trip_id=trip_id,
        day_number=data["day_number"],
        date=date.fromisoformat(data["date"]) if data.get("date") else None,
        order_index=data.get("order_index", data["day_number"] - 1),
    )
    db.session.add(day)

    notify_trip_members(
        trip_id=trip_id,
        notification_type="itinerary_change",
        title="Itinerary Updated",
        message=f"{current_user.name} added Day {data['day_number']}",
        exclude_user_id=current_user.id,
        data={"action": "day_added", "day_number": data["day_number"]},
    )

    db.session.commit()

    socketio.emit(
        "itinerary_updated",
        {"action": "day_added", "day": day.to_dict(), "user_name": current_user.name},
        to=f"trip_{trip_id}",
    )

    return jsonify({"message": "Day added", "day": day.to_dict()}), 201


@itinerary_bp.route("/<trip_id>/days/<day_id>", methods=["PUT"])
@token_required
@trip_member_required
def update_day(trip_id, current_user, membership, day_id):
    """Update an itinerary day.

    Returns:
        200: Updated day
    """
    day = ItineraryDay.query.filter_by(id=day_id, trip_id=trip_id).first_or_404()
    data = request.get_json()

    if "day_number" in data:
        day.day_number = data["day_number"]
    if "date" in data:
        day.date = date.fromisoformat(data["date"]) if data["date"] else None
    if "order_index" in data:
        day.order_index = data["order_index"]

    db.session.commit()

    socketio.emit(
        "itinerary_updated",
        {"action": "day_updated", "day": day.to_dict(), "user_name": current_user.name},
        to=f"trip_{trip_id}",
    )

    return jsonify({"message": "Day updated", "day": day.to_dict()}), 200


@itinerary_bp.route("/<trip_id>/days/<day_id>", methods=["DELETE"])
@token_required
@trip_member_required
def delete_day(trip_id, current_user, membership, day_id):
    """Delete an itinerary day and all its activities.

    Returns:
        200: Day deleted
    """
    day = ItineraryDay.query.filter_by(id=day_id, trip_id=trip_id).first_or_404()
    day_number = day.day_number
    db.session.delete(day)
    db.session.commit()

    socketio.emit(
        "itinerary_updated",
        {"action": "day_deleted", "day_id": day_id, "day_number": day_number, "user_name": current_user.name},
        to=f"trip_{trip_id}",
    )

    return jsonify({"message": "Day deleted"}), 200




@itinerary_bp.route("/<trip_id>/days/<day_id>/activities", methods=["POST"])
@token_required
@trip_member_required
def add_activity(trip_id, current_user, membership, day_id):
    """Add an activity to a day.

    Request Body:
        title (str): Activity name
        description (str, optional): Details
        time_slot (str, optional): morning/afternoon/evening
        category (str, optional): adventure/food/nature/cultural/transport/accommodation
        estimated_cost (float, optional): Cost in LKR
        lat (float, optional): Latitude for map marker
        lng (float, optional): Longitude for map marker

    Returns:
        201: Created activity
    """
    day = ItineraryDay.query.filter_by(id=day_id, trip_id=trip_id).first_or_404()

    data = request.get_json()
    if not data or not data.get("title"):
        return jsonify({"error": "Title is required"}), 400

    max_order = db.session.query(db.func.max(Activity.order_index)).filter_by(day_id=day_id).scalar()
    next_order = (max_order or 0) + 1

    activity = Activity(
        day_id=day_id,
        title=data["title"].strip(),
        description=data.get("description"),
        time_slot=data.get("time_slot"),
        category=data.get("category"),
        estimated_cost=data.get("estimated_cost", 0),
        lat=data.get("lat"),
        lng=data.get("lng"),
        image_url=data.get("image_url"),
        order_index=data.get("order_index", next_order),
    )
    db.session.add(activity)

    notify_trip_members(
        trip_id=trip_id,
        notification_type="itinerary_change",
        title="Activity Added",
        message=f"{current_user.name} added '{data['title'].strip()}' to Day {day.day_number}",
        exclude_user_id=current_user.id,
        data={"action": "activity_added", "activity_title": data["title"].strip()},
    )

    db.session.commit()

    socketio.emit(
        "itinerary_updated",
        {
            "action": "activity_added",
            "day_id": day_id,
            "activity": activity.to_dict(),
            "user_name": current_user.name,
        },
        to=f"trip_{trip_id}",
    )

    return jsonify({"message": "Activity added", "activity": activity.to_dict()}), 201


@itinerary_bp.route("/<trip_id>/days/<day_id>/activities/<activity_id>", methods=["PUT"])
@token_required
@trip_member_required
def update_activity(trip_id, current_user, membership, day_id, activity_id):
    """Update an activity.

    Returns:
        200: Updated activity
    """
    ItineraryDay.query.filter_by(id=day_id, trip_id=trip_id).first_or_404()
    activity = Activity.query.filter_by(id=activity_id, day_id=day_id).first_or_404()

    data = request.get_json()
    if "title" in data:
        activity.title = data["title"].strip()
    if "description" in data:
        activity.description = data["description"]
    if "time_slot" in data:
        activity.time_slot = data["time_slot"]
    if "category" in data:
        activity.category = data["category"]
    if "estimated_cost" in data:
        activity.estimated_cost = data["estimated_cost"]
    if "lat" in data:
        activity.lat = data["lat"]
    if "lng" in data:
        activity.lng = data["lng"]
    if "image_url" in data:
        activity.image_url = data["image_url"]
    if "order_index" in data:
        activity.order_index = data["order_index"]

    db.session.commit()

    socketio.emit(
        "itinerary_updated",
        {
            "action": "activity_updated",
            "day_id": day_id,
            "activity": activity.to_dict(),
            "user_name": current_user.name,
        },
        to=f"trip_{trip_id}",
    )

    return jsonify({"message": "Activity updated", "activity": activity.to_dict()}), 200


@itinerary_bp.route("/<trip_id>/days/<day_id>/activities/<activity_id>", methods=["DELETE"])
@token_required
@trip_member_required
def delete_activity(trip_id, current_user, membership, day_id, activity_id):
    """Delete an activity.

    Returns:
        200: Activity deleted
    """
    ItineraryDay.query.filter_by(id=day_id, trip_id=trip_id).first_or_404()
    activity = Activity.query.filter_by(id=activity_id, day_id=day_id).first_or_404()

    db.session.delete(activity)
    db.session.commit()

    socketio.emit(
        "itinerary_updated",
        {
            "action": "activity_deleted",
            "day_id": day_id,
            "activity_id": activity_id,
            "user_name": current_user.name,
        },
        to=f"trip_{trip_id}",
    )

    return jsonify({"message": "Activity deleted"}), 200
