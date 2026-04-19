"""
TripMate Application Entry Point

Starts the Flask application with Socket.IO support using eventlet
for production-grade WebSocket handling.

Usage:
    python run.py
"""

import eventlet
eventlet.monkey_patch()

from app import create_app, socketio

app = create_app()

if __name__ == "__main__":
    socketio.run(
        app,
        host="0.0.0.0",
        port=8000,
        debug=True,
        use_reloader=True,
        log_output=True,
    )
