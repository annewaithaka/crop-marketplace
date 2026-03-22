# backend/app/services/bootstrap.py
from __future__ import annotations

import os

from sqlalchemy import text

from app import db
from app.models import User
from app.services.security import hash_password


def ensure_admin_user() -> None:
    admin_email = os.getenv("ADMIN_EMAIL", "admin@local.test").strip().lower()
    admin_password = os.getenv("ADMIN_PASSWORD", "Admin123!")

    user = User.query.filter_by(email=admin_email).first()
    if user:
        if user.role != "admin":
            user.role = "admin"
            db.session.commit()
        return

    admin = User(
        name="System Admin",
        email=admin_email,
        phone="",
        role="admin",
        is_active=True,
        password_hash=hash_password(admin_password),
    )
    db.session.add(admin)
    db.session.commit()


def ensure_geo_columns() -> None:
    """
    Dev-friendly migration: add columns if missing.
    Keeps existing DBs working without manual resets.
    """
    cols = db.session.execute(text("PRAGMA table_info(crops)")).mappings().all()
    existing = {row["name"] for row in cols}

    alters: list[str] = []

    if "county" not in existing:
        alters.append("ALTER TABLE crops ADD COLUMN county TEXT")
    if "town" not in existing:
        alters.append("ALTER TABLE crops ADD COLUMN town TEXT")
    if "lat" not in existing:
        alters.append("ALTER TABLE crops ADD COLUMN lat REAL")
    if "lng" not in existing:
        alters.append("ALTER TABLE crops ADD COLUMN lng REAL")
    if "pickup_locked" not in existing:
        alters.append("ALTER TABLE crops ADD COLUMN pickup_locked BOOLEAN NOT NULL DEFAULT 0")

    for stmt in alters:
        db.session.execute(text(stmt))

    if alters:
        db.session.commit()


def ensure_order_v2_columns() -> None:
    """
    Module 5 migration: add proposed_price + delivery_notes to orders if missing.
    """
    cols = db.session.execute(text("PRAGMA table_info(orders)")).mappings().all()
    existing = {row["name"] for row in cols}

    alters: list[str] = []
    if "proposed_price" not in existing:
        alters.append("ALTER TABLE orders ADD COLUMN proposed_price REAL")
    if "delivery_notes" not in existing:
        alters.append("ALTER TABLE orders ADD COLUMN delivery_notes TEXT")

    for stmt in alters:
        db.session.execute(text(stmt))

    if alters:
        db.session.commit()


def ensure_order_messages_table() -> None:
    """
    Module 5 migration: lightweight message thread per order.
    """
    db.session.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS order_messages (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              order_id INTEGER NOT NULL,
              sender_id INTEGER NOT NULL,
              sender_role TEXT NOT NULL,
              message TEXT NOT NULL,
              created_at DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
              FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
              FOREIGN KEY(sender_id) REFERENCES users(id)
            )
            """
        )
    )
    db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_order_messages_order_id ON order_messages(order_id)"))
    db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_order_messages_sender_id ON order_messages(sender_id)"))
    db.session.commit()