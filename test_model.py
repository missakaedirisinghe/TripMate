import dill
import pandas as pd
from pprint import pprint

print("\n--- Testing TripMate Prediction Model ---")

model_path = "backend/Prediction Model/Recommendation Model.pkl"
print(f"Loading model from: {model_path}...")

try:
    with open(model_path, "rb") as f:
        model = dill.load(f)
    print("\nModel loaded successfully! ✅")
except Exception as e:
    print(f"Failed to load model: {e}")
    exit(1)

print("\n--- Model Attributes Inspection ---")
print(f"Type: {type(model)}")
if hasattr(model, 'places_df'):
    df = model.places_df
    print(f"\nPlaces DataFrame Shape: {df.shape}")
    print(f"Available Columns: {df.columns.tolist()[:10]}...")
    print(f"Sample Locations: {df['name'].head(3).tolist()}")

print("\n--- Running a Prediction Test ---")

# Mock User Inputs matching what the backend would send
test_activities = ["wildlife", "nature", "hiking"]
test_bucket_list = ["Yala", "Ella"]

print(f"Input Activities:  {test_activities}")
print(f"Input Bucket List: {test_bucket_list}\n")

if hasattr(model, 'recommend_top_places'):
    recommended_route = model.recommend_top_places(test_activities, test_bucket_list)
    
    print("🎯 Model Prediction (Optimized Route / Recommendations):")
    for i, place in enumerate(recommended_route, 1):
        print(f"  {i}. {place}")
        
    print("\nExtracting place details from internal DataFrame:")
    for place in recommended_route:
        match = df[df['name'] == place]
        if not match.empty:
            row = match.iloc[0]
            rating = row.get("rating", "N/A")
            print(f"  - {place} (⭐ {rating})")
else:
    print("Method 'recommend_top_places' not found on this model object.")
