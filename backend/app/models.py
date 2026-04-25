"""
TripMate Database Models

Enterprise-grade PostgreSQL schema with UUID primary keys, JSONB fields,
proper indexing, constraints, and relationships for a collaborative
trip planning platform.
"""

import uuid
from datetime import datetime, timezone

from app import db


def generate_uuid():
    """Generate a new UUID string for primary keys."""
    return str(uuid.uuid4())


class User(db.Model):
    """User account model with travel preferences."""

    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    avatar_url = db.Column(db.String(500), nullable=True)
    preferred_activities = db.Column(db.JSON, default=list)
    bucket_list = db.Column(db.JSON, default=list)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    created_trips = db.relationship(
        "Trip", backref="creator", lazy="dynamic", foreign_keys="Trip.creator_id"
    )
    memberships = db.relationship(
        "TripMember", backref="user", lazy="dynamic", cascade="all, delete-orphan"
    )
    expenses_paid = db.relationship(
        "Expense", backref="payer", lazy="dynamic", foreign_keys="Expense.paid_by"
    )
    votes = db.relationship(
        "Vote", backref="voter", lazy="dynamic", cascade="all, delete-orphan"
    )

    def to_dict(self, include_preferences=False):
        """Serialize user to dictionary."""
        data = {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "avatar_url": self.avatar_url,
            "created_at": self.created_at.isoformat(),
        }
        if include_preferences:
            data["preferred_activities"] = self.preferred_activities or []
            data["bucket_list"] = self.bucket_list or []
        return data

    def __repr__(self):
        return f"<User {self.email}>"


class Trip(db.Model):
    """Trip model with status tracking and budget management."""

    __tablename__ = "trips"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    title = db.Column(db.String(255), nullable=False)
    destination = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    budget_limit = db.Column(db.Numeric(12, 2), nullable=True)
    trip_type = db.Column(
        db.String(50), nullable=True
    )  # beach, cultural, adventure, wildlife
    status = db.Column(
        db.String(20), nullable=False, default="planning", index=True
    )  # planning, ready, active, completed
    creator_id = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    members = db.relationship(
        "TripMember", backref="trip", lazy="dynamic", cascade="all, delete-orphan"
    )
    itinerary_days = db.relationship(
        "ItineraryDay",
        backref="trip",
        lazy="dynamic",
        cascade="all, delete-orphan",
        order_by="ItineraryDay.day_number",
    )
    expenses = db.relationship(
        "Expense", backref="trip", lazy="dynamic", cascade="all, delete-orphan"
    )
    votes = db.relationship(
        "Vote", backref="trip", lazy="dynamic", cascade="all, delete-orphan"
    )

    def get_total_spent(self):
        """Calculate total expenses for the trip."""
        return sum(
            float(expense.amount) for expense in self.expenses.all()
        )

    def to_dict(self, include_members=False, include_budget=False):
        """Serialize trip to dictionary."""
        data = {
            "id": self.id,
            "title": self.title,
            "destination": self.destination,
            "description": self.description,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "budget_limit": float(self.budget_limit) if self.budget_limit else None,
            "trip_type": self.trip_type,
            "status": self.status,
            "creator_id": self.creator_id,
            "created_at": self.created_at.isoformat(),
        }
        if include_members:
            data["members"] = [m.to_dict() for m in self.members.all()]
            data["member_count"] = self.members.count()
        if include_budget:
            total_spent = self.get_total_spent()
            data["total_spent"] = total_spent
            data["budget_remaining"] = (
                float(self.budget_limit) - total_spent if self.budget_limit else None
            )
        return data

    def __repr__(self):
        return f"<Trip {self.title}>"


