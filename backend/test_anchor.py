import sys
import os
import json
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.models import Destination
from app.routes.recommendations import haversine

app = create_app()

with app.app_context():
    all_dests = Destination.query.all()
    dest_by_name = {d.name.lower(): d for d in all_dests}
    
    payload = {"destination_days": {"Mirissa": 3, "Kandy": 2}}
    anchor_sequence = list(payload["destination_days"].items())
    
    for i, (dest_name, num_days) in enumerate(anchor_sequence):
        anchor = dest_by_name.get(dest_name.lower())
        print(f"Index: {i}, DestName: {dest_name}, Anchor: {anchor.name if anchor else None}")
        if anchor:
            print(f"Anchor Coords: {anchor.lat}, {anchor.lng}")
            pit = dest_by_name.get("pitawala nature trail")
            if pit:
                dist = haversine(anchor.lat, anchor.lng, pit.lat, pit.lng)
                print(f"  Dist to Pitawala: {dist}")
