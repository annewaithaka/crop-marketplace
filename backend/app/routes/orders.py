"""
Order routes.
"""
from __future__ import annotations

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from app import db
from app.models import Order, Crop
from app.utils.authz import require_roles

bp = Blueprint("orders", __name__)


def _parse_positive_float(value, field_name: str):
    try:
        f = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a number")
    if f <= 0:
        raise ValueError(f"{field_name} must be greater than 0")
    return f


@bp.post("")
@require_roles("buyer")
def create_order():
    uid = int(get_jwt_identity())
    payload = request.get_json(force=True) or {}

    crop_id = payload.get("crop_id")
    quantity_requested_raw = payload.get("quantity_requested")
    contact_details = (payload.get("contact_details") or "").strip()

    if not crop_id or quantity_requested_raw is None or not contact_details:
        return {"error": "crop_id, quantity_requested, contact_details are required"}, 400

    crop = Crop.query.get(int(crop_id))
    if not crop:
        return {"error": "crop not found"}, 404

    try:
        quantity_requested = _parse_positive_float(quantity_requested_raw, "quantity_requested")
    except ValueError as e:
        return {"error": str(e)}, 400

    order = Order(
        crop_id=crop.id,
        buyer_id=uid,
        quantity_requested=quantity_requested,
        contact_details=contact_details,
        status="pending",
    )
    db.session.add(order)
    db.session.commit()
    return {"message": "requested", "id": order.id}, 201


@bp.get("/mine")
@require_roles("buyer")
def my_orders():
    uid = int(get_jwt_identity())
    orders = Order.query.filter_by(buyer_id=uid).order_by(Order.created_at.desc()).all()
    return {"items": [{
        "id": o.id,
        "crop": {
            "id": o.crop.id,
            "name": o.crop.name,
            "location": o.crop.location,
            "price_per_unit": o.crop.price_per_unit,
            "unit": o.crop.unit,
            "farmer_id": o.crop.farmer_id,
        },
        "quantity_requested": o.quantity_requested,
        "contact_details": o.contact_details,
        "status": o.status,
        "created_at": o.created_at.isoformat(),
    } for o in orders]}


@bp.get("/incoming")
@require_roles("farmer")
def incoming_orders():
    uid = int(get_jwt_identity())
    orders = (
        Order.query.join(Crop, Order.crop_id == Crop.id)
        .filter(Crop.farmer_id == uid)
        .order_by(Order.created_at.desc())
        .all()
    )
    return {"items": [{
        "id": o.id,
        "crop": {"id": o.crop.id, "name": o.crop.name, "location": o.crop.location, "unit": o.crop.unit},
        "buyer_id": o.buyer_id,
        "quantity_requested": o.quantity_requested,
        "contact_details": o.contact_details,
        "status": o.status,
        "created_at": o.created_at.isoformat(),
    } for o in orders]}


@bp.put("/<int:order_id>/status")
@require_roles("farmer", "admin")
def update_status(order_id: int):
    payload = request.get_json(force=True) or {}
    status = (payload.get("status") or "").strip().lower()
    if status not in {"pending", "accepted", "rejected", "completed"}:
        return {"error": "invalid status"}, 400

    order = Order.query.get(order_id)
    if not order:
        return {"error": "not found"}, 404

    order.status = status
    db.session.commit()
    return {"message": "updated"}
