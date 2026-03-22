# backend/app/routes/crops.py
from __future__ import annotations

import shutil
from pathlib import Path
from uuid import uuid4

from flask import Blueprint, current_app, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_
from werkzeug.utils import secure_filename

from app import db
from app.models import Crop, CropImage, User, Order
from app.utils.authz import require_roles

bp = Blueprint("crops", __name__)

ALLOWED_UNITS = {"kg", "bag", "crate", "piece"}
ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGES_PER_CROP = 3


def _parse_positive_float(value, field_name: str) -> float:
    try:
        f = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a number")
    if f <= 0:
        raise ValueError(f"{field_name} must be greater than 0")
    return f


def _parse_optional_positive_float(value, field_name: str) -> float | None:
    if value in (None, ""):
        return None
    return _parse_positive_float(value, field_name)


def _parse_required_float(value, field_name: str) -> float:
    if value in (None, ""):
        raise ValueError(f"{field_name} is required")
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a number")


def _validate_lat_lng(lat: float, lng: float) -> dict:
    errs = {}
    if lat < -90 or lat > 90:
        errs["lat"] = "lat must be between -90 and 90"
    if lng < -180 or lng > 180:
        errs["lng"] = "lng must be between -180 and 180"
    return errs


def _public_upload_url(filename: str) -> str:
    base = request.host_url.rstrip("/")
    return f"{base}/uploads/{filename}"


def _images_to_dict(crop_id: int):
    imgs = CropImage.query.filter_by(crop_id=crop_id).order_by(CropImage.created_at.asc()).all()
    return [{"id": img.id, "url": _public_upload_url(img.filename)} for img in imgs]


def _validate_and_store_images(crop: Crop, files):
    if not files:
        return [], {"images": "No images provided."}

    existing = CropImage.query.filter_by(crop_id=crop.id).count()
    remaining = MAX_IMAGES_PER_CROP - existing
    if remaining <= 0:
        return [], {"images": f"Maximum {MAX_IMAGES_PER_CROP} images already uploaded."}

    if len(files) > remaining:
        return [], {"images": f"You can upload {remaining} more image(s) for this crop."}

    upload_root = Path(current_app.config["UPLOAD_FOLDER"])
    crop_dir = upload_root / str(crop.id)
    crop_dir.mkdir(parents=True, exist_ok=True)

    saved = []
    errors = {}

    for f in files:
        original = f.filename or ""
        if not original:
            errors["images"] = "One of the selected files has no filename."
            break

        safe_name = secure_filename(original)
        ext = Path(safe_name).suffix.lower()
        if ext not in ALLOWED_IMAGE_EXTS:
            errors["images"] = f"Invalid file type. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTS))}"
            break

        stored_name = f"{uuid4().hex}{ext}"
        rel_path = f"{crop.id}/{stored_name}"
        abs_path = crop_dir / stored_name

        f.save(abs_path)

        img = CropImage(crop_id=crop.id, filename=rel_path)
        db.session.add(img)
        saved.append(img)

    if errors:
        db.session.rollback()
        return [], errors

    db.session.commit()
    return saved, {}


def _crop_public_dict(c: Crop):
    farmer = User.query.get(c.farmer_id)
    return {
        "id": c.id,
        "name": c.name,
        "quantity": c.quantity,
        "unit": c.unit,
        "price_per_unit": c.price_per_unit,
        "location": c.location,
        "county": c.county,
        "town": c.town,
        "has_location": bool(c.lat is not None and c.lng is not None),
        "pack_size_kg": c.pack_size_kg,
        "min_order_qty": c.min_order_qty,
        "images": _images_to_dict(c.id),
        "created_at": c.created_at.isoformat(),
        "farmer": {
            "id": farmer.id,
            "name": farmer.name,
            "email": farmer.email,
            "phone": farmer.phone,
        }
        if farmer
        else None,
    }


