import sys
import os
import json

sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.routes.recommendations import recommendations_bp

app = create_app()
app.test_client() # initialize

with app.test_request_context(
    '/api/recommend',
    method='POST',
    json={
        "activities": ["surfing", "hiking"],
        "bucket_list": ["Mirissa", "Kandy"],
        "duration": 5,
        "max_budget": 150000,
        "destination_days": {"Mirissa": 3, "Kandy": 2}
    }
):
    try:
        from app.routes.recommendations import recommend
        # We need to bypass the token_required decorator.
        # Since we can't easily, let's just extract the inner function or mock the user.
        # Actually recommend.__wrapped__ gives the original function!
        original_recommend = recommend.__wrapped__
        
        # mock user
        class DummyUser:
            id = "test-user"
            
        res, status = original_recommend(DummyUser())
        data = json.loads(res.data)
        
        route = data.get("recommended_route", [])
        for idx, p in enumerate(route):
            print(f"Stop {idx+1}: Day {p.get('day')} - {p.get('title')} ({p.get('name')})")
            
    except Exception as e:
        print(e)
