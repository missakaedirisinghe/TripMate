"""
Application configuration.

Loads environment variables from .env file and provides
configuration classes for different environments.
"""

import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration for all environments."""

    SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-fallback-secret-key-for-tripmate"
    SQLALCHEMY_DATABASE_URI = (
        os.environ.get("DATABASE_URL")
        or "postgresql://postgres:postgres@localhost:5432/tripmate"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_EXPIRATION_HOURS = int(os.environ.get("JWT_EXPIRATION_HOURS", 24))
    JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")

    MODEL_PATH = (
        os.environ.get("MODEL_PATH")
        or "../Prediction Model/Recommendation Model.pkl"
    )
    COST_MODEL_PATH = os.environ.get(
        "COST_MODEL_PATH",
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "cost_model.pkl"),
    )

    OPENWEATHERMAP_API_KEY = os.environ.get("OPENWEATHERMAP_API_KEY", "")
    YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")

    MAIL_SERVER = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", 587))
    MAIL_USE_TLS = os.environ.get("MAIL_USE_TLS", "true").lower() == "true"
    MAIL_USE_SSL = os.environ.get("MAIL_USE_SSL", "false").lower() == "true"
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER = os.environ.get(
        "MAIL_DEFAULT_SENDER",
        os.environ.get("MAIL_USERNAME", "noreply@tripmate.app"),
    )

    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")


class TestConfig(Config):
    """Testing configuration with in-memory SQLite."""

    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SECRET_KEY = "test-secret-key"
