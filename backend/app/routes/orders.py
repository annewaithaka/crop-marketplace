# backend/app/routes/orders.py
from __future__ import annotations

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from app import db
from app.models import Order, Crop, User
from app.utils.authz import require_roles

bp = Blueprint("orders", __name__)


def _parse_positive_float(value, field_name: str) -> float:
    try:
        f = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a number")
    if f <= 0:
        raise ValueError(f"{field_name} must be greater than 0")
    return f


def _pickup_location_for_buyer(order: Order) -> dict | None:
    status = (order.status or "").lower()
    if status not in {"accepted", "completed"}:
        return None
    c = order.crop
    if c is None or c.lat is None or c.lng is None:
        return None
    return {
        "lat": float(c.lat),
        "lng": float(c.lng),
        "county": c.county,
        "town": c.town,
        "location_label": c.location,
    }


@bp.post("")
@require_roles("buyer")
def create_order():
    uid = int(get_jwt_identity())
    payload = request.get_json(force=True) or {}

    crop_id = payload.get("crop_id")
    quantity_requested_raw = payload.get("quantity_requested")
    contact_details = (payload.get("contact_details") or "").strip()

    errors = {}
    if not crop_id:
        errors["crop_id"] = "crop_id is required."
    if quantity_requested_raw is None:
        errors["quantity_requested"] = "quantity_requested is required."
    if not contact_details:
        errors["contact_details"] = "contact_details is required."

    if errors:
        return {"error": "validation failed", "errors": errors}, 400

    crop = Crop.query.get(int(crop_id))
    if not crop:
        return {"error": "crop not found"}, 404

    try:
        quantity_requested = _parse_positive_float(quantity_requested_raw, "quantity_requested")
    except ValueError as e:
        return {"error": "validation failed", "errors": {"quantity_requested": str(e)}}, 400

    if crop.min_order_qty is not None and quantity_requested < crop.min_order_qty:
        return {
            "error": "validation failed",
            "errors": {"quantity_requested": f"Minimum order is {crop.min_order_qty} {crop.unit}."},
        }, 400

    if quantity_requested > crop.quantity:
        return {
            "error": "validation failed",
            "errors": {
                "quantity_requested": f"Requested quantity exceeds available ({crop.quantity} {crop.unit})."
            },
        }, 400

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
    return {
        "items": [
            {
                "id": o.id,
                "crop": {
                    "id": o.crop.id,
                    "name": o.crop.name,
                    "location": o.crop.location,
                    "price_per_unit": o.crop.price_per_unit,
                    "unit": o.crop.unit,
                    "farmer_id": o.crop.farmer_id,
                    "pack_size_kg": o.crop.pack_size_kg,
                    "min_order_qty": o.crop.min_order_qty,
                },
                "quantity_requested": o.quantity_requested,
                "contact_details": o.contact_details,
                "status": o.status,
                "created_at": o.created_at.isoformat(),
                "pickup_location": _pickup_location_for_buyer(o),
            }
            for o in orders
        ]
    }


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
    return {
        "items": [
            {
                "id": o.id,
                "crop": {
                    "id": o.crop.id,
                    "name": o.crop.name,
                    "location": o.crop.location,
                    "unit": o.crop.unit,
                    "pack_size_kg": o.crop.pack_size_kg,
                    "min_order_qty": o.crop.min_order_qty,
                    "county": o.crop.county,
                    "town": o.crop.town,
                    "lat": o.crop.lat,
                    "lng": o.crop.lng,
                    "pickup_locked": bool(o.crop.pickup_locked),
                },
                "buyer_id": o.buyer_id,
                "quantity_requested": o.quantity_requested,
                "contact_details": o.contact_details,
                "status": o.status,
                "created_at": o.created_at.isoformat(),
            }
            for o in orders
        ]
    }


def _is_transition_allowed(current: str, target: str) -> bool:
    if current == target:
        return True
    if current == "pending" and target in {"accepted", "rejected"}:
        return True
    if current == "accepted" and target in {"completed", "rejected"}:
        return True
    return False


@bp.put("/<int:order_id>/status")
@require_roles("farmer", "admin")
def update_status(order_id: int):
    uid = int(get_jwt_identity())
    user = User.query.get(uid)

    payload = request.get_json(force=True) or {}
    target = (payload.get("status") or "").strip().lower()

    if target not in {"pending", "accepted", "rejected", "completed"}:
        return {"error": "validation failed", "errors": {"status": "invalid status"}}, 400

    order = Order.query.get(order_id)
    if not order:
        return {"error": "not found"}, 404

    crop = Crop.query.get(order.crop_id)
    if not crop:
        return {"error": "not found"}, 404

    if user and user.role == "farmer" and crop.farmer_id != uid:
        return {"error": "not found"}, 404

    current = (order.status or "").lower()

    if current in {"rejected", "completed"} and target != current:
        return {
            "error": "validation failed",
            "errors": {"status": f"cannot change status from {current}"},
        }, 400

    if not _is_transition_allowed(current, target):
        return {
            "error": "validation failed",
            "errors": {"status": f"invalid transition: {current} -> {target}"},
        }, 400

    if current == target:
        return {"message": "updated"}

    qty = float(order.quantity_requested)

    # Reserve stock on accept + lock pickup edits forever (even if later rejected).
    if current == "pending" and target == "accepted":
        if qty > crop.quantity:
            return {
                "error": "validation failed",
                "errors": {
                    "status": f"insufficient stock to accept ({crop.quantity} {crop.unit} available)"
                },
            }, 400
        crop.quantity = float(crop.quantity) - qty
        crop.pickup_locked = True

    # Release reserved stock if rejecting an accepted order
    if current == "accepted" and target == "rejected":
        crop.quantity = float(crop.quantity) + qty

    # Completing an accepted order does not change quantity (already reserved on accept)

    order.status = target
    db.session.commit()
    return {"message": "updated"}