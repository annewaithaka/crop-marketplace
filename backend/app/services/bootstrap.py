"""
Bootstrap tasks (create admin user).
"""
from __future__ import annotations

import os
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
