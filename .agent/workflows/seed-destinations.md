---
description: How to seed the destinations database table with ML model places data
---

# Seed Destinations Table

This workflow loads the preprocessed places data from the ML model into the PostgreSQL `destinations` table.

## Steps

1. Create the seed script at `e:\TripMate\backend\scripts\seed_destinations.py`
   - Read `places_preprocessed.csv` from `Prediction Model/` folder
   - Map columns: `name`, `lat`, `lng`, `formatted_address` → `address`, `rating`, `extracted_activities` → `activities`
   - Add placeholder `image_url` using Unsplash search URLs
   - Insert rows into the `Destination` model via SQLAlchemy

// turbo
2. Run the seed script:
   ```
   cd e:\TripMate\backend
   python -m scripts.seed_destinations
   ```

3. Verify by hitting the API:
   ```
   curl http://localhost:8000/api/destinations
   ```
   - Should return all seeded destinations with lat/lng

4. Verify the landing page now shows dynamic destinations from the database
