import os
import json
from app import create_app, db
from app.models import User

app = create_app()

with app.test_client() as client:
    with app.app_context():
        user = User.query.first()
        from flask_jwt_extended import create_access_token
        token = create_access_token(identity=user.id)
        
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "activities": ["sightseeing"],
            "bucket_list": ["Ella", "Sigiriya"],
            "destination_days": {"Ella": 2, "Sigiriya": 1},
            "duration": 3
        }
        res = client.post("/api/recommend", json=payload, headers=headers)
        data = res.get_json()
        
        print("Route:")
        for r in data.get("recommended_route", []):
            print(f"Day {r.get('day')} - [{r.get('category', 'none')}] {r.get('title')}: {r.get('name')}")
