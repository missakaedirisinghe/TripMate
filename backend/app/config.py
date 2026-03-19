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

    # Core
    SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-fallback-secret-key-for-tripmate"
    SQLALCHEMY_DATABASE_URI = (
        os.environ.get("DATABASE_URL")
        or "postgresql://postgres:postgres@localhost:5432/tripmate"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_EXPIRATION_HOURS = int(os.environ.get("JWT_EXPIRATION_HOURS", 24))
    JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")

    # ML Model
    MODEL_PATH = (
        os.environ.get("MODEL_PATH")
        or "../Prediction Model/Recommendation Model.pkl"
    )

    # External APIs
    OPENWEATHERMAP_API_KEY = os.environ.get("OPENWEATHERMAP_API_KEY", "")
    YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")


class TestConfig(Config):
    """Testing configuration with in-memory SQLite."""

    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SECRET_KEY = "test-secret-key"
