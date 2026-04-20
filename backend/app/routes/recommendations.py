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

def _build_daily_schedule(day_num, places_today, current_accommodation, all_dests, is_first_day=False):
    """
    Transforms a list of destinations into a fully scheduled day with meals 
    and accommodation checking. Returns (scheduled_activities, new_current_accommodation).
    """
    schedule = []
    if not places_today:
        return schedule, current_accommodation
        
    start_place = places_today[0]
    end_place = places_today[-1]
    
    # 1. MORNING (Breakfast)
    if current_accommodation:
        b_place = dict(current_accommodation.to_dict()) if hasattr(current_accommodation, "to_dict") else dict(current_accommodation)
        b_place["title"] = f"Breakfast at {b_place['name']}"
        b_place["category"] = "food"
        b_place["day"] = day_num
        # Use hotel's image if available, else a good breakfast fallback
        b_place["image_url"] = b_place.get("image_url") or "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80"
        schedule.append(b_place)
    elif is_first_day:
        b_place = dict(start_place)
        b_place["title"] = f"Breakfast near {start_place['name']}"
        b_place["category"] = "food"
        b_place["day"] = day_num
        b_place["image_url"] = "https://images.unsplash.com/photo-1525648199074-cee30ba79a4a?w=800&q=80"
        schedule.append(b_place)

    # 2. MID-DAY (Activities + Lunch)
    mid_index = max(1, len(places_today) // 2)
    
    for i, place in enumerate(places_today):
        p = dict(place)
        p["day"] = day_num
        if "category" not in p or p["category"] != "accommodation":
            schedule.append(p)
            
        if i == mid_index - 1:
            # We inject lunch immediately after the mid-point activity
            lunch = dict(place)
            lunch["title"] = f"Lunch break near {place['name']}"
            lunch["category"] = "food"
            lunch["day"] = day_num
            lunch["image_url"] = "https://images.unsplash.com/photo-1564671165093-20688ff1fffa?w=800&q=80"
            schedule.append(lunch)
            
    # 3. END OF DAY (Dinner & Accommodation)
    dist_to_current = float("inf")
    if current_accommodation:
        if hasattr(current_accommodation, "lat"):
            acc_lat = current_accommodation.lat
            acc_lng = current_accommodation.lng
        else:
            acc_lat = current_accommodation.get("lat")
            acc_lng = current_accommodation.get("lng")
        dist_to_current = haversine(end_place["lat"], end_place["lng"], acc_lat, acc_lng)
        
    if not current_accommodation or dist_to_current > 5:
        # Find new accommodation near final stop
        new_acc = _find_accommodation(all_dests, end_place["lat"], end_place["lng"])
        if new_acc:
            current_accommodation = new_acc
            
        # Dinner out (since we have completely left the old hotel's area)
        dinner = dict(end_place)
        dinner["title"] = f"Dinner near {end_place['name']}"
        dinner["category"] = "food"
        dinner["day"] = day_num
        dinner["image_url"] = "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80"
        schedule.append(dinner)
        
        # Check-in
        if current_accommodation:
            acc_c = dict(current_accommodation.to_dict()) if hasattr(current_accommodation, "to_dict") else dict(current_accommodation)
            acc_c["title"] = f"Check-in at {acc_c['name']}"
            acc_c["category"] = "accommodation"
            acc_c["day"] = day_num
            schedule.append(acc_c)
    else:
        acc_dict = dict(current_accommodation.to_dict()) if hasattr(current_accommodation, "to_dict") else dict(current_accommodation)
        
        # Transit back
        transit = dict(acc_dict)
        transit["title"] = f"Return to {acc_dict['name']}"
        transit["category"] = "transport"
        transit["day"] = day_num
        schedule.append(transit)
        
        # Dinner at hotel
        dinner = dict(acc_dict)
        dinner["title"] = f"Dinner at {acc_dict['name']}"
        dinner["category"] = "food"
        dinner["day"] = day_num
        dinner["image_url"] = acc_dict.get("image_url") or "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&q=80"
        schedule.append(dinner)
        
    return schedule, current_accommodation



@recommendations_bp.route("/recommend", methods=["POST"])
@token_required
def recommend(current_user):
    """Get destination recommendations based on user preferences using live TF-IDF.

    Request Body:
        activities (list[str]): Preferred activities (e.g., ["surfing", "hiking"])
        bucket_list (list[str]): Desired destinations (e.g., ["Ella", "Mirissa"])
        destination_days (dict): Optional mapping of destination name to number of days
            (e.g., {"Mirissa": 3, "Kandy": 2})
        max_budget (number): Optional budget constraint
        duration (int): Total trip duration in days

    Returns:
        200: Recommended route of places with day assignments
        400: Missing required fields
        500: Server error
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    activities = data.get("activities", [])
    bucket_list = data.get("bucket_list", [])
    destination_days = data.get("destination_days", {})
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

        # 2. Build TF-IDF matrix for activity matching
        corpus = [" ".join(d.activities) if d.activities else "" for d in all_dests]
        user_query = " ".join(activities)

        vectorizer = TfidfVectorizer(stop_words="english")
        tfidf_matrix = vectorizer.fit_transform(corpus)
        user_tfidf = vectorizer.transform([user_query])
        similarities = cosine_similarity(user_tfidf, tfidf_matrix).flatten()

        # Build a lookup dict for all destinations
        dest_by_name = {}
        for d in all_dests:
            dest_by_name[d.name.lower()] = d

        # 3. Multi-destination planning with sequential transit
        if destination_days:
            route_with_days = []
            current_day = 1
            current_accommodation = None
            
            # Since Python 3.7+ preserves dict insertion order, this represents the user's route linearly
            anchor_sequence = list(destination_days.items())
            
            for i, (dest_name, num_days) in enumerate(anchor_sequence):
                anchor = dest_by_name.get(dest_name.lower())
                if not anchor:
                    # Fallback if anchor not found, skip allocation or just increment days
                    current_day += num_days
                    continue
                
                anchor_dict = anchor.to_dict()
                
                # Determine how many days are exploration vs transit
                is_first_anchor = (i == 0)
                
                if is_first_anchor:
                    transit_days = 0
                    explorer_days = num_days
                else:
                    transit_days = 1
                    explorer_days = max(0, num_days - 1)
                
                stops_per_day = 3  # Target ~3 activities per day
                
                # --- PHASE A: Transit Day (If applicable) ---
                if transit_days > 0:
                    prev_anchor_name = anchor_sequence[i - 1][0]
                    prev_anchor = dest_by_name.get(prev_anchor_name.lower())
                    
                    if prev_anchor:
                        # Find stops physically between Prev and Current using an elliptical bounding box
                        dist_a_b = haversine(prev_anchor.lat, prev_anchor.lng, anchor.lat, anchor.lng)
                        
                        transit_candidates = []
                        for j, dest in enumerate(all_dests):
                            # Skip the anchors themselves
                            if dest.name.lower() in [prev_anchor.name.lower(), anchor.name.lower()]:
                                continue
                            
                            dist_from_prev = haversine(prev_anchor.lat, prev_anchor.lng, dest.lat, dest.lng)
                            dist_to_curr = haversine(dest.lat, dest.lng, anchor.lat, anchor.lng)
                            
                            # Ellipse bound: distance sum must be <= direct distance * 1.5 multiplier (adjustable)
                            if dist_from_prev + dist_to_curr <= dist_a_b * 1.5:
                                base_score = similarities[j]
                                if base_score > 0:
                                    rating_multi = 1.0 + ((dest.rating or 0) / 10.0)
                                    # Store candidate: (final_score, distance_from_start, destination)
                                    transit_candidates.append((base_score * rating_multi, dist_from_prev, dest))
                                    
                        # Sort by TF-IDF score to get the best rated stops
                        transit_candidates.sort(key=lambda x: x[0], reverse=True)
                        top_transit = transit_candidates[:stops_per_day]
                        
                        # Sort the top stops strictly geographically by distance from previous anchor 
                        # to naturally progress towards the destination
                        top_transit.sort(key=lambda x: x[1])
                        
                        # We must apply the daily builder algorithm for the transit day
                        transit_places_list = [stop.to_dict() for _, _, stop in top_transit]
                        # Don't natively add the anchor yet
                        arrive_dict = dict(anchor_dict)
                        arrive_dict["title"] = f"Arrive in {anchor.name}"
                        transit_places_list.append(arrive_dict)
                        
                        schedule_d1, current_accommodation = _build_daily_schedule(
                            day_num=current_day,
                            places_today=transit_places_list,
                            current_accommodation=current_accommodation,
                            all_dests=all_dests,
                            is_first_day=(current_day == 1)
                        )
                        route_with_days.extend(schedule_d1)
                        
                    current_day += transit_days

                # --- PHASE B: Explorer Days ---
                if explorer_days > 0:
                    explorer_scored = []
                    for j, dest in enumerate(all_dests):
                        if dest.name.lower() == anchor.name.lower():
                            continue
                        dist = haversine(anchor.lat, anchor.lng, dest.lat, dest.lng)
                        if dist > 60:
                            continue
                        base_score = similarities[j]
                        if base_score > 0:
                            rating_multi = 1.0 + ((dest.rating or 0) / 10.0)
                            explorer_scored.append((base_score * rating_multi, dest))
                            
                    explorer_scored.sort(key=lambda x: x[0], reverse=True)
                    
                    max_stops = explorer_days * stops_per_day
                    stops = [anchor_dict] if is_first_anchor and not any(r['name'] == anchor_dict['name'] for r in route_with_days) else []
                    for _, dest in explorer_scored[:max_stops]:
                        stops.append(dest.to_dict())
                        
                    # Optimize the localized cluster using greedy routing
                    optimized = calculate_greedy_route(stops) if len(stops) > 1 else stops
                    
                    # Distribute these stops sequentially across the explorer days
                    days_array = [[] for _ in range(explorer_days)]
                    stops_per_bin = max(1, math.ceil(len(optimized) / max(explorer_days, 1)))
                    for idx, place in enumerate(optimized):
                        bin_idx = min(idx // stops_per_bin, explorer_days - 1)
                        days_array[bin_idx].append(place)
                        
                    for day_offset in range(explorer_days):
                        day_num = current_day + day_offset
                        places_today = days_array[day_offset]
                        
                        if places_today:
                            schedule_dx, current_accommodation = _build_daily_schedule(
                                day_num=day_num,
                                places_today=places_today,
                                current_accommodation=current_accommodation,
                                all_dests=all_dests,
                                is_first_day=(day_num == 1)
                            )
                            route_with_days.extend(schedule_dx)
                            
                    current_day += explorer_days

            return jsonify({
                "recommended_route": route_with_days,
                "route_count": len(route_with_days),
                "input_activities": activities,
                "input_bucket_list": bucket_list,
                "multi_destination": True,
            }), 200

        # 4. Single-destination flow (original behavior with accommodation injection)
        selected_places = []
        selected_names = set()
        bucket_list_lower = [b.lower() for b in bucket_list]
        anchor_lat = None
        anchor_lng = None

        for dest in all_dests:
            if dest.name.lower() in bucket_list_lower:
                selected_places.append(dest.to_dict())
                selected_names.add(dest.name.lower())
                if anchor_lat is None:
                    anchor_lat = dest.lat
                    anchor_lng = dest.lng

        # Score destinations via TF-IDF
        scored_dests = []
        for i, dest in enumerate(all_dests):
            if dest.name.lower() in selected_names:
                continue

            if anchor_lat is not None and anchor_lng is not None:
                dist = haversine(anchor_lat, anchor_lng, dest.lat, dest.lng)
                if dist > 80:
                    continue

            base_score = similarities[i]
            if base_score > 0:
                rating_multiplier = 1.0 + ((dest.rating or 0) / 10.0)
                final_score = base_score * rating_multiplier
                scored_dests.append((final_score, dest))

        scored_dests.sort(key=lambda x: x[0], reverse=True)

        # Budget constraint
        max_additional = 10 - len(selected_places)
        if max_budget is not None:
            try:
                max_budget_float = float(max_budget)
                base_daily_cost = 8000 + 5000 + (2500 * 2)
                base_trip_cost = base_daily_cost * duration_days
                remaining_budget = max_budget_float - base_trip_cost
                if remaining_budget <= 0:
                    max_additional = 0
                else:
                    affordable_stops = int(remaining_budget / 4000)
                    max_additional = min(max_additional, affordable_stops)
            except (ValueError, TypeError):
                pass

        max_additional = max(0, max_additional)

        for _, dest in scored_dests[:max_additional]:
            selected_places.append(dest.to_dict())

        # Route Optimization
        optimized_route = calculate_greedy_route(selected_places)

        # Inject accommodation + day assignments properly using _build_daily_schedule
        final_route = []
        stops_per_day = max(1, math.ceil(len(optimized_route) / duration_days))
        stop_idx = 0

        current_accommodation = None

        for day_num in range(1, duration_days + 1):
            places_today = []
            for _ in range(stops_per_day):
                if stop_idx >= len(optimized_route):
                    break
                place = dict(optimized_route[stop_idx])
                
                # Apply nice title
                if anchor_lat and abs(place.get("lat", 0) - anchor_lat) < 0.001 and abs(place.get("lng", 0) - anchor_lng) < 0.001:
                    place["title"] = f"Arrive in {place['name']}"
                else:
                    place["title"] = f"Explore {place['name']}"
                    
                places_today.append(place)
                stop_idx += 1

            if places_today:
                schedule_dx, current_accommodation = _build_daily_schedule(
                    day_num=day_num,
                    places_today=places_today,
                    current_accommodation=current_accommodation,
                    all_dests=all_dests,
                    is_first_day=(day_num == 1)
                )
                final_route.extend(schedule_dx)

        return jsonify({
            "recommended_route": final_route,
            "route_count": len(final_route),
            "input_activities": activities,
            "input_bucket_list": bucket_list,
        }), 200

    except Exception as e:
        current_app.logger.error(f"Recommendation error: {traceback.format_exc()}")
        return jsonify({"error": f"Recommendation failed: {str(e)}"}), 500


def _find_accommodation(all_dests, lat, lng, max_distance=30):
    """Find the nearest accommodation-type destination within max_distance km.

    Searches for destinations whose name contains hotel, resort, inn, lodge,
    villa, or guesthouse keywords.
    """
    accommodation_keywords = ["hotel", "resort", "inn", "lodge", "villa", "guesthouse", "hostel"]
    best = None
    best_dist = float("inf")

    for dest in all_dests:
        name_lower = dest.name.lower()
        desc_lower = (dest.description or "").lower()
        is_accommodation = any(kw in name_lower or kw in desc_lower for kw in accommodation_keywords)
        if not is_accommodation:
            continue

        dist = haversine(lat, lng, dest.lat, dest.lng)
        if dist < max_distance and dist < best_dist:
            best = dest
            best_dist = dist

    return best


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
