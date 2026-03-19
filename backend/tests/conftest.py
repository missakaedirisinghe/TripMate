"""
Pytest fixtures for TripMate backend tests.

Uses in-memory SQLite for fast, isolated testing.
"""

import pytest

from app import create_app, db as _db
from app.config import TestConfig


@pytest.fixture(scope="session")
def app():
    """Create application for testing."""
    app = create_app(config_class=TestConfig)
    return app


@pytest.fixture(scope="function")
def db(app):
    """Create a fresh database for each test."""
    with app.app_context():
        _db.create_all()
        yield _db
        _db.session.rollback()
        _db.drop_all()


@pytest.fixture(scope="function")
def client(app, db):
    """Flask test client with database."""
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    """Register a user and return auth headers.

    Returns a function that creates users with unique emails.
    """
    counter = {"n": 0}

    def _make_headers(name="Test User", email=None, password="password123"):
        counter["n"] += 1
        if email is None:
            email = f"test{counter['n']}@example.com"

        # Register
        client.post("/api/auth/register", json={
            "name": name,
            "email": email,
            "password": password,
        })

        # Login
        res = client.post("/api/auth/login", json={
            "email": email,
            "password": password,
        })
        token = res.get_json()["token"]
        return {"Authorization": f"Bearer {token}"}

    return _make_headers
