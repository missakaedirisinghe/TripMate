"""
Fetch Destination Images (Free & Fast)

Uses `duckduckgo-search` to quickly scrape high-quality image URLs
for destinations in our database without needing a paid Google API Key.
"""

import sys
import os
import time

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import create_app, db
from app.models import Destination

try:
    from duckduckgo_search import DDGS
except ImportError:
    print("Please install duckduckgo-search first: pip install duckduckgo-search")
    sys.exit(1)


def fetch_images():
    app = create_app()
    with app.app_context():
        # Get all destinations that still have the Unsplash default fallback images
        # or have no image at all. (Our fallback script seeded them with unsplash.com)
        dests = Destination.query.filter(
            (Destination.image_url.like('%unsplash.com%')) | 
            (Destination.image_url == None)
        ).all()
        
        if not dests:
            print("No destinations need image updates!")
            return

        print(f"Found {len(dests)} destinations that need real images. Starting fast scrape...")

        # Initialize the stealthy DDGS client
        ddgs = DDGS()
        updated_count = 0

        for idx, dest in enumerate(dests, 1):
            query = f"{dest.name} Sri Lanka tourism high quality"
            print(f"[{idx}/{len(dests)}] Searching images for: {dest.name}... ", end="")
            
            try:
                # Get top 3 images to filter out bad links
                results = list(ddgs.images(query, max_results=3))
                
                if results and len(results) > 0:
                    best_image = results[0].get("image")
                    dest.image_url = best_image
                    db.session.add(dest)
                    updated_count += 1
                    print("Found!")
                else:
                    print("No results.")
                
            except Exception as e:
                print(f"Error: {e}")
            
            # Commit every 20 so we don't lose progress if it crashes
            if updated_count % 20 == 0:
                db.session.commit()
                
            # Sleep slightly to prevent rate limiting from DuckDuckGo
            time.sleep(1.5)
            
        # Final commit
        db.session.commit()
        print(f"\nDone! Successfully updated {updated_count} destination images for free.")

if __name__ == "__main__":
    fetch_images()
