"""
Authentication endpoint tests.
"""


class TestRegister:
    """Tests for /api/auth/register."""

    def test_register_success(self, client):
        """Should create user and return token."""
        res = client.post("/api/auth/register", json={
            "name": "John Doe",
            "email": "john@example.com",
            "password": "secure123",
        })
        assert res.status_code == 201
        data = res.get_json()
        assert "token" in data
        assert data["user"]["email"] == "john@example.com"
        assert data["user"]["name"] == "John Doe"

    def test_register_duplicate_email(self, client):
        """Should reject duplicate email."""
        payload = {"name": "User", "email": "dup@example.com", "password": "pass123"}
        client.post("/api/auth/register", json=payload)
        res = client.post("/api/auth/register", json=payload)
        assert res.status_code == 409

    def test_register_missing_fields(self, client):
        """Should require name, email, and password."""
        res = client.post("/api/auth/register", json={"name": "Only Name"})
        assert res.status_code == 400

    def test_register_short_password(self, client):
        """Should reject passwords shorter than 6 chars."""
        res = client.post("/api/auth/register", json={
            "name": "User", "email": "short@example.com", "password": "12345"
        })
        assert res.status_code == 400


class TestLogin:
    """Tests for /api/auth/login."""

    def test_login_success(self, client):
        """Should return token on valid credentials."""
        client.post("/api/auth/register", json={
            "name": "Jane", "email": "jane@example.com", "password": "pass123"
        })
        res = client.post("/api/auth/login", json={
            "email": "jane@example.com", "password": "pass123"
        })
        assert res.status_code == 200
        assert "token" in res.get_json()

    def test_login_wrong_password(self, client):
        """Should reject wrong password."""
        client.post("/api/auth/register", json={
            "name": "Jane", "email": "jane2@example.com", "password": "pass123"
        })
        res = client.post("/api/auth/login", json={
            "email": "jane2@example.com", "password": "wrong"
        })
        assert res.status_code == 401

    def test_login_nonexistent_user(self, client):
        """Should reject unknown email."""
        res = client.post("/api/auth/login", json={
            "email": "nobody@example.com", "password": "pass123"
        })
        assert res.status_code == 401


class TestProfile:
    """Tests for /api/auth/me."""

    def test_get_profile(self, client, auth_headers):
        """Should return user profile with preferences."""
        headers = auth_headers(name="Profile User", email="profile@example.com")
        res = client.get("/api/auth/me", headers=headers)
        assert res.status_code == 200
        user = res.get_json()["user"]
        assert user["name"] == "Profile User"
        assert "preferred_activities" in user

    def test_update_profile(self, client, auth_headers):
        """Should update profile fields."""
        headers = auth_headers(email="update@example.com")
        res = client.put("/api/auth/me", headers=headers, json={
            "name": "Updated Name",
            "preferred_activities": ["surfing", "hiking"],
            "bucket_list": ["Ella", "Mirissa"],
        })
        assert res.status_code == 200
        user = res.get_json()["user"]
        assert user["name"] == "Updated Name"
        assert "surfing" in user["preferred_activities"]

    def test_unauthorized_access(self, client):
        """Should reject requests without token."""
        res = client.get("/api/auth/me")
        assert res.status_code == 401
