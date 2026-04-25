"""
Fetch Destination Images (Free & Fast)

Uses `duckduckgo-search` to quickly scrape high-quality image URLs
for destinations in our database without needing a paid Google API Key.
"""

import sys
import os
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import create_app, db
from app.models import Destination

def get_commons_image(query):
    import urllib.parse
    import requests
    encoded_query = urllib.parse.quote(f'{query} sri lanka')
    url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=filetype:bitmap|drawing -incategory:'Hidden_categories' {encoded_query}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json"
    headers = {'User-Agent': 'TripMateApp/1.0'}
    try:
        data = requests.get(url, headers=headers).json()
        pages = data.get('query', {}).get('pages', {})
        for page_id, page_data in pages.items():
            if 'imageinfo' in page_data:
                return page_data['imageinfo'][0]['thumburl']
    except Exception as e:
        print('Error fetching image:', e)
    return None

def fetch_images():
    app = create_app()
    with app.app_context():
        dests = Destination.query.filter(
            (Destination.image_url.like('%unsplash.com%')) | 
            (Destination.image_url.like('%bing.com%')) |
            (Destination.image_url.like('%duckduckgo%')) |
            (Destination.image_url == None)
        ).all()
        
        if not dests:
            print("No destinations need image updates!")
            return

        print(f"Found {len(dests)} destinations that need real images. Starting Wikimedia scrape...")

        updated_count = 0

        for idx, dest in enumerate(dests, 1):
            print(f"[{idx}/{len(dests)}] Searching Wikipedia Commons for: {dest.name}... ", end="")
            
            best_image = get_commons_image(dest.name)
            
            if best_image:
                dest.image_url = best_image
                db.session.add(dest)
                updated_count += 1
                print("Found!")
            else:
                print("No results.")
            
            time.sleep(0.5) # respect rate limits

        db.session.commit()
        print(f"Completed! Successfully updated {updated_count} destination images.")

if __name__ == "__main__":
    fetch_images()
