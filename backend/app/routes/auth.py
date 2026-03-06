"""
Auth routes: register/login/me.
"""
from __future__ import annotations

from flask import Blueprint, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt

from app import db
from app.models import User
from app.services.security import hash_password, verify_password

bp = Blueprint("auth", __name__)


@bp.post("/register")
def register():
    payload = request.get_json(force=True) or {}
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()
    role = (payload.get("role") or "").strip().lower()
    password = payload.get("password") or ""

    if role not in {"farmer", "buyer"}:
        return {"error": "role must be farmer or buyer"}, 400
    if not name or not email or not password:
        return {"error": "name, email, password are required"}, 400
    if User.query.filter_by(email=email).first():
        return {"error": "email already registered"}, 409

    user = User(
        name=name,
        email=email,
        phone=phone,
        role=role,
        is_active=True,
        password_hash=hash_password(password),
    )
    db.session.add(user)
    db.session.commit()
    return {"message": "registered"}, 201


@bp.post("/login")
def login():
    payload = request.get_json(force=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not verify_password(password, user.password_hash):
        return {"error": "invalid credentials"}, 401
    if not user.is_active:
        return {"error": "account deactivated"}, 403

    token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role,
            "is_active": user.is_active,
            "email": user.email,
            "name": user.name,
        },
    )
    return {
        "access_token": token,
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "is_active": user.is_active},
    }


@bp.get("/me")
@jwt_required()
def me():
    uid = int(get_jwt_identity())
    user = User.query.get(uid)
    if not user:
        return {"error": "not found"}, 404

    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "is_active": user.is_active,
            "claims": get_jwt(),
        }
    }
