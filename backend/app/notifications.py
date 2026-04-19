"""
Notification Helper Module

Provides utility functions for creating notifications across the application.
Centralizes notification creation to avoid code duplication in route handlers.
"""

from app import db
from app.models import Notification, TripMember


def create_notification(
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    trip_id: str = None,
    data: dict = None,
):
    """Create a notification record for a user.

    Args:
        user_id: Target user ID.
        notification_type: One of: invite, itinerary_change, expense_added,
            vote_cast, member_joined, settlement.
        title: Short notification title.
        message: Notification body text.
        trip_id: Optional associated trip ID.
        data: Optional JSON-serializable metadata.

    Returns:
        The created Notification instance.
    """
    notification = Notification(
        user_id=user_id,
        trip_id=trip_id,
        type=notification_type,
        title=title,
        message=message,
        data=data or {},
    )
    db.session.add(notification)
    return notification


def notify_trip_members(
    trip_id: str,
    notification_type: str,
    title: str,
    message: str,
    exclude_user_id: str = None,
    data: dict = None,
):
    """Create notifications for all members of a trip.

    Args:
        trip_id: Trip to notify members of.
        notification_type: Notification type.
        title: Short notification title.
        message: Notification body text.
        exclude_user_id: Optional user ID to exclude (typically the actor).
        data: Optional JSON-serializable metadata.

    Returns:
        List of created Notification instances.
    """
    members = TripMember.query.filter_by(trip_id=trip_id).all()
    notifications = []

    for member in members:
        if exclude_user_id and member.user_id == exclude_user_id:
            continue
        notif = create_notification(
            user_id=member.user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            trip_id=trip_id,
            data=data,
        )
        notifications.append(notif)

    return notifications
