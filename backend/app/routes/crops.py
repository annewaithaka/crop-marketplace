"""
Crop listing routes.
"""
from __future__ import annotations

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_

from app import db
from app.models import Crop, User
from app.utils.authz import require_roles

bp = Blueprint("crops", __name__)

ALLOWED_UNITS = {"kg", "bag"}


def _parse_positive_float(value, field_name: str):
    try:
        f = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a number")
    if f <= 0:
        raise ValueError(f"{field_name} must be greater than 0")
    return f


@bp.get("")
@jwt_required(optional=True)
def list_crops():
    name = (request.args.get("name") or "").strip()
    location = (request.args.get("location") or "").strip()
    min_price = request.args.get("min_price")
    max_price = request.args.get("max_price")

    q = Crop.query
    conds = []
    if name:
        conds.append(Crop.name.ilike(f"%{name}%"))
    if location:
        conds.append(Crop.location.ilike(f"%{location}%"))
    if min_price not in (None, ""):
        conds.append(Crop.price_per_unit >= float(min_price))
    if max_price not in (None, ""):
        conds.append(Crop.price_per_unit <= float(max_price))
    if conds:
        q = q.filter(and_(*conds))

    crops = q.order_by(Crop.created_at.desc()).limit(200).all()

    def to_dict(c: Crop):
        farmer = User.query.get(c.farmer_id)
        return {
            "id": c.id,
            "name": c.name,
            "quantity": c.quantity,
            "unit": c.unit,
            "price_per_unit": c.price_per_unit,
            "location": c.location,
            "created_at": c.created_at.isoformat(),
            "farmer": {
                "id": farmer.id,
                "name": farmer.name,
                "email": farmer.email,
                "phone": farmer.phone,
            } if farmer else None,
        }

    return {"items": [to_dict(c) for c in crops]}


@bp.post("")
@require_roles("farmer")
def create_crop():
    uid = int(get_jwt_identity())
    payload = request.get_json(force=True) or {}

    name = (payload.get("name") or "").strip()
    location = (payload.get("location") or "").strip()
    unit = (payload.get("unit") or "").strip().lower()
    quantity_raw = payload.get("quantity")
    price_raw = payload.get("price_per_unit")

    if not name or not location or quantity_raw is None or price_raw is None or not unit:
        return {"error": "name, location, unit, quantity, price_per_unit are required"}, 400
    if unit not in ALLOWED_UNITS:
        return {"error": f"unit must be one of: {', '.join(sorted(ALLOWED_UNITS))}"}, 400

    try:
        quantity = _parse_positive_float(quantity_raw, "quantity")
        price_per_unit = _parse_positive_float(price_raw, "price_per_unit")
    except ValueError as e:
        return {"error": str(e)}, 400

    crop = Crop(
        farmer_id=uid,
        name=name,
        location=location,
        unit=unit,
        quantity=quantity,
        price_per_unit=price_per_unit,
    )
    db.session.add(crop)
    db.session.commit()
    return {"message": "created", "id": crop.id}, 201


@bp.get("/mine")
@require_roles("farmer")
def my_crops():
    uid = int(get_jwt_identity())
    crops = Crop.query.filter_by(farmer_id=uid).order_by(Crop.created_at.desc()).all()
    return {"items": [{
        "id": c.id,
        "name": c.name,
        "quantity": c.quantity,
        "unit": c.unit,
        "price_per_unit": c.price_per_unit,
        "location": c.location,
        "created_at": c.created_at.isoformat(),
    } for c in crops]}


@bp.put("/<int:crop_id>")
@require_roles("farmer")
def update_crop(crop_id: int):
    uid = int(get_jwt_identity())
    crop = Crop.query.get(crop_id)
    if not crop or crop.farmer_id != uid:
        return {"error": "not found"}, 404

    payload = request.get_json(force=True) or {}

    if "name" in payload and payload["name"] is not None:
        crop.name = str(payload["name"]).strip()
    if "location" in payload and payload["location"] is not None:
        crop.location = str(payload["location"]).strip()
    if "unit" in payload and payload["unit"] is not None:
        unit = str(payload["unit"]).strip().lower()
        if unit not in ALLOWED_UNITS:
            return {"error": f"unit must be one of: {', '.join(sorted(ALLOWED_UNITS))}"}, 400
        crop.unit = unit
    if "quantity" in payload and payload["quantity"] is not None:
        try:
            crop.quantity = _parse_positive_float(payload["quantity"], "quantity")
        except ValueError as e:
            return {"error": str(e)}, 400
    if "price_per_unit" in payload and payload["price_per_unit"] is not None:
        try:
            crop.price_per_unit = _parse_positive_float(payload["price_per_unit"], "price_per_unit")
        except ValueError as e:
            return {"error": str(e)}, 400

    db.session.commit()
    return {"message": "updated"}


@bp.delete("/<int:crop_id>")
@require_roles("farmer")
def delete_crop(crop_id: int):
    uid = int(get_jwt_identity())
    crop = Crop.query.get(crop_id)
    if not crop or crop.farmer_id != uid:
        return {"error": "not found"}, 404

    db.session.delete(crop)
    db.session.commit()
    return {"message": "deleted"}
