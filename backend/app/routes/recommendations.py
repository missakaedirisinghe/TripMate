"""
ML Recommendation Blueprint

Serves the LocationRecommender model and provides cost estimation stubs.
"""

import os
import traceback

import dill
from flask import Blueprint, current_app, jsonify, request

from app.middleware import token_required

recommendations_bp = Blueprint("recommendations", __name__)


def load_model(app):
    """Load the recommendation model at app startup.

    Returns the loaded recommender or None if loading fails.
    """
    model_path = app.config.get("MODEL_PATH", "")

    # Resolve relative paths from the backend directory
    if not os.path.isabs(model_path):
        model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), model_path)

    model_path = os.path.normpath(model_path)

    if not os.path.exists(model_path):
        app.logger.warning(f"ML model not found at: {model_path}")
        return None

    try:
        with open(model_path, "rb") as f:
            recommender = dill.load(f)
        app.logger.info(f"ML model loaded from: {model_path}")
        return recommender
    except Exception as e:
        app.logger.error(f"Failed to load ML model: {e}")
        return None


@recommendations_bp.route("/recommend", methods=["POST"])
@token_required
def recommend(current_user):
    """Get destination recommendations based on user preferences.

    Request Body:
        activities (list[str]): Preferred activities (e.g., ["surfing", "hiking"])
        bucket_list (list[str]): Desired destinations (e.g., ["Ella", "Mirissa"])

    Returns:
        200: Recommended route of places
        400: Missing required fields
        503: Model not loaded
    """
    recommender = current_app.config.get("RECOMMENDER")

    if recommender is None:
        return jsonify({
            "error": "Recommendation model is not loaded",
            "hint": "Ensure the .pkl file exists at the configured MODEL_PATH",
        }), 503

    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    activities = data.get("activities", [])
    bucket_list = data.get("bucket_list", [])

    if not activities:
        return jsonify({"error": "At least one activity is required"}), 400

    try:
        best_route = recommender.recommend_top_places(activities, bucket_list)

        # Build response with place details
        places = []
        places_df = recommender.places_df

        for place_name in best_route:
            match = places_df[places_df["name"] == place_name]
            if not match.empty:
                row = match.iloc[0]
                places.append({
                    "name": row.get("name", place_name),
                    "lat": float(row.get("lat", 0)),
                    "lng": float(row.get("lng", 0)),
                    "address": row.get("formatted_address", ""),
                    "rating": float(row.get("rating", 0)),
                })
            else:
                places.append({"name": place_name})

        return jsonify({
            "recommended_route": places,
            "route_count": len(places),
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
    # TODO: Replace with trained Logistic Regression model
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
        "note": "This is a heuristic estimate. ML-based predictions coming soon.",
    }), 200
