# backend/app/models.py
from __future__ import annotations

from datetime import datetime

from app import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(160), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(60), nullable=True)
    role = db.Column(db.String(20), nullable=False)  # farmer|buyer|admin
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    crops = db.relationship("Crop", backref="farmer", lazy=True)


class Crop(db.Model):
    __tablename__ = "crops"

    id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    name = db.Column(db.String(120), nullable=False, index=True)
    quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(10), nullable=False, default="kg")  # kg|bag|crate|piece
    price_per_unit = db.Column(db.Float, nullable=False, index=True)

    location = db.Column(db.String(160), nullable=False, index=True)

    county = db.Column(db.String(80), nullable=True, index=True)
    town = db.Column(db.String(120), nullable=True, index=True)

    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)

    pickup_locked = db.Column(db.Boolean, default=False, nullable=False, index=True)

    pack_size_kg = db.Column(db.Float, nullable=True)
    min_order_qty = db.Column(db.Float, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    orders = db.relationship("Order", backref="crop", lazy=True, cascade="all, delete-orphan")
    images = db.relationship("CropImage", backref="crop", lazy=True, cascade="all, delete-orphan")


class CropImage(db.Model):
    __tablename__ = "crop_images"

    id = db.Column(db.Integer, primary_key=True)
    crop_id = db.Column(db.Integer, db.ForeignKey("crops.id"), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)  # stored relative path inside uploads
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    crop_id = db.Column(db.Integer, db.ForeignKey("crops.id"), nullable=False, index=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    quantity_requested = db.Column(db.Float, nullable=False)
    contact_details = db.Column(db.Text, nullable=False)

    # Module 5 additions
    proposed_price = db.Column(db.Float, nullable=True)
    delivery_notes = db.Column(db.Text, nullable=True)

    status = db.Column(db.String(30), nullable=False, default="pending")  # pending|accepted|rejected|completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    messages = db.relationship(
        "OrderMessage",
        backref="order",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="OrderMessage.created_at.asc()",
    )


class OrderMessage(db.Model):
    __tablename__ = "order_messages"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False, index=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    sender_role = db.Column(db.String(20), nullable=False)  # buyer|farmer|admin
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)