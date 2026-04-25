"""
Seed Destinations Table

Extracts places data from the LocationRecommender .pkl model
and inserts it into the PostgreSQL destinations table.
"""

import sys
import os
import ast

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import dill
import pandas as pd
from app import create_app, db
from app.models import Destination


CATEGORY_IMAGES = {
    "beach": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop",
    "nature": "https://images.unsplash.com/photo-1620619767323-b95a89183081?w=800&auto=format&fit=crop",
    "wildlife": "https://images.unsplash.com/photo-1544654803-b6d2a45d0af9?w=800&auto=format&fit=crop",
    "cultural": "https://images.unsplash.com/photo-1588258219511-64eb629cb833?w=800&auto=format&fit=crop",
    "adventure": "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&auto=format&fit=crop",
    "default": "https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?w=800&auto=format&fit=crop",
}


def guess_category(activities_list):
    """Guess the main category from extracted activities."""
    if not activities_list:
        return "default"

    activity_str = " ".join(activities_list).lower()

    if any(w in activity_str for w in ["beach", "surf", "swim", "snorkel", "diving"]):
        return "beach"
    if any(w in activity_str for w in ["safari", "wildlife", "elephant", "leopard", "whale", "bird"]):
        return "wildlife"
    if any(w in activity_str for w in ["temple", "heritage", "cultural", "museum", "ancient"]):
        return "cultural"
    if any(w in activity_str for w in ["hik", "climb", "trek", "rock", "adventure", "rafting"]):
        return "adventure"
    if any(w in activity_str for w in ["nature", "waterfall", "forest", "garden", "lake"]):
        return "nature"
    return "default"


def seed():
    """Load places from the .pkl model and insert into destinations table."""
    pkl_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "Prediction Model", "Recommendation Model.pkl"
    )
    pkl_path = os.path.abspath(pkl_path)

    if not os.path.exists(pkl_path):
        print(f"ERROR: Model file not found at {pkl_path}")
        sys.exit(1)

    print(f"Loading model from {pkl_path}...")
    with open(pkl_path, "rb") as f:
        model = dill.load(f)

    places_df = model.places_df
    print(f"Found {len(places_df)} places in the model.")

    app = create_app()
    with app.app_context():
        existing = Destination.query.count()
        if existing > 0:
            print(f"Destinations table already has {existing} rows. Clearing and re-seeding...")
            Destination.query.delete()
            db.session.commit()

        inserted = 0
        skipped = 0

        for _, row in places_df.iterrows():
            name = str(row.get("name", "")).strip()
            lat = row.get("lat")
            lng = row.get("lng")

            if not name or pd.isna(lat) or pd.isna(lng):
                skipped += 1
                continue

            activities_raw = row.get("extracted_activities", [])
            if isinstance(activities_raw, str):
                try:
                    activities_raw = ast.literal_eval(activities_raw)
                except (ValueError, SyntaxError):
                    activities_raw = []
            if not isinstance(activities_raw, list):
                activities_raw = []

            category = guess_category(activities_raw)
            image_url = CATEGORY_IMAGES.get(category, CATEGORY_IMAGES["default"])

            desc_parts = []
            if activities_raw:
                desc_parts.append("Activities: " + ", ".join(activities_raw[:8]))
            address = str(row.get("formatted_address", "")).strip()
            if address:
                desc_parts.append(f"Located in {address}, Sri Lanka")

            destination = Destination(
                name=name,
                address=address if address else None,
                lat=float(lat),
                lng=float(lng),
                rating=float(row.get("rating", 0)) if not pd.isna(row.get("rating", 0)) else None,
                activities=activities_raw,
                image_url=image_url,
                description=". ".join(desc_parts) if desc_parts else None,
            )
            db.session.add(destination)
            inserted += 1

        db.session.commit()
        print(f"Done! Inserted {inserted} destinations, skipped {skipped}.")


if __name__ == "__main__":
    seed()
