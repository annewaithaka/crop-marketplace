"""
Role-based auth helpers for JWT-protected endpoints.
"""
from __future__ import annotations

from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt


def require_roles(*roles: str):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get("role")
            is_active = claims.get("is_active")

            if not is_active:
                return jsonify({"error": "Account is deactivated"}), 403
            if role not in roles:
                return jsonify({"error": "Forbidden"}), 403

            return fn(*args, **kwargs)

        return wrapper

    return decorator
