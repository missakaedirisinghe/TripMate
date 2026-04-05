"""
ML Recommendation Blueprint

Provides AI-driven destination recommendations directly from the PostgreSQL database
using dynamic TF-IDF and greedy pathfinding, along with cost estimation stubs.
"""

import math
import traceback

from flask import Blueprint, current_app, jsonify, request
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.middleware import token_required
from app.models import Destination

recommendations_bp = Blueprint("recommendations", __name__)


def haversine(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points on the earth."""
    R = 6371  # Radius of earth in kilometers
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (
        math.sin(dLat / 2) * math.sin(dLat / 2)
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dLon / 2)
        * math.sin(dLon / 2)
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def calculate_greedy_route(places):
    """
    Calculate an optimized travel route using a Greedy Nearest Neighbor approach.
    Runs in O(N^2) instead of O(N!) making it highly scalable and crash-free.
    """
    if not places:
        return []

    # Start at the first place (or we could start at the most popular)
    unvisited = places.copy()
    current_place = unvisited.pop(0)
    route = [current_place]

    while unvisited:
        nearest_place = None
        min_dist = float("inf")

        for place in unvisited:
            dist = haversine(
                current_place["lat"], current_place["lng"], place["lat"], place["lng"]
            )
            if dist < min_dist:
                min_dist = dist
                nearest_place = place

        route.append(nearest_place)
        unvisited.remove(nearest_place)
        current_place = nearest_place

    return route


@recommendations_bp.route("/recommend", methods=["POST"])
@token_required
def recommend(current_user):
    """Get destination recommendations based on user preferences using live TF-IDF.

    Request Body:
        activities (list[str]): Preferred activities (e.g., ["surfing", "hiking"])
        bucket_list (list[str]): Desired destinations (e.g., ["Ella", "Mirissa"])

    Returns:
        200: Recommended route of places
        400: Missing required fields
        500: Server error
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    activities = data.get("activities", [])
    bucket_list = data.get("bucket_list", [])
    max_budget = data.get("max_budget")
    duration_days = data.get("duration", 3)

    if not activities:
        return jsonify({"error": "At least one activity is required"}), 400

    try:
        # 1. Fetch all destinations from DB
        all_dests = Destination.query.all()
        if not all_dests:
            return jsonify({
                "error": "No destinations found in database",
                "hint": "Run seed_destinations.py to seed the database."
            }), 503

        # 2. Add bucket list items automatically
        selected_places = []
        selected_names = set()
        bucket_list_lower = [b.lower() for b in bucket_list]
        anchor_lat = None
        anchor_lng = None

        for dest in all_dests:
            if dest.name.lower() in bucket_list_lower:
                selected_places.append(dest.to_dict())
                selected_names.add(dest.name.lower())
                # Use the first matched bucket list item as the anchor
                if anchor_lat is None:
                    anchor_lat = dest.lat
                    anchor_lng = dest.lng

        # 3. Use TF-IDF for dynamic activity matching
        corpus = [" ".join(d.activities) if d.activities else "" for d in all_dests]
        user_query = " ".join(activities)

        vectorizer = TfidfVectorizer(stop_words="english")
        tfidf_matrix = vectorizer.fit_transform(corpus)
        user_tfidf = vectorizer.transform([user_query])

        similarities = cosine_similarity(user_tfidf, tfidf_matrix).flatten()

        # Score destinations
        scored_dests = []
        for i, dest in enumerate(all_dests):
            if dest.name.lower() in selected_names:
                continue  # Already added via bucket list

            # Distance Clamping: If an anchor exists, ignore places > 80km away
            if anchor_lat is not None and anchor_lng is not None:
                dist = haversine(anchor_lat, anchor_lng, dest.lat, dest.lng)
                if dist > 80:
                    continue

            base_score = similarities[i]
            if base_score > 0:
                # Add a multiplier based on rating (e.g., 4.5 rating gives a 10% boost to the score)
                rating_multiplier = 1.0 + ((dest.rating or 0) / 10.0)
                final_score = base_score * rating_multiplier
                scored_dests.append((final_score, dest))

        # Sort by best matching activities
        scored_dests.sort(key=lambda x: x[0], reverse=True)

        # Budget Heuristic constraint logic
        max_additional = 10 - len(selected_places)
        if max_budget is not None:
            try:
                max_budget_float = float(max_budget)
                # Base heuristic cost calculation:
                # Accommodation: 8000/day, Transport: 5000/day, Food: 2500*2/day (assumes 2 travelers)
                base_daily_cost = 8000 + 5000 + (2500 * 2)
                base_trip_cost = base_daily_cost * duration_days
                
                remaining_budget = max_budget_float - base_trip_cost
                
                if remaining_budget <= 0:
                    # Budget assumes you can barely afford the basics. Limit to no extra stops.
                    max_additional = 0
                else:
                    # Assume each additional destination requires ~4000 LKR in entrance fees/local transport
                    affordable_stops = int(remaining_budget / 4000)
                    max_additional = min(max_additional, affordable_stops)
            except (ValueError, TypeError):
                pass # Fallback to default max_additional if parse fails

        max_additional = max(0, max_additional)

        for _, dest in scored_dests[:max_additional]:
            selected_places.append(dest.to_dict())

        # 4. Route Optimization (Greedy Nearest Neighbor)
        optimized_route = calculate_greedy_route(selected_places)

        return jsonify({
            "recommended_route": optimized_route,
            "route_count": len(optimized_route),
            "input_activities": activities,
            "input_bucket_list": bucket_list,
        }), 200

    except Exception as e:
        current_app.logger.error(f"Recommendation error: {traceback.format_exc()}")
        return jsonify({"error": f"Recommendation failed: {str(e)}"}), 500


@recommendations_bp.route("/estimate-cost", methods=["POST"])
@token_required
def estimate_cost(current_user):
    """Estimate trip costs (placeholder for future Logistic Regression model).

    Request Body:
        destination (str): Primary destination
        duration_days (int): Number of trip days
        num_travelers (int): Group size
        vehicle_type (str): car/van/bus/train
        accommodation_type (str): budget/mid-range/luxury

    Returns:
        200: Estimated costs breakdown
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    duration = data.get("duration_days", 3)
    num_travelers = data.get("num_travelers", 2)
    vehicle_type = data.get("vehicle_type", "car")
    accommodation = data.get("accommodation_type", "mid-range")

    # Placeholder cost estimation based on heuristics
    accommodation_rates = {
        "budget": 3000,
        "mid-range": 8000,
        "luxury": 25000,
    }
    transport_rates = {
        "car": 5000,
        "van": 8000,
        "bus": 1500,
        "train": 1000,
    }
    food_per_day = 2500

    acc_cost = accommodation_rates.get(accommodation, 8000) * duration
    transport_cost = transport_rates.get(vehicle_type, 5000) * duration
    food_cost = food_per_day * duration * num_travelers
    activities_cost = 5000 * duration

    total = acc_cost + transport_cost + food_cost + activities_cost
    per_person = round(total / max(num_travelers, 1), 2)

    return jsonify({
        "estimation": {
            "accommodation": acc_cost,
            "transport": transport_cost,
            "food": food_cost,
            "activities": activities_cost,
            "total": total,
            "per_person": per_person,
        },
        "parameters": {
            "duration_days": duration,
            "num_travelers": num_travelers,
            "vehicle_type": vehicle_type,
            "accommodation_type": accommodation,
        },
        "note": "This is a heuristic estimate.",
    }), 200
