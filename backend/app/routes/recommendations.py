"""
ML Recommendation Blueprint

Provides AI-driven destination recommendations directly from the PostgreSQL database
using dynamic TF-IDF and greedy pathfinding, along with ML-based cost estimation.
"""

import math
import os
import traceback

import joblib
import numpy as np
from flask import Blueprint, current_app, jsonify, request
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.middleware import token_required
from app.models import Destination

recommendations_bp = Blueprint("recommendations", __name__)

# --- Cost Model Lazy Loading ---
_cost_model_cache = {}


def _load_cost_model(app):
    """Lazy-load the trained cost estimation model.

    Returns:
        Dict with 'model', 'feature_columns', etc., or None if not found.
    """
    if "model" in _cost_model_cache:
        return _cost_model_cache

    model_path = app.config.get("COST_MODEL_PATH", "")
    if not model_path:
        model_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "models", "cost_model.pkl",
        )

    if os.path.exists(model_path):
        try:
            data = joblib.load(model_path)
            _cost_model_cache.update(data)
            app.logger.info(f"Cost model loaded from {model_path} (v{data.get('version', '?')})")
            return _cost_model_cache
        except Exception as e:
            app.logger.error(f"Failed to load cost model: {e}")
            return None
    else:
        app.logger.warning(f"Cost model not found at {model_path}")
        return None


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
    """Estimate trip costs using a trained GradientBoosting ML model.

    Falls back to heuristic estimation if the model is not available.

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

    # Try ML model first
    model_data = _load_cost_model(current_app)

    if model_data and "model" in model_data:
        try:
            model = model_data["model"]
            feature_cols = model_data["feature_columns"]
            all_vehicle_types = model_data.get("vehicle_types", ["car", "van", "bus", "train"])
            all_acc_types = model_data.get("accommodation_types", ["budget", "mid-range", "luxury"])

            # Build feature vector
            features = {}
            features["duration_days"] = duration
            features["num_travelers"] = num_travelers

            for vt in all_vehicle_types:
                features[f"vehicle_type_{vt}"] = 1 if vehicle_type == vt else 0
            for at in all_acc_types:
                features[f"accommodation_type_{at}"] = 1 if accommodation == at else 0

            # Create feature array in correct order
            feature_vector = np.array([[features.get(col, 0) for col in feature_cols]])
            total_prediction = float(model.predict(feature_vector)[0])
            total_prediction = max(total_prediction, 0)

            # Derive per-category breakdown using domain-knowledge proportions
            accommodation_rates = {"budget": 0.18, "mid-range": 0.30, "luxury": 0.45}
            transport_rates = {"car": 0.22, "van": 0.28, "bus": 0.10, "train": 0.08}
            acc_pct = accommodation_rates.get(accommodation, 0.30)
            transport_pct = transport_rates.get(vehicle_type, 0.22)
            food_pct = max(0.01, 1.0 - acc_pct - transport_pct - 0.18)  # remainder minus activities
            activities_pct = 0.18

            acc_cost = round(total_prediction * acc_pct, 2)
            transport_cost = round(total_prediction * transport_pct, 2)
            food_cost = round(total_prediction * food_pct, 2)
            activities_cost = round(total_prediction * activities_pct, 2)
            total = round(acc_cost + transport_cost + food_cost + activities_cost, 2)
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
                "model_version": model_data.get("version", "unknown"),
                "note": "ML-powered estimate using GradientBoosting model trained on Sri Lankan travel data.",
            }), 200

        except Exception as e:
            current_app.logger.error(f"ML cost estimation failed, falling back to heuristic: {e}")

    # Fallback: heuristic estimation
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
        "note": "Heuristic estimate (ML model not available).",
    }), 200
