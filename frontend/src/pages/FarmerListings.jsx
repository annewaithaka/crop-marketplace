// frontend/src/pages/FarmerListings.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../context/ToastContext.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Lightbox from "../components/Lightbox.jsx";
import ImagePicker from "../components/ImagePicker.jsx";
import Modal from "../components/Modal.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { Link } from "react-router-dom";
import { formatKsh, formatNumber } from "../utils/format.js";

const UNITS = [
  { value: "kg",    label: "Kilograms (kg)" },
  { value: "bag",   label: "Bags (bag)" },
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
function fmtCoord(n) {
  if (n === null || n === undefined || n === "") return "";
  const v = Number(n);
  if (Number.isNaN(v)) return "";
  return v.toFixed(6);
}

/* ----------------------------- Edit modal ----------------------------- */

function EditListingModal({ crop, open, onClose, onSave }) {
  const pickupLocked = Boolean(crop?.pickup_locked);

  const [form, setForm] = useState({
    name: "",
    quantity: "",
    unit: "kg",
    price_per_unit: "",
    location: "",
    county: "",
    town: "",
    pack_size_kg: "",
    min_order_qty: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!crop) return;
    setForm({
      name: crop.name || "",
      quantity: String(crop.quantity ?? ""),
      unit: crop.unit || "kg",
      price_per_unit: String(crop.price_per_unit ?? ""),
      location: crop.location || "",
      county: crop.county ?? "",
      town: crop.town ?? "",
      pack_size_kg: crop.pack_size_kg ?? "",
      min_order_qty: crop.min_order_qty ?? "",
    });
    setErrors({});
  }, [crop]);

  const canEditPickup = useMemo(() => !pickupLocked, [pickupLocked]);

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
      else if (!Number.isNaN(qty) && minOrder > qty) next.min_order_qty = "Minimum order cannot exceed quantity.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const pack = toOptionalNumber(form.pack_size_kg);
      const minOrder = toOptionalNumber(form.min_order_qty);

      await onSave({
        name: form.name.trim(),
        unit: form.unit,
        quantity: Number(form.quantity),
        price_per_unit: Number(form.price_per_unit),
        pack_size_kg: pack === null ? null : pack,
        min_order_qty: minOrder === null ? null : minOrder,
        location: form.location.trim(),
        county: form.county.trim() ? form.county.trim() : null,
        town: form.town.trim() ? form.town.trim() : null,
        lat: crop.lat,
        lng: crop.lng,
      });
    } finally {
      setSaving(false);
    }
  }

  if (!crop) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit listing — ${crop.name}`}
      subtitle="Update details and pricing. Pickup location may be locked."
      wide
      footer={
        <>
          <button className="btn" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn primary" type="submit" form="edit-listing-form" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <form id="edit-listing-form" onSubmit={submit} noValidate>
        {pickupLocked && (
          <div className="banner warning" style={{ marginBottom: 14 }}>
            <span className="banner-title">Pickup location locked.</span>
            An order for this listing has been accepted, so the pickup pin and location labels can no longer be changed.
          </div>
        )}

        <div className="form-section">
          <div className="form-section-title">Basics</div>
          <div className="field">
            <label>Crop name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            {errors.name && <div className="field-error">{errors.name}</div>}
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">Quantity & price</div>
          <div className="form-row-3">
            <div className="field">
              <label>Quantity</label>
              <input
                className="input"
                type="number" min="0" step="0.01"
                value={form.quantity}
                onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
              />
              {errors.quantity && <div className="field-error">{errors.quantity}</div>}
            </div>
            <div className="field">
              <label>Unit</label>
              <select
                className="select"
                value={form.unit}
                onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
              >
                {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Price per unit (KSh)</label>
              <input
                className="input"
                type="number" min="0" step="0.01"
                value={form.price_per_unit}
                onChange={(e) => setForm((p) => ({ ...p, price_per_unit: e.target.value }))}
              />
              {errors.price_per_unit && <div className="field-error">{errors.price_per_unit}</div>}
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 12 }}>
            <div className="field">
              <label>Pack size (kg)</label>
              <input
                className="input"
                type="number" min="0" step="0.01"
                value={form.pack_size_kg}
                onChange={(e) => setForm((p) => ({ ...p, pack_size_kg: e.target.value }))}
              />
              <div className="field-help">Optional.</div>
              {errors.pack_size_kg && <div className="field-error">{errors.pack_size_kg}</div>}
            </div>
            <div className="field">
              <label>Minimum order qty</label>
              <input
                className="input"
                type="number" min="0" step="0.01"
                value={form.min_order_qty}
                onChange={(e) => setForm((p) => ({ ...p, min_order_qty: e.target.value }))}
              />
              <div className="field-help">Optional.</div>
              {errors.min_order_qty && <div className="field-error">{errors.min_order_qty}</div>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">Pickup location</div>
          <div className="field">
            <label>Location label</label>
            <input
              className="input"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              disabled={!canEditPickup}
              title={pickupLocked ? "Locked after an order is accepted" : ""}
            />
            <div className="field-help">Shown to buyers before they place an order.</div>
            {errors.location && <div className="field-error">{errors.location}</div>}
          </div>

          <div className="form-row" style={{ marginTop: 12 }}>
            <div className="field">
              <label>County</label>
              <input
                className="input"
                value={form.county ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, county: e.target.value }))}
                disabled={!canEditPickup}
              />
            </div>
            <div className="field">
              <label>Town</label>
              <input
                className="input"
                value={form.town ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, town: e.target.value }))}
                disabled={!canEditPickup}
              />
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 12 }}>
            <div className="field">
              <label>Latitude</label>
              <input className="input" value={fmtCoord(crop.lat)} readOnly />
            </div>
            <div className="field">
              <label>Longitude</label>
              <input className="input" value={fmtCoord(crop.lng)} readOnly />
            </div>
          </div>
          <div className="field-help" style={{ marginTop: 8 }}>
            Buyers only see exact coordinates after you accept their order.
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* ----------------------------- Image manager modal ----------------------------- */

function ManageImagesModal({ crop, open, onClose, onDeleteImage, onAddImages }) {
  const [pending, setPending] = useState([]);

  useEffect(() => {
    if (!open) setPending([]);
  }, [open]);

  if (!crop) return null;
  const currentCount = crop.images?.length || 0;
  const remaining = Math.max(0, 3 - currentCount);

  async function uploadNow() {
    if (pending.length === 0) return;
    await onAddImages(crop.id, currentCount, pending);
    setPending([]);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Photos — ${crop.name}`}
      subtitle={`${currentCount} of 3 used`}
      footer={
        <button className="btn" type="button" onClick={onClose}>Close</button>
      }
    >
      {currentCount > 0 ? (
        <div className="preview-grid">
          {crop.images.map((img, idx) => (
            <div key={img.id ?? `${img.url}-${idx}`} className="preview-tile">
              <img src={img.url} alt={`${crop.name} image ${idx + 1}`} />
              <div className="preview-actions">
                <div className="small" style={{ margin: 0 }}>Image {idx + 1}</div>
                <button
                  className="btn danger sm"
                  type="button"
                  onClick={() => onDeleteImage(crop.id, img.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="banner">No photos yet. Add up to 3 to attract buyers.</div>
      )}

      {remaining > 0 ? (
        <div style={{ marginTop: 16 }}>
          <div className="form-section-title">Add photos</div>
          <ImagePicker disabled={false} value={pending} onChange={setPending} />
          <div className="row" style={{ marginTop: 12 }}>
            <button
              className="btn primary"
              type="button"
              onClick={uploadNow}
              disabled={pending.length === 0}
            >
              Upload {pending.length > 0 ? `${Math.min(pending.length, remaining)} photo${pending.length > 1 ? "s" : ""}` : ""}
            </button>
            <span className="small">Up to {remaining} more.</span>
          </div>
        </div>
      ) : (
        <div className="banner" style={{ marginTop: 16 }}>
          You’ve reached the maximum of 3 photos. Delete one to add another.
        </div>
      )}
    </Modal>
  );
}

/* ----------------------------- Main page ----------------------------- */

export default function FarmerListings() {
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [pageError, setPageError] = useState("");

  const [query, setQuery] = useState("");

  const [editingCrop, setEditingCrop] = useState(null);
  const [managingCrop, setManagingCrop] = useState(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState("");
  const [lightboxTitle, setLightboxTitle] = useState("Image");

  async function load() {
    setPageError("");
    setLoadingList(true);
    try {
      const res = await api.myCrops();
      setItems(res.items || []);
      if (managingCrop) {
        const fresh = (res.items || []).find((c) => c.id === managingCrop.id);
        if (fresh) setManagingCrop(fresh);
      }
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

  // Client-side filter (matches name, location, town, county — case insensitive)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) => {
      const haystack = [c.name, c.location, c.town, c.county]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  async function onDeleteCrop(cropId) {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    try {
      await api.deleteCrop(cropId);
      toast.show({ type: "success", title: "Deleted", message: "Listing deleted." });
      await load();
    } catch (e) {
      toast.show({ type: "error", title: "Delete failed", message: e?.message || "Failed to delete listing." });
    }
  }

  async function onSaveEdit(payload) {
    if (!editingCrop) return;
    try {
      await api.updateCrop(editingCrop.id, payload);
      toast.show({ type: "success", title: "Saved", message: "Listing updated." });
      setEditingCrop(null);
      await load();
    } catch (e) {
      toast.show({ type: "error", title: "Update failed", message: e?.message || "Failed to update listing." });
    }
  }

  async function onDeleteImage(cropId, imageId) {
    if (!window.confirm("Delete this image?")) return;
    try {
      await api.deleteCropImage(cropId, imageId);
      toast.show({ type: "success", title: "Image deleted", message: "Removed image." });
      await load();
    } catch (e) {
      toast.show({ type: "error", title: "Image delete failed", message: e?.message || "Failed to delete image." });
    }
  }

  async function onAddImages(cropId, existingCount, files) {
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
      toast.show({ type: "error", title: "Upload failed", message: e?.message || "Failed to upload images." });
    }
  }

  function openLightbox(crop, idx) {
    setLightboxTitle(`${crop.name} — image ${idx + 1}/${crop.images.length}`);
    setLightboxSrc(crop.images[idx].url);
    setLightboxOpen(true);
  }

  const header = (
    <PageHeader
      title="My listings"
      subtitle="View and manage the crops you have for sale."
      right={
        <Link className="btn sm primary" to="/farmer/add">
          + New listing
        </Link>
      }
    />
  );

  if (loadingList && items.length === 0) {
    return (
      <>
        {header}
        <div className="card"><div className="small">Loading your listings…</div></div>
      </>
    );
  }

  if (!loadingList && items.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          title="No listings yet"
          message="Create your first crop listing and buyers will be able to send order requests."
          action={<Link className="btn primary" to="/farmer/add">Add your first listing</Link>}
        />
      </>
    );
  }

  const countLabel = query.trim()
    ? `${filtered.length} of ${items.length}`
    : `${items.length} listing${items.length === 1 ? "" : "s"}`;

  return (
    <>
      {header}

      <div className="listings-toolbar">
        <div className="listings-search">
          <span className="listings-search-icon" aria-hidden="true">🔍</span>
          <input
            className="input"
            type="search"
            placeholder="Search by crop, location, or town…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="listings-count">{countLabel}</div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matches"
          message={`No listings match "${query}". Try a different search.`}
          action={<button className="btn" onClick={() => setQuery("")}>Clear search</button>}
        />
      ) : (
        <div className="listings-grid">
          {filtered.map((c) => {
            const locked = Boolean(c.pickup_locked);

            return (
              <div key={c.id} className="card listing-card">
                <div className="listing-head">
                  <div>
                    <h3 className="listing-title">{c.name}</h3>
                    <div className="row" style={{ gap: 6, marginTop: 4 }}>
                      <span className="pill">{c.unit}</span>
                      {locked && <span className="pill warning">Locked</span>}
                    </div>
                  </div>
                  <div className="listing-price">
                    {formatKsh(c.price_per_unit, { precise: true })} / {c.unit}
                  </div>
                </div>

                {c.images?.length > 0 && (
                  <div className="thumb-row" aria-label="Listing thumbnails" style={{ marginTop: 10 }}>
                    {c.images.map((img, idx) => (
                      <div
                        key={img.id ?? `${img.url}-${idx}`}
                        className="thumb"
                        role="button"
                        tabIndex={0}
                        onClick={() => openLightbox(c, idx)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") openLightbox(c, idx);
                        }}
                        title={`Open image ${idx + 1}`}
                      >
                        <img src={img.url} alt={`${c.name} thumbnail ${idx + 1}`} loading="lazy" />
                      </div>
                    ))}
                  </div>
                )}

                <dl className="stat-list" style={{ marginTop: 12 }}>
                  <dt>Available</dt>
                  <dd>{formatNumber(c.quantity)} {c.unit}</dd>

                  {c.min_order_qty != null && (
                    <>
                      <dt>Min order</dt>
                      <dd>{formatNumber(c.min_order_qty)} {c.unit}</dd>
                    </>
                  )}

                  {c.pack_size_kg != null && (
                    <>
                      <dt>Pack size</dt>
                      <dd>{formatNumber(c.pack_size_kg)} kg</dd>
                    </>
                  )}

                  <dt>Location</dt>
                  <dd>{[c.town, c.county].filter(Boolean).join(", ") || c.location}</dd>

                  <dt>Photos</dt>
                  <dd>{c.images?.length || 0} of 3</dd>
                </dl>

                <div className="listing-actions">
                  <button
                    className="btn sm primary"
                    type="button"
                    onClick={() => setEditingCrop(c)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn sm"
                    type="button"
                    onClick={() => setManagingCrop(c)}
                  >
                    Photos
                  </button>
                  <button
                    className="btn sm danger"
                    type="button"
                    onClick={() => onDeleteCrop(c.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pageError && <div className="error" style={{ marginTop: 12 }}>{pageError}</div>}

      <EditListingModal
        crop={editingCrop}
        open={Boolean(editingCrop)}
        onClose={() => setEditingCrop(null)}
        onSave={onSaveEdit}
      />

      <ManageImagesModal
        crop={managingCrop}
        open={Boolean(managingCrop)}
        onClose={() => setManagingCrop(null)}
        onDeleteImage={onDeleteImage}
        onAddImages={onAddImages}
      />

      <Lightbox
        open={lightboxOpen}
        title={lightboxTitle}
        src={lightboxSrc}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
