// frontend/src/pages/FarmerListings.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../context/ToastContext.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Lightbox from "../components/Lightbox.jsx";
import ImagePicker from "../components/ImagePicker.jsx";

const UNITS = [
  { value: "kg", label: "Kilograms (kg)" },
  { value: "bag", label: "Bags (bag)" },
  { value: "crate", label: "Crates (crate)" },
  { value: "piece", label: "Pieces (piece)" },
];

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return NaN;
  return Number(value);
}

function toOptionalNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? NaN : n;
}

function clipToRemaining(existingCount, files) {
  const remaining = Math.max(0, 3 - Number(existingCount || 0));
  return (files || []).slice(0, remaining);
}

function EditForm({ crop, onCancel, onSave }) {
  const [form, setForm] = useState({
    name: crop.name || "",
    quantity: String(crop.quantity ?? ""),
    unit: crop.unit || "kg",
    price_per_unit: String(crop.price_per_unit ?? ""),
    location: crop.location || "",
    pack_size_kg: crop.pack_size_kg ?? "",
    min_order_qty: crop.min_order_qty ?? "",
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = "Crop name is required.";
    if (!form.location.trim()) next.location = "Location is required.";

    const qty = toNumber(form.quantity);
    if (Number.isNaN(qty)) next.quantity = "Quantity is required.";
    else if (qty <= 0) next.quantity = "Quantity must be greater than 0.";

    const ppu = toNumber(form.price_per_unit);
    if (Number.isNaN(ppu)) next.price_per_unit = "Price is required.";
    else if (ppu <= 0) next.price_per_unit = "Price must be greater than 0.";

    const pack = toOptionalNumber(form.pack_size_kg);
    if (pack !== null) {
      if (Number.isNaN(pack)) next.pack_size_kg = "Pack size must be a number.";
      else if (pack <= 0) next.pack_size_kg = "Pack size must be greater than 0.";
    }

    const minOrder = toOptionalNumber(form.min_order_qty);
    if (minOrder !== null) {
      if (Number.isNaN(minOrder)) next.min_order_qty = "Minimum order must be a number.";
      else if (minOrder <= 0) next.min_order_qty = "Minimum order must be greater than 0.";
      else if (!Number.isNaN(qty) && minOrder > qty)
        next.min_order_qty = "Minimum order cannot exceed quantity.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    setErrors({});
    if (!validate()) return;

    setSaving(true);
    try {
      const pack = toOptionalNumber(form.pack_size_kg);
      const minOrder = toOptionalNumber(form.min_order_qty);

      await onSave({
        name: form.name.trim(),
        location: form.location.trim(),
        unit: form.unit,
        quantity: Number(form.quantity),
        price_per_unit: Number(form.price_per_unit),
        pack_size_kg: pack === null ? null : pack,
        min_order_qty: minOrder === null ? null : minOrder,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid" style={{ marginTop: 10 }} noValidate>
      <div className="row">
        <div className="grid" style={{ flex: 1, minWidth: 220 }}>
          <label>Crop name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          {errors.name && <div className="error">{errors.name}</div>}
        </div>

        <div className="grid" style={{ flex: 1, minWidth: 220 }}>
          <label>Location</label>
          <input
            className="input"
            value={form.location}
            onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
          />
          {errors.location && <div className="error">{errors.location}</div>}
        </div>
      </div>

      <div className="row">
        <div className="grid" style={{ flex: 1, minWidth: 180 }}>
          <label>Quantity</label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={form.quantity}
            onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
          />
          {errors.quantity && <div className="error">{errors.quantity}</div>}
        </div>

        <div className="grid" style={{ flex: 1, minWidth: 180 }}>
          <label>Unit</label>
          <select
            className="select"
            value={form.unit}
            onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
          >
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid" style={{ flex: 1, minWidth: 180 }}>
          <label>Price per unit (KES)</label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={form.price_per_unit}
            onChange={(e) => setForm((p) => ({ ...p, price_per_unit: e.target.value }))}
          />
          {errors.price_per_unit && <div className="error">{errors.price_per_unit}</div>}
        </div>
      </div>

      <div className="row">
        <div className="grid" style={{ flex: 1, minWidth: 180 }}>
          <label>Pack size (kg) (optional)</label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={form.pack_size_kg}
            onChange={(e) => setForm((p) => ({ ...p, pack_size_kg: e.target.value }))}
          />
          {errors.pack_size_kg && <div className="error">{errors.pack_size_kg}</div>}
        </div>

        <div className="grid" style={{ flex: 1, minWidth: 180 }}>
          <label>Minimum order qty (optional)</label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={form.min_order_qty}
            onChange={(e) => setForm((p) => ({ ...p, min_order_qty: e.target.value }))}
          />
          {errors.min_order_qty && <div className="error">{errors.min_order_qty}</div>}
        </div>
      </div>

      <div className="row">
        <button className="btn primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button className="btn" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function FarmerListings() {
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [pageError, setPageError] = useState("");

  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState("");
  const [lightboxTitle, setLightboxTitle] = useState("Image");

  async function load() {
    setPageError("");
    setLoadingList(true);
    try {
      const res = await api.myCrops();
      setItems(res.items || []);
    } catch (e) {
      const msg = e?.message || "Failed to load crops.";
      setPageError(msg);
      toast.show({ type: "error", title: "Could not load listings", message: msg });
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onDeleteCrop(cropId) {
    const ok = window.confirm("Delete this listing? This cannot be undone.");
    if (!ok) return;

    try {
      await api.deleteCrop(cropId);
      toast.show({ type: "success", title: "Deleted", message: "Listing deleted." });
      await load();
    } catch (e) {
      toast.show({
        type: "error",
        title: "Delete failed",
        message: e?.message || "Failed to delete listing.",
      });
    }
  }

  async function onSaveEdit(cropId, payload) {
    try {
      await api.updateCrop(cropId, payload);
      toast.show({ type: "success", title: "Saved", message: "Listing updated." });
      setEditingId(null);
      await load();
    } catch (e) {
      toast.show({
        type: "error",
        title: "Update failed",
        message: e?.message || "Failed to update listing.",
      });
    }
  }

  async function onDeleteImage(cropId, imageId) {
    const ok = window.confirm("Delete this image?");
    if (!ok) return;

    try {
      await api.deleteCropImage(cropId, imageId);
      toast.show({ type: "success", title: "Image deleted", message: "Removed image." });
      await load();
    } catch (e) {
      toast.show({
        type: "error",
        title: "Image delete failed",
        message: e?.message || "Failed to delete image.",
      });
    }
  }

  async function onAddMoreImages(cropId, existingCount, files) {
    const clipped = clipToRemaining(existingCount, files);

    if (clipped.length === 0) {
      toast.show({ type: "warning", title: "No slots left", message: "This listing already has 3 images." });
      return;
    }

    try {
      await api.uploadCropImages(cropId, clipped);
      toast.show({ type: "success", title: "Uploaded", message: "Images uploaded." });
      await load();
    } catch (e) {
      toast.show({
        type: "error",
        title: "Upload failed",
        message: e?.message || "Failed to upload images.",
      });
    }
  }

  return (
    <>
      {loadingList ? (
        <div className="card">
          <div className="small">Loading your listings…</div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No listings yet"
          description="Add your first crop listing. Buyers will be able to request orders."
        />
      ) : (
        <div className="grid">
          {items.map((c) => {
            const isExpanded = expandedId === c.id;
            const isEditing = editingId === c.id;

            return (
              <div key={c.id} className="card listing-card">
                {/* Thumbnails-only (no big image) */}
                {c.images?.length > 0 && (
                  <div className="thumb-row" aria-label="Listing thumbnails">
                    {c.images.map((img, idx) => (
                      <div
                        key={img.id ?? `${img.url}-${idx}`}
                        className="thumb"
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setLightboxTitle(`${c.name} — image ${idx + 1}/${c.images.length}`);
                          setLightboxSrc(img.url);
                          setLightboxOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setLightboxTitle(`${c.name} — image ${idx + 1}/${c.images.length}`);
                            setLightboxSrc(img.url);
                            setLightboxOpen(true);
                          }
                        }}
                        title={`Open image ${idx + 1}`}
                      >
                        <img src={img.url} alt={`${c.name} thumbnail ${idx + 1}`} loading="lazy" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="kv">
                  <strong>{c.name}</strong>
                  <span className="pill">
                    KES {c.price_per_unit} / {c.unit}
                  </span>
                </div>

                <div className="small">
                  Qty: <b>{c.quantity}</b> {c.unit}
                </div>

                {c.min_order_qty != null && (
                  <div className="small">
                    Min order: <b>{c.min_order_qty}</b> {c.unit}
                  </div>
                )}

                {c.pack_size_kg != null && (
                  <div className="small">
                    Pack size: <b>{c.pack_size_kg}</b> kg
                  </div>
                )}

                <div className="small">Location: {c.location}</div>

                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn" type="button" onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                    {isExpanded ? "Hide tools" : "Manage"}
                  </button>
                  <button className="btn secondary" type="button" onClick={() => setEditingId(isEditing ? null : c.id)}>
                    {isEditing ? "Close edit" : "Edit"}
                  </button>
                  <button className="btn danger" type="button" onClick={() => onDeleteCrop(c.id)}>
                    Delete
                  </button>
                </div>

                {isEditing && (
                  <EditForm
                    crop={c}
                    onCancel={() => setEditingId(null)}
                    onSave={(payload) => onSaveEdit(c.id, payload)}
                  />
                )}

                {isExpanded && (
                  <div className="grid" style={{ marginTop: 10 }}>
                    <div className="small">
                      Images: <b>{c.images?.length || 0}</b>/3
                    </div>

                    {c.images?.length > 0 && (
                      <div className="preview-grid">
                        {c.images.map((img, idx) => (
                          <div key={img.id ?? `${img.url}-${idx}`} className="preview-tile">
                            <img src={img.url} alt={`${c.name} image ${idx + 1}`} />
                            <div className="preview-actions">
                              <div className="small" style={{ margin: 0 }}>
                                Image {idx + 1}
                              </div>
                              <button className="btn danger" type="button" onClick={() => onDeleteImage(c.id, img.id)}>
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {Number(c.images?.length || 0) < 3 && (
                      <div className="card" style={{ padding: 12 }}>
                        <div className="small" style={{ marginTop: 0 }}>
                          Add more images (up to 3 total).
                        </div>
                        <ImagePicker
                          disabled={false}
                          value={[]}
                          onChange={(files) => onAddMoreImages(c.id, c.images?.length || 0, files)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pageError && (
        <div className="error" style={{ marginTop: 10 }}>
          {pageError}
        </div>
      )}

      <Lightbox
        open={lightboxOpen}
        title={lightboxTitle}
        src={lightboxSrc}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}