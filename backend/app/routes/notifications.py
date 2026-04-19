"""
Notifications Blueprint

Handles listing, reading, and managing in-app notifications.
"""

from flask import Blueprint, jsonify, request

from app import db
from app.middleware import token_required
from app.models import Notification

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("", methods=["GET"])
@token_required
def list_notifications(current_user):
    """List notifications for the authenticated user.

    Query Parameters:
        page (int, optional): Page number (default: 1)
        per_page (int, optional): Items per page (default: 20, max: 50)
        unread_only (bool, optional): Filter to unread only

    Returns:
        200: Paginated list of notifications
    """
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 50)
    unread_only = request.args.get("unread_only", "false").lower() == "true"

    query = Notification.query.filter_by(user_id=current_user.id)

    if unread_only:
        query = query.filter_by(is_read=False)

    pagination = query.order_by(Notification.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "notifications": [n.to_dict() for n in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "has_next": pagination.has_next,
    }), 200


@notifications_bp.route("/unread-count", methods=["GET"])
@token_required
def unread_count(current_user):
    """Get the count of unread notifications.

    Returns:
        200: Unread count
    """
    count = Notification.query.filter_by(
        user_id=current_user.id, is_read=False
    ).count()

    return jsonify({"unread_count": count}), 200


@notifications_bp.route("/<notification_id>/read", methods=["PUT"])
@token_required
def mark_read(current_user, notification_id):
    """Mark a single notification as read.

    Returns:
        200: Notification marked as read
        404: Notification not found
    """
    notification = Notification.query.filter_by(
        id=notification_id, user_id=current_user.id
    ).first_or_404()

    notification.is_read = True
    db.session.commit()

    return jsonify({"message": "Notification marked as read", "notification": notification.to_dict()}), 200


@notifications_bp.route("/read-all", methods=["PUT"])
@token_required
def mark_all_read(current_user):
    """Mark all notifications as read for the authenticated user.

    Returns:
        200: Count of notifications marked as read
    """
    updated = Notification.query.filter_by(
        user_id=current_user.id, is_read=False
    ).update({"is_read": True})
    db.session.commit()

    return jsonify({"message": f"{updated} notifications marked as read", "count": updated}), 200
