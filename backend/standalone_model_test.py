import sys
import os
import dill

# Ensure the app context path is correct
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

print("Loading model directly with dill...")

model_path = os.path.join("Prediction Model", "Recommendation Model.pkl")
with open(model_path, "rb") as f:
    model = dill.load(f)

print(f"Loaded: {type(model).__name__}")

# We can view the internal dataset!
df = model.places_df
print(f"Places database size: {df.shape}")

# Define a mock scenario
test_activities = ["wildlife", "nature", "hiking"]
test_bucket_list = ["Yala", "Ella"]

print(f"\nRequesting recommendations for -> Activities: {test_activities} | Bucket List: {test_bucket_list}")

# Generate Predictions
try:
    route = model.recommend_top_places(test_activities, test_bucket_list)

    print(f"\nRecommended Route ({len(route)} stops):")
    for i, place in enumerate(route, 1):
        match = df[df["name"] == place]
        if not match.empty:
            r = match.iloc[0]
            print(f"  {i}. {place}")
            print(f"     Location: ({r.get('lat', '?')}, {r.get('lng', '?')})")
            print(f"     Rating: {r.get('rating', 'N/A')}")
            print(f"     Address: {r.get('formatted_address', 'N/A')}")
except Exception as e:
    print(f"\n[ERROR] Model prediction failed: {e}")
    print("This is likely due to an environment mismatch between the machine that created the .pkl file and your current environment.")
