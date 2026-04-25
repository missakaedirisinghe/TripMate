"""
Cost Estimation Model Training Script

Generates a synthetic Sri Lankan travel cost dataset and trains a
GradientBoostingRegressor for per-trip cost prediction.
The trained model is saved to backend/models/cost_model.pkl.

Usage:
    python -m scripts.train_cost_model

Features:
    - duration_days (int): 1–14
    - num_travelers (int): 1–15
    - vehicle_type (one-hot): car, van, bus, train
    - accommodation_type (one-hot): budget, mid-range, luxury
"""

import os
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

SEED = 42
np.random.seed(SEED)

ACCOMMODATION_RATES = {
    "budget":    {"mean": 3500,  "std": 800},
    "mid-range": {"mean": 9000,  "std": 2000},
    "luxury":    {"mean": 28000, "std": 6000},
}

TRANSPORT_RATES = {
    "car":   {"mean": 5500,  "std": 1200},
    "van":   {"mean": 8500,  "std": 2000},
    "bus":   {"mean": 1800,  "std": 400},
    "train": {"mean": 1200,  "std": 300},
}

FOOD_PER_PERSON_PER_DAY = {"mean": 2700, "std": 600}
ACTIVITIES_PER_DAY = {"mean": 5500, "std": 1500}

N_SAMPLES = 8000

VEHICLE_TYPES = list(TRANSPORT_RATES.keys())
ACCOMMODATION_TYPES = list(ACCOMMODATION_RATES.keys())


def generate_dataset(n_samples=N_SAMPLES):
    """Generate a synthetic travel cost dataset.

    Returns:
        pd.DataFrame with features and target 'total_cost'.
    """
    records = []

    for _ in range(n_samples):
        duration = np.random.randint(1, 15)
        num_travelers = np.random.randint(1, 16)
        vehicle = np.random.choice(VEHICLE_TYPES)
        accommodation = np.random.choice(ACCOMMODATION_TYPES)

        acc_rate = max(500, np.random.normal(
            ACCOMMODATION_RATES[accommodation]["mean"],
            ACCOMMODATION_RATES[accommodation]["std"],
        ))
        transport_rate = max(300, np.random.normal(
            TRANSPORT_RATES[vehicle]["mean"],
            TRANSPORT_RATES[vehicle]["std"],
        ))
        food_rate = max(500, np.random.normal(
            FOOD_PER_PERSON_PER_DAY["mean"],
            FOOD_PER_PERSON_PER_DAY["std"],
        ))
        activity_rate = max(1000, np.random.normal(
            ACTIVITIES_PER_DAY["mean"],
            ACTIVITIES_PER_DAY["std"],
        ))

        acc_cost = acc_rate * duration
        transport_cost = transport_rate * duration
        food_cost = food_rate * duration * num_travelers
        activities_cost = activity_rate * duration

        misc_factor = np.random.uniform(0.9, 1.15)
        total_cost = (acc_cost + transport_cost + food_cost + activities_cost) * misc_factor

        records.append({
            "duration_days": duration,
            "num_travelers": num_travelers,
            "vehicle_type": vehicle,
            "accommodation_type": accommodation,
            "accommodation_cost": round(acc_cost, 2),
            "transport_cost": round(transport_cost, 2),
            "food_cost": round(food_cost, 2),
            "activities_cost": round(activities_cost, 2),
            "total_cost": round(total_cost, 2),
        })

    return pd.DataFrame(records)


def train_model(df):
    """Train a GradientBoostingRegressor on the dataset.

    Args:
        df: DataFrame with features and 'total_cost' target.

    Returns:
        Tuple of (model, feature_columns, metrics_dict).
    """
    df_encoded = pd.get_dummies(df, columns=["vehicle_type", "accommodation_type"], drop_first=False)

    feature_cols = [c for c in df_encoded.columns if c not in (
        "total_cost", "accommodation_cost", "transport_cost", "food_cost", "activities_cost"
    )]

    X = df_encoded[feature_cols].values
    y = df_encoded["total_cost"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=SEED
    )

    model = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        min_samples_split=5,
        random_state=SEED,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    metrics = {
        "r2_score": round(r2_score(y_test, y_pred), 4),
        "mae": round(mean_absolute_error(y_test, y_pred), 2),
        "mean_total_cost": round(y.mean(), 2),
    }

    return model, feature_cols, metrics


def main():
    """Generate data, train model, and save to disk."""
    print("=" * 60)
    print("TripMate Cost Estimation Model Training")
    print("=" * 60)

    print("\n[1/3] Generating synthetic dataset...")
    df = generate_dataset()
    print(f"  ✓ Generated {len(df)} samples")
    print(f"  ✓ Duration range: {df['duration_days'].min()}-{df['duration_days'].max()} days")
    print(f"  ✓ Travelers range: {df['num_travelers'].min()}-{df['num_travelers'].max()}")
    print(f"  ✓ Cost range: LKR {df['total_cost'].min():,.0f} - LKR {df['total_cost'].max():,.0f}")

    print("\n[2/3] Training GradientBoostingRegressor...")
    model, feature_cols, metrics = train_model(df)
    print(f"  ✓ R² Score: {metrics['r2_score']}")
    print(f"  ✓ Mean Absolute Error: LKR {metrics['mae']:,.0f}")
    print(f"  ✓ Mean Total Cost: LKR {metrics['mean_total_cost']:,.0f}")

    print("\n[3/3] Saving model...")
    model_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "cost_model.pkl")

    joblib.dump({
        "model": model,
        "feature_columns": feature_cols,
        "vehicle_types": VEHICLE_TYPES,
        "accommodation_types": ACCOMMODATION_TYPES,
        "version": "1.0.0",
    }, model_path)

    file_size = os.path.getsize(model_path) / 1024
    print(f"  ✓ Saved to: {model_path} ({file_size:.1f} KB)")
    print(f"\n{'=' * 60}")
    print("Training complete!")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
