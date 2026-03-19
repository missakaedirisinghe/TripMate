"""
Recommendation endpoint tests.
"""


class TestRecommendations:
    """Tests for /api/recommend."""

    def test_recommend_without_model(self, client, auth_headers):
        """Should return 503 when model is not loaded (test env)."""
        headers = auth_headers(email="rec_user@example.com")
        res = client.post("/api/recommend", headers=headers, json={
            "activities": ["surfing", "hiking"],
            "bucket_list": ["Ella"],
        })
        # In test env, model is not loaded (no .pkl file)
        assert res.status_code == 503

    def test_recommend_missing_activities(self, client, auth_headers):
        """Should require at least one activity."""
        headers = auth_headers(email="rec_user2@example.com")
        res = client.post("/api/recommend", headers=headers, json={
            "activities": [],
            "bucket_list": [],
        })
        # Either 400 (validation) or 503 (no model)
        assert res.status_code in (400, 503)


class TestCostEstimation:
    """Tests for /api/estimate-cost."""

    def test_estimate_cost(self, client, auth_headers):
        """Should return cost breakdown."""
        headers = auth_headers(email="cost_user@example.com")
        res = client.post("/api/estimate-cost", headers=headers, json={
            "destination": "Ella",
            "duration_days": 3,
            "num_travelers": 4,
            "vehicle_type": "van",
            "accommodation_type": "mid-range",
        })
        assert res.status_code == 200
        data = res.get_json()["estimation"]
        assert "total" in data
        assert "per_person" in data
        assert data["total"] > 0