def _crop_farmer_dict(c: Crop):
    return {
        "id": c.id,
        "name": c.name,
        "quantity": c.quantity,
        "unit": c.unit,
        "price_per_unit": c.price_per_unit,
        "location": c.location,
        "county": c.county,
        "town": c.town,
        "lat": c.lat,
        "lng": c.lng,
        "pickup_locked": bool(c.pickup_locked),
        "pack_size_kg": c.pack_size_kg,
        "min_order_qty": c.min_order_qty,
        "images": _images_to_dict(c.id),
        "created_at": c.created_at.isoformat(),
    }


@bp.get("")
@jwt_required(optional=True)
def list_crops():
    name = (request.args.get("name") or "").strip()
    location = (request.args.get("location") or "").strip()
    county = (request.args.get("county") or "").strip()
    town = (request.args.get("town") or "").strip()
    min_price = request.args.get("min_price")
    max_price = request.args.get("max_price")

    q = Crop.query
    conds = []

    if name:
        conds.append(Crop.name.ilike(f"%{name}%"))
    if location:
        conds.append(Crop.location.ilike(f"%{location}%"))
    if county:
        conds.append(Crop.county.ilike(f"%{county}%"))
    if town:
        conds.append(Crop.town.ilike(f"%{town}%"))

    errors = {}
    if min_price not in (None, ""):
        try:
            conds.append(Crop.price_per_unit >= float(min_price))
        except (TypeError, ValueError):
            errors["min_price"] = "min_price must be a number"

    if max_price not in (None, ""):
        try:
            conds.append(Crop.price_per_unit <= float(max_price))
        except (TypeError, ValueError):
            errors["max_price"] = "max_price must be a number"

    if errors:
        return {"error": "validation failed", "errors": errors}, 400

    if conds:
        q = q.filter(and_(*conds))

    crops = q.order_by(Crop.created_at.desc()).limit(200).all()
    return {"items": [_crop_public_dict(c) for c in crops]}


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

    county = (payload.get("county") or "").strip() or None
    town = (payload.get("town") or "").strip() or None

    lat_raw = payload.get("lat")
    lng_raw = payload.get("lng")

    pack_size_kg_raw = payload.get("pack_size_kg")
    min_order_qty_raw = payload.get("min_order_qty")

    errors = {}
    if not name:
        errors["name"] = "Crop name is required."
    if not location:
        errors["location"] = "Location is required."
    if not unit:
        errors["unit"] = "Unit is required."
    if quantity_raw is None:
        errors["quantity"] = "Quantity is required."
    if price_raw is None:
        errors["price_per_unit"] = "Price per unit is required."
    if lat_raw in (None, ""):
        errors["lat"] = "Pinned location is required."
    if lng_raw in (None, ""):
        errors["lng"] = "Pinned location is required."

    if errors:
        return {"error": "validation failed", "errors": errors}, 400

    if unit not in ALLOWED_UNITS:
        return {
            "error": "validation failed",
            "errors": {"unit": f"Unit must be one of: {', '.join(sorted(ALLOWED_UNITS))}"},
        }, 400

    try:
        quantity = _parse_positive_float(quantity_raw, "quantity")
    except ValueError as e:
        return {"error": "validation failed", "errors": {"quantity": str(e)}}, 400

    try:
        price_per_unit = _parse_positive_float(price_raw, "price_per_unit")
    except ValueError as e:
        return {"error": "validation failed", "errors": {"price_per_unit": str(e)}}, 400

    try:
        lat = _parse_required_float(lat_raw, "lat")
        lng = _parse_required_float(lng_raw, "lng")
    except ValueError as e:
        return {"error": "validation failed", "errors": {"location_pin": str(e)}}, 400

    ll_errs = _validate_lat_lng(lat, lng)
    if ll_errs:
        return {"error": "validation failed", "errors": ll_errs}, 400

    try:
        pack_size_kg = _parse_optional_positive_float(pack_size_kg_raw, "pack_size_kg")
    except ValueError as e:
        return {"error": "validation failed", "errors": {"pack_size_kg": str(e)}}, 400

    try:
        min_order_qty = _parse_optional_positive_float(min_order_qty_raw, "min_order_qty")
    except ValueError as e:
        return {"error": "validation failed", "errors": {"min_order_qty": str(e)}}, 400

    if min_order_qty is not None and min_order_qty > quantity:
        return {
            "error": "validation failed",
            "errors": {"min_order_qty": "min_order_qty cannot exceed available quantity."},
        }, 400

    crop = Crop(
        farmer_id=uid,
        name=name,
        location=location,
        county=county,
        town=town,
        lat=lat,
        lng=lng,
        pickup_locked=False,
        unit=unit,
        quantity=quantity,
        price_per_unit=price_per_unit,
        pack_size_kg=pack_size_kg,
        min_order_qty=min_order_qty,
    )
    db.session.add(crop)
    db.session.commit()
    return {"message": "created", "id": crop.id}, 201


