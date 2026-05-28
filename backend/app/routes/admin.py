#backend/app/routes/admin.py
"""
Admin routes: user/crop/order management + reports.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from flask import Blueprint, request
from sqlalchemy import func, case

from app import db
from app.models import User, Crop, Order
from app.utils.authz import require_roles

bp = Blueprint("admin", __name__)


# ---------------------------------------------------------------------------
# Existing management endpoints
# ---------------------------------------------------------------------------

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


# Kept for backward compatibility with the old dashboard
@bp.get("/reports/summary")
@require_roles("admin")
def report_summary():
    users = User.query.count()
    crops = Crop.query.count()
    orders = Order.query.count()
    by_status = {s: Order.query.filter_by(status=s).count() for s in ["pending", "accepted", "rejected", "completed"]}
    return {"users": users, "crops": crops, "orders": orders, "orders_by_status": by_status}


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

def _parse_range():
    """
    Parse optional ?from=YYYY-MM-DD&to=YYYY-MM-DD query params.
    Returns (date_from, date_to) as datetimes or (None, None) for all-time.
    `to` is treated as inclusive end-of-day.
    """
    f = (request.args.get("from") or "").strip()
    t = (request.args.get("to") or "").strip()

    date_from = None
    date_to = None
    if f:
        try:
            date_from = datetime.strptime(f, "%Y-%m-%d")
        except ValueError:
            pass
    if t:
        try:
            date_to = datetime.strptime(t, "%Y-%m-%d") + timedelta(days=1)
        except ValueError:
            pass

    return date_from, date_to


def _apply_range(query, column, date_from, date_to):
    if date_from is not None:
        query = query.filter(column >= date_from)
    if date_to is not None:
        query = query.filter(column < date_to)
    return query


def _order_value_expression():
    """
    Per-order monetary value:
    - If proposed_price is set: proposed_price * quantity_requested
    - Else: crops.price_per_unit * quantity_requested
    """
    return case(
        (Order.proposed_price.isnot(None), Order.proposed_price * Order.quantity_requested),
        else_=Crop.price_per_unit * Order.quantity_requested,
    )


@bp.get("/reports/kpis")
@require_roles("admin")
def report_kpis():
    date_from, date_to = _parse_range()

    users_q = User.query
    users_q = _apply_range(users_q, User.created_at, date_from, date_to)
    users_count = users_q.count()

    crops_q = Crop.query
    crops_q = _apply_range(crops_q, Crop.created_at, date_from, date_to)
    crops_count = crops_q.count()
    active_listings = crops_q.filter(Crop.quantity > 0).count()

    orders_q = Order.query
    orders_q = _apply_range(orders_q, Order.created_at, date_from, date_to)
    orders_count = orders_q.count()

    val_expr = _order_value_expression()
    gmv_q = (
        db.session.query(func.coalesce(func.sum(val_expr), 0.0))
        .select_from(Order)
        .join(Crop, Crop.id == Order.crop_id)
        .filter(Order.status.in_(["accepted", "completed"]))
    )
    gmv_q = _apply_range(gmv_q, Order.created_at, date_from, date_to)
    gmv = float(gmv_q.scalar() or 0.0)

    return {
        "users": users_count,
        "crops": crops_count,
        "active_listings": active_listings,
        "orders": orders_count,
        "gmv": round(gmv, 2),
    }


def _choose_bucket(date_from, date_to):
    if date_from is None or date_to is None:
        return "month"
    span_days = (date_to - date_from).days
    if span_days <= 31:
        return "day"
    if span_days <= 180:
        return "week"
    return "month"


def _bucket_label(dt: datetime, bucket: str) -> str:
    if bucket == "day":
        return dt.strftime("%Y-%m-%d")
    if bucket == "week":
        iso = dt.isocalendar()
        return f"{iso[0]}-W{iso[1]:02d}"
    return dt.strftime("%Y-%m")


@bp.get("/reports/orders-over-time")
@require_roles("admin")
def report_orders_over_time():
    date_from, date_to = _parse_range()

    orders_q = Order.query
    orders_q = _apply_range(orders_q, Order.created_at, date_from, date_to)
    orders = orders_q.with_entities(Order.created_at, Order.status).all()

    bucket = _choose_bucket(date_from, date_to)

    series = {}
    for created_at, status in orders:
        key = _bucket_label(created_at, bucket)
        if key not in series:
            series[key] = {"label": key, "total": 0, "accepted": 0, "completed": 0}
        series[key]["total"] += 1
        if status == "accepted":
            series[key]["accepted"] += 1
        elif status == "completed":
            series[key]["completed"] += 1

    items = sorted(series.values(), key=lambda r: r["label"])
    return {"bucket": bucket, "items": items}


def _safe_limit(default=10, max_value=50):
    raw = request.args.get("limit")
    if raw in (None, ""):
        return default
    try:
        n = int(raw)
    except (TypeError, ValueError):
        return default
    return max(1, min(n, max_value))


@bp.get("/reports/top-crops")
@require_roles("admin")
def report_top_crops():
    date_from, date_to = _parse_range()
    limit = _safe_limit()

    val_expr = _order_value_expression()

    q = (
        db.session.query(
            Crop.id.label("crop_id"),
            Crop.name.label("crop_name"),
            func.count(Order.id).label("orders_count"),
            func.coalesce(func.sum(Order.quantity_requested), 0.0).label("quantity_sold"),
            func.coalesce(func.sum(val_expr), 0.0).label("revenue"),
        )
        .select_from(Order)
        .join(Crop, Crop.id == Order.crop_id)
        .filter(Order.status.in_(["accepted", "completed"]))
    )
    # Apply range filter BEFORE group/order/limit
    q = _apply_range(q, Order.created_at, date_from, date_to)
    q = (
        q.group_by(Crop.id, Crop.name)
        .order_by(func.count(Order.id).desc(), func.sum(val_expr).desc())
        .limit(limit)
    )
    rows = q.all()

    return {
        "items": [
            {
                "crop_id": r.crop_id,
                "crop_name": r.crop_name,
                "orders_count": int(r.orders_count or 0),
                "quantity_sold": float(r.quantity_sold or 0.0),
                "revenue": round(float(r.revenue or 0.0), 2),
            }
            for r in rows
        ]
    }


@bp.get("/reports/top-farmers")
@require_roles("admin")
def report_top_farmers():
    date_from, date_to = _parse_range()
    limit = _safe_limit()

    val_expr = _order_value_expression()

    q = (
        db.session.query(
            User.id.label("user_id"),
            User.name.label("user_name"),
            User.email.label("user_email"),
            func.count(Order.id).label("orders_count"),
            func.coalesce(func.sum(val_expr), 0.0).label("revenue"),
        )
        .select_from(Order)
        .join(Crop, Crop.id == Order.crop_id)
        .join(User, User.id == Crop.farmer_id)
        .filter(Order.status.in_(["accepted", "completed"]))
    )
    q = _apply_range(q, Order.created_at, date_from, date_to)
    q = (
        q.group_by(User.id, User.name, User.email)
        .order_by(func.count(Order.id).desc(), func.sum(val_expr).desc())
        .limit(limit)
    )
    rows = q.all()

    return {
        "items": [
            {
                "user_id": r.user_id,
                "name": r.user_name,
                "email": r.user_email,
                "orders_count": int(r.orders_count or 0),
                "revenue": round(float(r.revenue or 0.0), 2),
            }
            for r in rows
        ]
    }


@bp.get("/reports/top-buyers")
@require_roles("admin")
def report_top_buyers():
    date_from, date_to = _parse_range()
    limit = _safe_limit()

    val_expr = _order_value_expression()

    q = (
        db.session.query(
            User.id.label("user_id"),
            User.name.label("user_name"),
            User.email.label("user_email"),
            func.count(Order.id).label("orders_count"),
            func.coalesce(func.sum(val_expr), 0.0).label("spend"),
        )
        .select_from(Order)
        .join(Crop, Crop.id == Order.crop_id)
        .join(User, User.id == Order.buyer_id)
    )
    q = _apply_range(q, Order.created_at, date_from, date_to)
    q = (
        q.group_by(User.id, User.name, User.email)
        .order_by(func.count(Order.id).desc(), func.sum(val_expr).desc())
        .limit(limit)
    )
    rows = q.all()

    return {
        "items": [
            {
                "user_id": r.user_id,
                "name": r.user_name,
                "email": r.user_email,
                "orders_count": int(r.orders_count or 0),
                "spend": round(float(r.spend or 0.0), 2),
            }
            for r in rows
        ]
    }


@bp.get("/reports/orders-by-county")
@require_roles("admin")
def report_orders_by_county():
    date_from, date_to = _parse_range()

    q = (
        db.session.query(
            func.coalesce(Crop.county, "Unknown").label("county"),
            func.count(Order.id).label("orders_count"),
        )
        .select_from(Order)
        .join(Crop, Crop.id == Order.crop_id)
    )
    q = _apply_range(q, Order.created_at, date_from, date_to)
    q = q.group_by(Crop.county).order_by(func.count(Order.id).desc())
    rows = q.all()

    return {
        "items": [
            {"county": r.county or "Unknown", "orders_count": int(r.orders_count or 0)}
            for r in rows
        ]
    }


@bp.get("/reports/funnel")
@require_roles("admin")
def report_funnel():
    """
    Order conversion funnel within the range.
    """
    date_from, date_to = _parse_range()

    base_q = Order.query
    base_q = _apply_range(base_q, Order.created_at, date_from, date_to)

    total = base_q.count()
    accepted = base_q.filter(Order.status.in_(["accepted", "completed"])).count()
    completed = base_q.filter(Order.status == "completed").count()
    rejected = base_q.filter(Order.status == "rejected").count()
    pending_now = base_q.filter(Order.status == "pending").count()

    def pct(n, d):
        return round((n / d) * 100, 1) if d else 0.0

    return {
        "stages": [
            {"key": "pending", "label": "All orders", "count": total, "pct_of_total": 100.0},
            {"key": "accepted", "label": "Accepted or completed", "count": accepted, "pct_of_total": pct(accepted, total)},
            {"key": "completed", "label": "Completed", "count": completed, "pct_of_total": pct(completed, total)},
        ],
        "rejected": rejected,
        "still_pending": pending_now,
    }