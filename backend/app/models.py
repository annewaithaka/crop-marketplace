"""
Database models.
"""
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
    unit = db.Column(db.String(10), nullable=False, default="kg")  # kg|bag
    price_per_unit = db.Column(db.Float, nullable=False, index=True)
    location = db.Column(db.String(160), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    orders = db.relationship("Order", backref="crop", lazy=True, cascade="all, delete-orphan")


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    crop_id = db.Column(db.Integer, db.ForeignKey("crops.id"), nullable=False, index=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    quantity_requested = db.Column(db.Float, nullable=False)
    contact_details = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(30), nullable=False, default="pending")  # pending|accepted|rejected|completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
