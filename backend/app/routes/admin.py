#backend/app/routes/admin.py
"""
Admin routes.
"""
from __future__ import annotations

from app import db
from app.models import User, Crop, Order
from app.utils.authz import require_roles
from flask import Blueprint, request

bp = Blueprint("admin", __name__)


@bp.get("/users")
@require_roles("admin")
def list_users():
    users = User.query.order_by(User.created_at.desc()).limit(500).all()
    return {"items": [{
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "phone": u.phone,
        "role": u.role,
        "is_active": u.is_active,
        "created_at": u.created_at.isoformat(),
    } for u in users]}


@bp.put("/users/<int:user_id>/active")
@require_roles("admin")
def set_user_active(user_id: int):
    payload = request.get_json(force=True) or {}
    is_active = payload.get("is_active")
    if is_active is None:
        return {"error": "validation failed", "errors": {"is_active": "is_active is required"}}, 400    

    u = User.query.get(user_id)
    if not u:
        return {"error": "not found"}, 404

    u.is_active = bool(is_active)
    db.session.commit()
    return {"message": "updated"}


@bp.get("/crops")
@require_roles("admin")
def list_crops():
    crops = Crop.query.order_by(Crop.created_at.desc()).limit(500).all()
    return {"items": [{
        "id": c.id,
        "farmer_id": c.farmer_id,
        "name": c.name,
        "quantity": c.quantity,
        "price_per_unit": c.price_per_unit,
        "location": c.location,
        "created_at": c.created_at.isoformat(),
    } for c in crops]}


@bp.delete("/crops/<int:crop_id>")
@require_roles("admin")
def remove_crop(crop_id: int):
    crop = Crop.query.get(crop_id)
    if not crop:
        return {"error": "not found"}, 404
    db.session.delete(crop)
    db.session.commit()
    return {"message": "deleted"}


@bp.get("/orders")
@require_roles("admin")
def list_orders():
    orders = Order.query.order_by(Order.created_at.desc()).limit(800).all()
    return {"items": [{
        "id": o.id,
        "crop_id": o.crop_id,
        "buyer_id": o.buyer_id,
        "quantity_requested": o.quantity_requested,
        "contact_details": o.contact_details,
        "status": o.status,
        "created_at": o.created_at.isoformat(),
    } for o in orders]}


@bp.get("/reports/summary")
@require_roles("admin")
def report_summary():
    users = User.query.count()
    crops = Crop.query.count()
    orders = Order.query.count()
    by_status = {s: Order.query.filter_by(status=s).count() for s in ["pending", "accepted", "rejected", "completed"]}
    return {"users": users, "crops": crops, "orders": orders, "orders_by_status": by_status}