class TripMember(db.Model):
    """Junction table for trip membership with roles."""

    __tablename__ = "trip_members"
    __table_args__ = (
        db.UniqueConstraint("trip_id", "user_id", name="uq_trip_member"),
    )

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    trip_id = db.Column(
        db.String(36), db.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role = db.Column(
        db.String(20), nullable=False, default="member"
    )  # owner, admin, member
    joined_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    def to_dict(self):
        """Serialize membership to dictionary."""
        return {
            "id": self.id,
            "trip_id": self.trip_id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else None,
            "user_email": self.user.email if self.user else None,
            "role": self.role,
            "joined_at": self.joined_at.isoformat(),
        }

    def __repr__(self):
        return f"<TripMember trip={self.trip_id} user={self.user_id}>"


class ItineraryDay(db.Model):
    """Day within a trip itinerary."""

    __tablename__ = "itinerary_days"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    trip_id = db.Column(
        db.String(36), db.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    day_number = db.Column(db.Integer, nullable=False)
    date = db.Column(db.Date, nullable=True)
    order_index = db.Column(db.Integer, nullable=False, default=0)

    activities = db.relationship(
        "Activity",
        backref="day",
        lazy="dynamic",
        cascade="all, delete-orphan",
        order_by="Activity.order_index",
    )

    def to_dict(self, include_activities=True):
        """Serialize day to dictionary."""
        data = {
            "id": self.id,
            "trip_id": self.trip_id,
            "day_number": self.day_number,
            "date": self.date.isoformat() if self.date else None,
            "order_index": self.order_index,
        }
        if include_activities:
            data["activities"] = [a.to_dict() for a in self.activities.all()]
        return data

    def __repr__(self):
        return f"<ItineraryDay trip={self.trip_id} day={self.day_number}>"


class Activity(db.Model):
    """Activity within an itinerary day."""

    __tablename__ = "activities"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    day_id = db.Column(
        db.String(36),
        db.ForeignKey("itinerary_days.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    time_slot = db.Column(
        db.String(20), nullable=True
    )  # morning, afternoon, evening
    category = db.Column(
        db.String(50), nullable=True
    )  # adventure, food, nature, cultural, transport, accommodation
    estimated_cost = db.Column(db.Numeric(12, 2), nullable=True, default=0)
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    order_index = db.Column(db.Integer, nullable=False, default=0)

    def to_dict(self):
        """Serialize activity to dictionary."""
        return {
            "id": self.id,
            "day_id": self.day_id,
            "title": self.title,
            "description": self.description,
            "time_slot": self.time_slot,
            "category": self.category,
            "estimated_cost": float(self.estimated_cost) if self.estimated_cost else 0,
            "lat": self.lat,
            "lng": self.lng,
            "image_url": self.image_url,
            "order_index": self.order_index,
        }

    def __repr__(self):
        return f"<Activity {self.title}>"


class Expense(db.Model):
    """Expense tracking with flexible splitting."""

    __tablename__ = "expenses"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    trip_id = db.Column(
        db.String(36), db.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    paid_by = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    category = db.Column(db.String(50), nullable=True)
    split_type = db.Column(
        db.String(20), nullable=False, default="equal"
    )  # equal, percentage, custom
    split_details = db.Column(
        db.JSON, default=dict
    )  # {"user_id": amount_or_percentage, ...}
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    def to_dict(self):
        """Serialize expense to dictionary."""
        return {
            "id": self.id,
            "trip_id": self.trip_id,
            "paid_by": self.paid_by,
            "payer_name": self.payer.name if self.payer else None,
            "title": self.title,
            "amount": float(self.amount),
            "category": self.category,
            "split_type": self.split_type,
            "split_details": self.split_details or {},
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<Expense {self.title} LKR {self.amount}>"


class Vote(db.Model):
    """Voting mechanism for group decisions."""

    __tablename__ = "votes"
    __table_args__ = (
        db.UniqueConstraint(
            "trip_id", "user_id", "vote_type", "target_id", name="uq_vote"
        ),
    )

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    trip_id = db.Column(
        db.String(36), db.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vote_type = db.Column(
        db.String(30), nullable=False
    )  # destination, route, activity, accommodation
    target_id = db.Column(
        db.String(255), nullable=False
    )  # identifier of what is being voted on
    target_value = db.Column(
        db.String(500), nullable=True
    )  # human-readable label
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    def to_dict(self):
        """Serialize vote to dictionary."""
        return {
            "id": self.id,
            "trip_id": self.trip_id,
            "user_id": self.user_id,
            "voter_name": self.voter.name if self.voter else None,
            "vote_type": self.vote_type,
            "target_id": self.target_id,
            "target_value": self.target_value,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<Vote {self.vote_type} by {self.user_id}>"


class Destination(db.Model):
    """Cached catalog of Sri Lankan destinations for map & search."""

    __tablename__ = "destinations"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(255), nullable=False, index=True)
    address = db.Column(db.String(500), nullable=True)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    rating = db.Column(db.Float, nullable=True, default=0.0)
    activities = db.Column(db.JSON, default=list)
    image_url = db.Column(db.String(500), nullable=True)
    description = db.Column(db.Text, nullable=True)

    def to_dict(self):
        """Serialize destination to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "lat": self.lat,
            "lng": self.lng,
            "rating": self.rating,
            "activities": self.activities or [],
            "image_url": self.image_url,
            "description": self.description,
        }

    def __repr__(self):
        return f"<Destination {self.name}>"


class Notification(db.Model):
    """In-app notification for user events."""

    __tablename__ = "notifications"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    trip_id = db.Column(
        db.String(36), db.ForeignKey("trips.id", ondelete="CASCADE"), nullable=True, index=True
    )
    type = db.Column(
        db.String(50), nullable=False
    )  # invite, itinerary_change, expense_added, vote_cast, member_joined, settlement
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False, index=True)
    data = db.Column(db.JSON, default=dict)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    user = db.relationship("User", backref=db.backref("notifications", lazy="dynamic"))
    trip = db.relationship("Trip", backref=db.backref("trip_notifications", lazy="dynamic"))

    def to_dict(self):
        """Serialize notification to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "trip_id": self.trip_id,
            "type": self.type,
            "title": self.title,
            "message": self.message,
            "is_read": self.is_read,
            "data": self.data or {},
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<Notification {self.type} for {self.user_id}>"


class Settlement(db.Model):
    """Expense settlement between trip members."""

    __tablename__ = "settlements"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    trip_id = db.Column(
        db.String(36), db.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    from_user_id = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    to_user_id = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    note = db.Column(db.String(500), nullable=True)
    settled_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    trip = db.relationship("Trip", backref=db.backref("settlements", lazy="dynamic"))
    from_user = db.relationship("User", foreign_keys=[from_user_id], backref="settlements_paid")
    to_user = db.relationship("User", foreign_keys=[to_user_id], backref="settlements_received")

    def to_dict(self):
        """Serialize settlement to dictionary."""
        return {
            "id": self.id,
            "trip_id": self.trip_id,
            "from_user_id": self.from_user_id,
            "from_user_name": self.from_user.name if self.from_user else None,
            "to_user_id": self.to_user_id,
            "to_user_name": self.to_user.name if self.to_user else None,
            "amount": float(self.amount),
            "note": self.note,
            "settled_at": self.settled_at.isoformat(),
        }

    def __repr__(self):
        return f"<Settlement {self.from_user_id} -> {self.to_user_id} LKR {self.amount}>"


class PendingInvite(db.Model):
    """Pending trip invitation for non-registered users."""

    __tablename__ = "pending_invites"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    trip_id = db.Column(
        db.String(36), db.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    email = db.Column(db.String(255), nullable=False, index=True)
    role = db.Column(db.String(20), nullable=False, default="member")
    token = db.Column(db.String(255), nullable=False, unique=True, index=True)
    invited_by = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    expires_at = db.Column(db.DateTime, nullable=False)
    accepted = db.Column(db.Boolean, default=False, nullable=False)

    trip = db.relationship("Trip", backref=db.backref("pending_invites", lazy="dynamic"))
    inviter = db.relationship("User", backref="sent_invites")

    def to_dict(self):
        """Serialize pending invite to dictionary."""
        return {
            "id": self.id,
            "trip_id": self.trip_id,
            "email": self.email,
            "role": self.role,
            "invited_by": self.invited_by,
            "inviter_name": self.inviter.name if self.inviter else None,
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat(),
            "accepted": self.accepted,
        }

    def __repr__(self):
        return f"<PendingInvite {self.email} -> trip {self.trip_id}>"


class ChatMessage(db.Model):
    """Real-time chat message within a trip workspace."""

    __tablename__ = "chat_messages"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    trip_id = db.Column(
        db.String(36), db.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    trip = db.relationship("Trip", backref=db.backref("chat_messages", lazy="dynamic"))
    user = db.relationship("User", backref=db.backref("chat_messages", lazy="dynamic"))

    def to_dict(self):
        """Serialize chat message to dictionary."""
        return {
            "id": self.id,
            "trip_id": self.trip_id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else None,
            "user_avatar": self.user.avatar_url if self.user else None,
            "message": self.message,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<ChatMessage {self.id} in trip {self.trip_id}>"


class Friendship(db.Model):
    """Represents a friendship or pending friend request between two users."""

    __tablename__ = "friendships"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    friend_id = db.Column(
        db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status = db.Column(db.String(20), nullable=False, default="pending")  # pending, accepted
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    user = db.relationship("User", foreign_keys=[user_id], backref=db.backref("sent_friendships", lazy="dynamic", cascade="all, delete"))
    friend = db.relationship("User", foreign_keys=[friend_id], backref=db.backref("received_friendships", lazy="dynamic", cascade="all, delete"))

    def to_dict(self):
        """Serialize friendship to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "friend_id": self.friend_id,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "user": {"name": self.user.name, "email": self.user.email} if self.user else None,
            "friend": {"name": self.friend.name, "email": self.friend.email} if self.friend else None
        }

    def __repr__(self):
        return f"<Friendship {self.user_id} -> {self.friend_id} ({self.status})>"
