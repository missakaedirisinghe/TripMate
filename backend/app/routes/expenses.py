"""
Expense Tracking Blueprint

Manages expenses with equal, percentage, and custom split options.
"""

from flask import Blueprint, jsonify, request

from app import db
from app.middleware import token_required, trip_member_required
from app.models import Expense, Trip, TripMember

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

    # Auto-calculate equal split if not provided
    if split_type == "equal" and not split_details:
        members = TripMember.query.filter_by(trip_id=trip_id).all()
        per_person = round(amount / len(members), 2)
        split_details = {m.user_id: per_person for m in members}

    # Validate percentage split
    if split_type == "percentage" and split_details:
        total_pct = sum(split_details.values())
        if abs(total_pct - 100) > 0.01:
            return jsonify({"error": f"Percentage splits must sum to 100 (got {total_pct})"}), 400

    # Validate custom split
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
    db.session.commit()

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
    db.session.delete(expense)
    db.session.commit()
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

    # Calculate per-member balances
    # Positive = owed money (paid more than share), Negative = owes money
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
        # Track what each person paid
        if expense.paid_by and expense.paid_by in member_balances:
            member_balances[expense.paid_by]["paid"] += float(expense.amount)

        # Track what each person owes
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

    # Calculate net balance
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
