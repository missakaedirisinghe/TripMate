import os
from app import create_app, db
from app.models import Destination
app = create_app()
with app.app_context():
    food_dests = Destination.query.filter(
        (Destination.name.ilike('%cafe%')) |
        (Destination.name.ilike('%restaurant%')) |
        (Destination.name.ilike('%food%')) |
        (Destination.description.ilike('%restaurant%'))
    ).all()
    print(f"Found {len(food_dests)} food/restaurant destinations.")
    if food_dests:
        print([d.name for d in food_dests[:10]])
