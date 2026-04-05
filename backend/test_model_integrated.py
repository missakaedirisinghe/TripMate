"""
Run the LocationRecommender predict methods with downgraded numpy.
All output to test_model_results.txt (UTF-8).
"""
import sys, os, io, traceback

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

out = io.open(os.path.join(os.path.dirname(__file__), "test_model_results.txt"), "w", encoding="utf-8")

def log(msg=""):
    out.write(msg + "\n")
    out.flush()

import numpy, sklearn
log("=== Environment ===")
log(f"numpy: {numpy.__version__}, sklearn: {sklearn.__version__}")
log("")

import dill

model_path = os.path.join(os.path.dirname(__file__), "Prediction Model", "Recommendation Model.pkl")
log("Loading model directly with dill...")
with open(model_path, "rb") as f:
    model = dill.load(f)
log(f"Loaded: {type(model).__name__}")
log(f"DataFrame: {model.places_df.shape}")
df = model.places_df
log("")

test_cases = [
    ("Wildlife + Nature lover", ["wildlife", "nature", "hiking"], ["Yala", "Ella"]),
    ("Beach + Surfing enthusiast", ["surfing", "beach", "snorkeling"], ["Mirissa", "Unawatuna"]),
    ("Culture + History buff", ["cultural", "temple", "history"], ["Sigiriya", "Kandy"]),
    ("Adventure seeker (empty bucket list)", ["adventure", "trekking", "waterfall"], []),
    ("Single activity: surfing", ["surfing"], []),
]

for label, activities, bucket_list in test_cases:
    log(f"=== {label} ===")
    log(f"  Activities : {activities}")
    log(f"  Bucket List: {bucket_list}")
    try:
        route = model.recommend_top_places(activities, bucket_list)
        log(f"  Recommended Route ({len(route)} stops):")
        for i, place in enumerate(route, 1):
            match = df[df["name"] == place]
            if not match.empty:
                r = match.iloc[0]
                log(f"    {i}. {place}")
                log(f"       Location: ({r.get('lat','?')}, {r.get('lng','?')})")
                log(f"       Rating: {r.get('rating','N/A')}")
                log(f"       Address: {r.get('formatted_address','N/A')}")
            else:
                log(f"    {i}. {place} (not in DF)")
    except Exception:
        log(f"  [ERROR] {traceback.format_exc()}")
    log("")

log("=== ALL TESTS COMPLETE ===")
out.close()
