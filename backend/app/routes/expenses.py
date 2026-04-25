"""
Expense Tracking Blueprint

Manages expenses with equal, percentage, and custom split options.
Includes settlement flow for marking debts as paid.
Emits real-time events via Socket.IO and creates notifications.
"""

from flask import Blueprint, jsonify, request

from app import db, socketio
from app.middleware import token_required, trip_member_required
from app.models import Expense, Settlement, Trip, TripMember
from app.notifications import create_notification, notify_trip_members

expenses_bp = Blueprint("expenses", __name__)


@expenses_bp.route("/<trip_id>/expenses", methods=["GET"])
@token_required
@trip_member_required
def list_expenses(trip_id, current_user, membership):
    """List all expenses for a trip.

    Returns:
        200: List of expenses with total
    """
    expenses = Expense.query.filter_by(trip_id=trip_id).order_by(Expense.created_at.desc()).all()
    total = sum(float(e.amount) for e in expenses)

    return jsonify({
        "expenses": [e.to_dict() for e in expenses],
        "total": total,
    }), 200


@expenses_bp.route("/<trip_id>/expenses", methods=["POST"])
@token_required
@trip_member_required
def add_expense(trip_id, current_user, membership):
    """Add an expense with split configuration.

    Request Body:
        title (str): Expense description
        amount (float): Total amount in LKR
        category (str, optional): Food, transport, accommodation, etc.
        split_type (str): "equal", "percentage", or "custom"
        split_details (dict, optional): {user_id: amount_or_percentage}
            - For "equal": auto-calculated, split_details optional
            - For "percentage": {user_id: percent, ...} must sum to 100
            - For "custom": {user_id: amount, ...} must sum to total

    Returns:
        201: Created expense with split breakdown
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    trip = Trip.query.get(trip_id)
    if trip.creator_id != current_user.id:
        return jsonify({"error": "Only the trip creator can add expenses."}), 403

    title = data.get("title", "").strip()
    amount = data.get("amount")

    if not title or amount is None:
        return jsonify({"error": "Title and amount are required"}), 400

    try:
        amount = float(amount)
    except (ValueError, TypeError):
        return jsonify({"error": "Amount must be a number"}), 400

    if amount <= 0:
        return jsonify({"error": "Amount must be positive"}), 400

    split_type = data.get("split_type", "equal")
    if split_type not in ("equal", "percentage", "custom"):
        return jsonify({"error": "split_type must be: equal, percentage, or custom"}), 400

    split_details = data.get("split_details", {})

    if split_type == "equal" and not split_details:
        members = TripMember.query.filter_by(trip_id=trip_id).all()
        per_person = round(amount / len(members), 2)
        split_details = {m.user_id: per_person for m in members}

    if split_type == "percentage" and split_details:
        total_pct = sum(split_details.values())
        if abs(total_pct - 100) > 0.01:
            return jsonify({"error": f"Percentage splits must sum to 100 (got {total_pct})"}), 400

    if split_type == "custom" and split_details:
        total_custom = sum(split_details.values())
        if abs(total_custom - amount) > 0.01:
            return jsonify({
                "error": f"Custom splits must sum to total amount ({amount}), got {total_custom}"
            }), 400

    expense = Expense(
        trip_id=trip_id,
        paid_by=current_user.id,
        title=title,
        amount=amount,
        category=data.get("category"),
        split_type=split_type,
        split_details=split_details,
    )
    db.session.add(expense)

    notify_trip_members(
        trip_id=trip_id,
        notification_type="expense_added",
        title="Expense Added",
        message=f"{current_user.name} added '{title}' — LKR {amount:,.0f}",
        exclude_user_id=current_user.id,
        data={"expense_title": title, "amount": amount},
    )

    db.session.commit()

    socketio.emit(
        "expense_updated",
        {"action": "expense_added", "expense": expense.to_dict(), "user_name": current_user.name},
        to=f"trip_{trip_id}",
    )

    return jsonify({"message": "Expense added", "expense": expense.to_dict()}), 201


@expenses_bp.route("/<trip_id>/expenses/<expense_id>", methods=["PUT"])
@token_required
@trip_member_required
def update_expense(trip_id, current_user, membership, expense_id):
    """Update an expense.

    Returns:
        200: Updated expense
    """
    expense = Expense.query.filter_by(id=expense_id, trip_id=trip_id).first_or_404()
    
    trip = Trip.query.get(trip_id)
    if trip.creator_id != current_user.id:
        return jsonify({"error": "Only the trip creator can edit expenses."}), 403

    data = request.get_json()

    if "title" in data:
        expense.title = data["title"].strip()
    if "amount" in data:
        expense.amount = float(data["amount"])
    if "category" in data:
        expense.category = data["category"]
    if "split_type" in data:
        expense.split_type = data["split_type"]
    if "split_details" in data:
        expense.split_details = data["split_details"]

    db.session.commit()

    socketio.emit(
        "expense_updated",
        {"action": "expense_updated", "expense": expense.to_dict(), "user_name": current_user.name},
        to=f"trip_{trip_id}",
    )

    return jsonify({"message": "Expense updated", "expense": expense.to_dict()}), 200


@expenses_bp.route("/<trip_id>/expenses/<expense_id>", methods=["DELETE"])
@token_required
@trip_member_required
def delete_expense(trip_id, current_user, membership, expense_id):
    """Delete an expense.

    Returns:
        200: Expense deleted
    """
    expense = Expense.query.filter_by(id=expense_id, trip_id=trip_id).first_or_404()
    
    trip = Trip.query.get(trip_id)
    if trip.creator_id != current_user.id:
        return jsonify({"error": "Only the trip creator can delete expenses."}), 403

    db.session.delete(expense)
    db.session.commit()

    socketio.emit(
        "expense_updated",
        {"action": "expense_deleted", "expense_id": expense_id, "user_name": current_user.name},
        to=f"trip_{trip_id}",
    )

    return jsonify({"message": "Expense deleted"}), 200


@expenses_bp.route("/<trip_id>/budget-summary", methods=["GET"])
@token_required
@trip_member_required
def budget_summary(trip_id, current_user, membership):
    """Get budget summary with per-member breakdowns.

    Returns:
        200: Budget overview + member balances
    """
    trip = Trip.query.get_or_404(trip_id)
    expenses = Expense.query.filter_by(trip_id=trip_id).all()
    members = TripMember.query.filter_by(trip_id=trip_id).all()

    total_spent = sum(float(e.amount) for e in expenses)
    budget_limit = float(trip.budget_limit) if trip.budget_limit else None

    member_balances = {}
    for member in members:
        uid = member.user_id
        member_balances[uid] = {
            "user_id": uid,
            "user_name": member.user.name if member.user else None,
            "paid": 0.0,
            "owes": 0.0,
            "balance": 0.0,
        }

    for expense in expenses:
        if expense.paid_by and expense.paid_by in member_balances:
            member_balances[expense.paid_by]["paid"] += float(expense.amount)

        details = expense.split_details or {}
        if expense.split_type == "equal" and not details:
            per_person = float(expense.amount) / max(len(members), 1)
            for m in members:
                member_balances[m.user_id]["owes"] += per_person
        elif expense.split_type == "percentage":
            for uid, pct in details.items():
                if uid in member_balances:
                    member_balances[uid]["owes"] += float(expense.amount) * float(pct) / 100
        else:  # custom or equal with details
            for uid, amt in details.items():
                if uid in member_balances:
                    member_balances[uid]["owes"] += float(amt)

    for uid in member_balances:
        member_balances[uid]["balance"] = round(
            member_balances[uid]["paid"] - member_balances[uid]["owes"], 2
        )
        member_balances[uid]["paid"] = round(member_balances[uid]["paid"], 2)
        member_balances[uid]["owes"] = round(member_balances[uid]["owes"], 2)

    return jsonify({
        "budget_limit": budget_limit,
        "total_spent": round(total_spent, 2),
        "budget_remaining": round(budget_limit - total_spent, 2) if budget_limit else None,
        "expense_count": len(expenses),
        "member_balances": list(member_balances.values()),
    }), 200




@expenses_bp.route("/<trip_id>/debts", methods=["GET"])
@token_required
@trip_member_required
def get_debts(trip_id, current_user, membership):
    """Calculate optimized debt settlement using debt simplification.

    Minimizes the number of transactions needed to settle all balances.

    Returns:
        200: List of optimized debt transfers
    """
    expenses = Expense.query.filter_by(trip_id=trip_id).all()
    members = TripMember.query.filter_by(trip_id=trip_id).all()
    settlements = Settlement.query.filter_by(trip_id=trip_id).all()

    balances = {}
    for member in members:
        balances[member.user_id] = {
            "user_id": member.user_id,
            "user_name": member.user.name if member.user else None,
            "net": 0.0,
        }

    for expense in expenses:
        if expense.paid_by and expense.paid_by in balances:
            balances[expense.paid_by]["net"] += float(expense.amount)

        details = expense.split_details or {}
        if expense.split_type == "equal" and not details:
            per_person = float(expense.amount) / max(len(members), 1)
            for m in members:
                balances[m.user_id]["net"] -= per_person
        elif expense.split_type == "percentage":
            for uid, pct in details.items():
                if uid in balances:
                    balances[uid]["net"] -= float(expense.amount) * float(pct) / 100
        else:
            for uid, amt in details.items():
                if uid in balances:
                    balances[uid]["net"] -= float(amt)

    for s in settlements:
        if s.from_user_id in balances:
            balances[s.from_user_id]["net"] += float(s.amount)
        if s.to_user_id in balances:
            balances[s.to_user_id]["net"] -= float(s.amount)

    creditors = []  # People who are owed money (positive balance)
    debtors = []    # People who owe money (negative balance)

    for uid, info in balances.items():
        net = round(info["net"], 2)
        if net > 0.01:
            creditors.append({"user_id": uid, "user_name": info["user_name"], "amount": net})
        elif net < -0.01:
            debtors.append({"user_id": uid, "user_name": info["user_name"], "amount": abs(net)})

    creditors.sort(key=lambda x: x["amount"], reverse=True)
    debtors.sort(key=lambda x: x["amount"], reverse=True)

    debts = []
    ci, di = 0, 0
    while ci < len(creditors) and di < len(debtors):
        transfer = min(creditors[ci]["amount"], debtors[di]["amount"])
        if transfer > 0.01:
            debts.append({
                "from_user_id": debtors[di]["user_id"],
                "from_user_name": debtors[di]["user_name"],
                "to_user_id": creditors[ci]["user_id"],
                "to_user_name": creditors[ci]["user_name"],
                "amount": round(transfer, 2),
            })
        creditors[ci]["amount"] -= transfer
        debtors[di]["amount"] -= transfer
        if creditors[ci]["amount"] < 0.01:
            ci += 1
        if debtors[di]["amount"] < 0.01:
            di += 1

    return jsonify({
        "debts": debts,
        "all_settled": len(debts) == 0,
    }), 200


@expenses_bp.route("/<trip_id>/settlements", methods=["GET"])
@token_required
@trip_member_required
def list_settlements(trip_id, current_user, membership):
    """List all settlements for a trip.

    Returns:
        200: List of settlements
    """
    settlements = Settlement.query.filter_by(trip_id=trip_id).order_by(
        Settlement.settled_at.desc()
    ).all()

    return jsonify({
        "settlements": [s.to_dict() for s in settlements],
    }), 200


@expenses_bp.route("/<trip_id>/settlements", methods=["POST"])
@token_required
@trip_member_required
def add_settlement(trip_id, current_user, membership):
    """Record a settlement payment between members.

    Request Body:
        to_user_id (str): User ID of the person being paid
        amount (float): Settlement amount in LKR
        note (str, optional): Settlement note

    Returns:
        201: Settlement recorded
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    to_user_id = data.get("to_user_id")
    from_user_id = current_user.id
    amount = data.get("amount")

    trip = Trip.query.get(trip_id)
    if trip.creator_id == current_user.id and data.get("from_user_id"):
        from_user_id = data.get("from_user_id")

    if not to_user_id or amount is None:
        return jsonify({"error": "to_user_id and amount are required"}), 400

    try:
        amount = float(amount)
    except (ValueError, TypeError):
        return jsonify({"error": "Amount must be a number"}), 400

    if amount <= 0:
        return jsonify({"error": "Amount must be positive"}), 400

    target_member = TripMember.query.filter_by(trip_id=trip_id, user_id=to_user_id).first()
    if not target_member:
        return jsonify({"error": "Target user is not a member of this trip"}), 404

    settlement = Settlement(
        trip_id=trip_id,
        from_user_id=from_user_id,
        to_user_id=to_user_id,
        amount=amount,
        note=data.get("note"),
    )
    db.session.add(settlement)

    create_notification(
        user_id=to_user_id,
        notification_type="settlement",
        title="Payment Received",
        message=f"{current_user.name} settled LKR {amount:,.0f} with you",
        trip_id=trip_id,
        data={"amount": amount, "from_user_name": current_user.name},
    )

    db.session.commit()

    socketio.emit(
        "settlement_recorded",
        {"settlement": settlement.to_dict(), "user_name": current_user.name},
        to=f"trip_{trip_id}",
    )

    return jsonify({"message": "Settlement recorded", "settlement": settlement.to_dict()}), 201
