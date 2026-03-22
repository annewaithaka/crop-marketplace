# backend/app/__init__.py
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, abort, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
jwt = JWTManager()


def _load_env(app: Flask) -> None:
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

    upload_dir = Path(app.instance_path) / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    app.config["UPLOAD_FOLDER"] = str(upload_dir)
    app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024  # 8MB total request

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
        from app.services.bootstrap import (
            ensure_admin_user,
            ensure_geo_columns,
            ensure_order_messages_table,
            ensure_order_v2_columns,
        )

        ensure_geo_columns()
        ensure_order_v2_columns()
        ensure_order_messages_table()
        ensure_admin_user()

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    @app.get("/uploads/<path:filename>")
    def uploads(filename: str):
        root = Path(app.config["UPLOAD_FOLDER"])
        safe_path = (root / filename).resolve()
        if root not in safe_path.parents and safe_path != root:
            abort(404)
        if not safe_path.exists():
            abort(404)
        return send_from_directory(root, filename)

    return app