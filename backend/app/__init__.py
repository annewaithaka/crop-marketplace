"""
Flask application factory.
- Uses SQLite + SQLAlchemy
- JWT auth
- Roles: farmer, buyer, admin
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
jwt = JWTManager()


def _load_env(app: Flask) -> None:
    # deterministic: backend/.env
    env_path = Path(app.root_path).parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
    else:
        load_dotenv()


def _ensure_sqlite_dir(db_uri: str) -> None:
    if not db_uri.startswith("sqlite:"):
        return

    if db_uri.startswith("sqlite:////"):
        abs_path = db_uri.replace("sqlite:////", "/")
        Path(abs_path).parent.mkdir(parents=True, exist_ok=True)
        return

    # sqlite:///relative/path.db
    rel = db_uri.replace("sqlite:///", "")
    Path(rel).parent.mkdir(parents=True, exist_ok=True)


def create_app() -> Flask:
    app = Flask(__name__, instance_relative_config=True)
    _load_env(app)

    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///instance/app.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    _ensure_sqlite_dir(app.config["SQLALCHEMY_DATABASE_URI"])

    cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    CORS(app, resources={r"/api/*": {"origins": cors_origins.split(",")}}, supports_credentials=True)

    db.init_app(app)
    jwt.init_app(app)

    from app.models import User  # noqa: F401
    from app.routes.auth import bp as auth_bp
    from app.routes.crops import bp as crops_bp
    from app.routes.orders import bp as orders_bp
    from app.routes.admin import bp as admin_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(crops_bp, url_prefix="/api/crops")
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    with app.app_context():
        db.create_all()
        from app.services.bootstrap import ensure_admin_user
        ensure_admin_user()

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app
