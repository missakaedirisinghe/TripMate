import os
from app import create_app
from app.models import Destination

app = create_app()
with app.app_context():
    d = Destination.query.filter(Destination.name.in_(['Mirissa', 'Kandy'])).all()
    for x in d:
        print(f'{x.name}: {x.lat}, {x.lng}')