@bp.put("/<int:crop_id>")
@require_roles("farmer")
def update_crop(crop_id: int):
    uid = int(get_jwt_identity())
    crop = Crop.query.get(crop_id)
    if not crop or crop.farmer_id != uid:
        return {"error": "not found"}, 404

    payload = request.get_json(force=True) or {}

    name = (payload.get("name") or "").strip()
    location = (payload.get("location") or "").strip()
    unit = (payload.get("unit") or "").strip().lower()
    quantity_raw = payload.get("quantity")
    price_raw = payload.get("price_per_unit")

    county = (payload.get("county") or "").strip() or None
    town = (payload.get("town") or "").strip() or None

    lat_raw = payload.get("lat")
    lng_raw = payload.get("lng")

    pack_size_kg_raw = payload.get("pack_size_kg")
    min_order_qty_raw = payload.get("min_order_qty")

    errors = {}
    if not name:
        errors["name"] = "Crop name is required."
    if not location:
        errors["location"] = "Location is required."
    if not unit:
        errors["unit"] = "Unit is required."
    if quantity_raw is None:
        errors["quantity"] = "Quantity is required."
    if price_raw is None:
        errors["price_per_unit"] = "Price per unit is required."
    if lat_raw in (None, ""):
        errors["lat"] = "Pinned location is required."
    if lng_raw in (None, ""):
        errors["lng"] = "Pinned location is required."

    if errors:
        return {"error": "validation failed", "errors": errors}, 400

    if unit not in ALLOWED_UNITS:
        return {
            "error": "validation failed",
            "errors": {"unit": f"Unit must be one of: {', '.join(sorted(ALLOWED_UNITS))}"},
        }, 400

    try:
        quantity = _parse_positive_float(quantity_raw, "quantity")
    except ValueError as e:
        return {"error": "validation failed", "errors": {"quantity": str(e)}}, 400

    try:
        price_per_unit = _parse_positive_float(price_raw, "price_per_unit")
    except ValueError as e:
        return {"error": "validation failed", "errors": {"price_per_unit": str(e)}}, 400

    try:
        lat = _parse_required_float(lat_raw, "lat")
        lng = _parse_required_float(lng_raw, "lng")
    except ValueError as e:
        return {"error": "validation failed", "errors": {"location_pin": str(e)}}, 400

    ll_errs = _validate_lat_lng(lat, lng)
    if ll_errs:
        return {"error": "validation failed", "errors": ll_errs}, 400

    try:
        pack_size_kg = _parse_optional_positive_float(pack_size_kg_raw, "pack_size_kg")
    except ValueError as e:
        return {"error": "validation failed", "errors": {"pack_size_kg": str(e)}}, 400

    try:
        min_order_qty = _parse_optional_positive_float(min_order_qty_raw, "min_order_qty")
    except ValueError as e:
        return {"error": "validation failed", "errors": {"min_order_qty": str(e)}}, 400

    if min_order_qty is not None and min_order_qty > quantity:
        return {
            "error": "validation failed",
            "errors": {"min_order_qty": "min_order_qty cannot exceed available quantity."},
        }, 400

    # Lock pinned pickup edits once an order has ever been accepted.
    # Uses persisted flag (set in orders.py) so accept->reject stays locked.
    if crop.pickup_locked:
        attempted_change = any(
            [
                (crop.lat is not None and float(crop.lat) != float(lat)),
                (crop.lng is not None and float(crop.lng) != float(lng)),
                (crop.county or None) != (county or None),
                (crop.town or None) != (town or None),
                (crop.location or "") != (location or ""),
            ]
        )
        if attempted_change:
            return {
                "error": "validation failed",
                "errors": {"location": "Pickup location is locked after an order has been accepted."},
            }, 400

    crop.name = name
    crop.location = location
    crop.county = county
    crop.town = town
    crop.lat = lat
    crop.lng = lng
    crop.unit = unit
    crop.quantity = quantity
    crop.price_per_unit = price_per_unit
    crop.pack_size_kg = pack_size_kg
    crop.min_order_qty = min_order_qty

    db.session.commit()
    return {"message": "updated"}


