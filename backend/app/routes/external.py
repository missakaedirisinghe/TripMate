"""
External API Proxy Blueprint

Proxies requests to OpenWeatherMap, YouTube Data API, and serves
the destination catalog for Leaflet.js map integration.
"""

import requests
from flask import Blueprint, current_app, jsonify, request

from app.middleware import token_required
from app.models import Destination

external_bp = Blueprint("external", __name__)


@external_bp.route("/weather/<destination>", methods=["GET"])
@token_required
def get_weather(destination, current_user):
    """Get weather forecast for a destination.

    Proxies to OpenWeatherMap 5-day forecast API.

    Path Parameters:
        destination (str): Destination name (e.g., "Ella")

    Returns:
        200: Weather forecast data
        503: API key not configured or external API error
    """
    api_key = current_app.config.get("OPENWEATHERMAP_API_KEY")

    if not api_key:
        return jsonify({
            "error": "Weather API key not configured",
            "setup_instructions": {
                "step_1": "Go to https://openweathermap.org/api and create a free account",
                "step_2": "Get your API key from the dashboard",
                "step_3": "Add OPENWEATHERMAP_API_KEY=your_key to your .env file",
            }
        }), 503

    try:
        url = "https://api.openweathermap.org/data/2.5/forecast"
        
        dest_obj = Destination.query.filter(Destination.name.ilike(f"%{destination}%")).first()
        if dest_obj and dest_obj.lat and dest_obj.lng:
            params = {
                "lat": dest_obj.lat,
                "lon": dest_obj.lng,
                "appid": api_key,
                "units": "metric",
                "cnt": 40,
            }
        else:
            params = {
                "q": f"{destination}, Sri Lanka",
                "appid": api_key,
                "units": "metric",
                "cnt": 40,
            }
            
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 404:
            return jsonify({"error": f"Weather data not found for {destination}"}), 404
            
        response.raise_for_status()

        data = response.json()

        # Simplify the response for frontend
        forecasts = []
        for item in data.get("list", []):
            forecasts.append({
                "datetime": item["dt_txt"],
                "temp": item["main"]["temp"],
                "temp_min": item["main"]["temp_min"],
                "temp_max": item["main"]["temp_max"],
                "humidity": item["main"]["humidity"],
                "weather": item["weather"][0]["main"],
                "description": item["weather"][0]["description"],
                "icon": item["weather"][0]["icon"],
                "wind_speed": item["wind"]["speed"],
            })

        return jsonify({
            "destination": destination,
            "city": data.get("city", {}).get("name"),
            "country": data.get("city", {}).get("country"),
            "forecasts": forecasts,
        }), 200

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Weather API error: {str(e)}"}), 503


@external_bp.route("/videos/<destination>", methods=["GET"])
@token_required
def get_videos(destination, current_user):
    """Get YouTube travel videos for a destination.

    Path Parameters:
        destination (str): Destination name

    Query Parameters:
        max_results (int, optional): Number of results (default: 5, max: 10)

    Returns:
        200: List of videos with thumbnails and links
        503: API key not configured
    """
    api_key = current_app.config.get("YOUTUBE_API_KEY")

    if not api_key:
        return jsonify({
            "error": "YouTube API key not configured",
            "setup_instructions": {
                "step_1": "Go to https://console.cloud.google.com/apis",
                "step_2": "Enable 'YouTube Data API v3'",
                "step_3": "Create an API key under 'Credentials'",
                "step_4": "Add YOUTUBE_API_KEY=your_key to your .env file",
            }
        }), 503

    max_results = min(int(request.args.get("max_results", 5)), 10)

    try:
        query = f"{destination} Sri Lanka travel guide"
        url = "https://www.googleapis.com/youtube/v3/search"
        params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "maxResults": max_results,
            "key": api_key,
            "order": "relevance",
            "videoDuration": "medium",
        }
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()
        videos = []
        for item in data.get("items", []):
            snippet = item["snippet"]
            videos.append({
                "video_id": item["id"]["videoId"],
                "title": snippet["title"],
                "description": snippet["description"],
                "thumbnail": snippet["thumbnails"]["high"]["url"],
                "channel": snippet["channelTitle"],
                "published_at": snippet["publishedAt"],
                "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
            })

        return jsonify({
            "destination": destination,
            "videos": videos,
        }), 200

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"YouTube API error: {str(e)}"}), 503


@external_bp.route("/destinations", methods=["GET"])
def list_destinations():
    """List all destinations from the catalog.

    Used by Leaflet.js map to plot markers and by search to find places.

    Query Parameters:
        search (str, optional): Filter by name

    Returns:
        200: List of destinations with lat/lng for map markers
    """
    query = Destination.query

    search = request.args.get("search", "").strip()
    if search:
        query = query.filter(Destination.name.ilike(f"%{search}%"))

    destinations = query.order_by(Destination.name).all()

    return jsonify({
        "destinations": [d.to_dict() for d in destinations],
        "count": len(destinations),
    }), 200
