import os
from app import create_app, db
from app.models import Destination
app = create_app()
with app.app_context():
    cats = db.session.query(Destination.category).distinct().all()
    print([c[0] for c in cats])