@bp.delete("/<int:crop_id>")
@require_roles("farmer")
def delete_crop(crop_id: int):
    uid = int(get_jwt_identity())
    crop = Crop.query.get(crop_id)
    if not crop or crop.farmer_id != uid:
        return {"error": "not found"}, 404

    upload_root = Path(current_app.config["UPLOAD_FOLDER"])
    crop_dir = upload_root / str(crop.id)
    try:
        if crop_dir.exists():
            shutil.rmtree(crop_dir, ignore_errors=True)
    except OSError:
        pass

    db.session.delete(crop)
    db.session.commit()
    return {"message": "deleted"}


@bp.get("/mine")
@require_roles("farmer")
def my_crops():
    uid = int(get_jwt_identity())
    crops = Crop.query.filter_by(farmer_id=uid).order_by(Crop.created_at.desc()).all()
    return {"items": [_crop_farmer_dict(c) for c in crops]}


@bp.get("/<int:crop_id>/images")
@jwt_required(optional=True)
def list_crop_images(crop_id: int):
    crop = Crop.query.get(crop_id)
    if not crop:
        return {"error": "not found"}, 404
    return {"items": _images_to_dict(crop_id)}


@bp.post("/<int:crop_id>/images")
@require_roles("farmer")
def upload_crop_images(crop_id: int):
    uid = int(get_jwt_identity())
    crop = Crop.query.get(crop_id)
    if not crop or crop.farmer_id != uid:
        return {"error": "not found"}, 404

    files = request.files.getlist("images")
    saved, errs = _validate_and_store_images(crop, files)
    if errs:
        return {"error": "validation failed", "errors": errs}, 400

    return {
        "message": "uploaded",
        "items": [{"id": img.id, "url": _public_upload_url(img.filename)} for img in saved],
    }, 201


@bp.delete("/<int:crop_id>/images/<int:image_id>")
@require_roles("farmer")
def delete_crop_image(crop_id: int, image_id: int):
    uid = int(get_jwt_identity())
    crop = Crop.query.get(crop_id)
    if not crop or crop.farmer_id != uid:
        return {"error": "not found"}, 404

    img = CropImage.query.get(image_id)
    if not img or img.crop_id != crop_id:
        return {"error": "not found"}, 404

    upload_root = Path(current_app.config["UPLOAD_FOLDER"])
    abs_path = (upload_root / img.filename).resolve()
    try:
        if abs_path.exists():
            abs_path.unlink()
    except OSError:
        pass

    db.session.delete(img)
    db.session.commit()
    return {"message": "deleted"}