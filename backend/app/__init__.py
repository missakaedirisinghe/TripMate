"""
TripMate Flask Application Factory

Initializes extensions, registers blueprints, and loads the ML model.
"""

from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()


def create_app(config_class=None):
    """Create and configure the Flask application.

    Args:
        config_class: Configuration class to use.
            Defaults to app.config.Config.

    Returns:
        Configured Flask application instance.
    """
    app = Flask(__name__)

    # Load configuration
    if config_class is None:
        from app.config import Config
        app.config.from_object(Config)
    else:
        app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Import models so Alembic can detect them
    from app import models  # noqa: F401

    # ML routing and recommendations now utilize dynamic TF-IDF and greedy routing directly
    # via the database (see app.routes.recommendations)

    # --- Register Blueprints ---

    from app.routes.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    from app.routes.trips import trips_bp
    app.register_blueprint(trips_bp, url_prefix="/api/trips")

    from app.routes.itinerary import itinerary_bp
    app.register_blueprint(itinerary_bp, url_prefix="/api/trips")

    from app.routes.votes import votes_bp
    app.register_blueprint(votes_bp, url_prefix="/api/trips")

    from app.routes.expenses import expenses_bp
    app.register_blueprint(expenses_bp, url_prefix="/api/trips")

    from app.routes.external import external_bp
    app.register_blueprint(external_bp, url_prefix="/api")

    from app.routes.recommendations import recommendations_bp
    app.register_blueprint(recommendations_bp, url_prefix="/api")

    # --- Health Check ---

    @app.route("/health")
    def health():
        """Health check endpoint for monitoring."""
        return jsonify({
            "status": "healthy",
            "service": "TripMate API",
            "ml_model_loaded": True, # Dynamic TF-IDF model is always available
        })

    return app
