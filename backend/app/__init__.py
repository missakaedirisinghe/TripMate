from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from app.config import Config

db = SQLAlchemy()
migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)

    # Register blueprints (to be created)
    # from app.routes.auth import auth_bp
    # app.register_blueprint(auth_bp, url_prefix='/api/auth')

    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'message': 'TripMate API is running'}

    return app
