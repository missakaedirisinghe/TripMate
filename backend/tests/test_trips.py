"""
Trip management endpoint tests.
"""


class TestTripCRUD:
    """Tests for trip CRUD operations."""

    def test_create_trip(self, client, auth_headers):
        """Should create trip and add creator as owner."""
        headers = auth_headers(email="trip_creator@example.com")
        res = client.post("/api/trips", headers=headers, json={
            "title": "Ella Adventure",
            "destination": "Ella",
            "description": "Weekend hiking trip",
            "budget_limit": 50000,
            "trip_type": "adventure",
        })
        assert res.status_code == 201
        trip = res.get_json()["trip"]
        assert trip["title"] == "Ella Adventure"
        assert trip["destination"] == "Ella"
        assert len(trip["members"]) == 1
        assert trip["members"][0]["role"] == "owner"

    def test_list_trips(self, client, auth_headers):
        """Should list user's trips."""
        headers = auth_headers(email="list_trips@example.com")
        client.post("/api/trips", headers=headers, json={
            "title": "Trip 1", "destination": "Kandy"
        })
        client.post("/api/trips", headers=headers, json={
            "title": "Trip 2", "destination": "Galle"
        })
        res = client.get("/api/trips", headers=headers)
        assert res.status_code == 200
        assert len(res.get_json()["trips"]) == 2

    def test_create_trip_missing_fields(self, client, auth_headers):
        """Should require title and destination."""
        headers = auth_headers(email="missing@example.com")
        res = client.post("/api/trips", headers=headers, json={"title": "No Dest"})
        assert res.status_code == 400


class TestTripMembers:
    """Tests for trip member management."""

    def test_invite_member(self, client, auth_headers):
        """Should add an existing user to a trip."""
        owner_headers = auth_headers(name="Owner", email="owner@example.com")
        auth_headers(name="Invitee", email="invitee@example.com")

        # Create trip
        res = client.post("/api/trips", headers=owner_headers, json={
            "title": "Group Trip", "destination": "Mirissa"
        })
        trip_id = res.get_json()["trip"]["id"]

        # Invite
        res = client.post(f"/api/trips/{trip_id}/invite", headers=owner_headers, json={
            "email": "invitee@example.com"
        })
        assert res.status_code == 201

    def test_invite_nonexistent_user(self, client, auth_headers):
        """Should reject invite for unknown email."""
        headers = auth_headers(email="inviter@example.com")
        res = client.post("/api/trips", headers=headers, json={
            "title": "Trip", "destination": "Colombo"
        })
        trip_id = res.get_json()["trip"]["id"]

        res = client.post(f"/api/trips/{trip_id}/invite", headers=headers, json={
            "email": "nobody@example.com"
        })
        assert res.status_code == 404
