// frontend/src/pages/BuyerBrowse.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Modal from "../components/Modal.jsx";
import Lightbox from "../components/Lightbox.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatKsh, formatNumber } from "../utils/format.js";

function toNumber(v) {
  if (v === "" || v === null || v === undefined) return NaN;
  return Number(v);
}
function isBlank(v) {
  return v === null || v === undefined || String(v).trim() === "";
}

const RADIUS_OPTIONS = [
  { value: "10", label: "10 km" },
  { value: "25", label: "25 km" },
  { value: "50", label: "50 km" },
  { value: "100", label: "100 km" },
];

/* --------------------- Order request modal --------------------- */

function OrderRequestModal({ crop, open, onClose, onSubmit }) {
  const [quantity, setQuantity] = useState("");
  const [contact, setContact] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setQuantity("");
      setContact("");
      setProposedPrice("");
      setDeliveryNotes("");
      setErrors({});
      setSubmitting(false);
    }
  }, [open]);

  const estimatedTotal = useMemo(() => {
    if (!crop) return null;
    const q = toNumber(quantity);
    if (Number.isNaN(q) || q <= 0) return null;
    const unitPrice = isBlank(proposedPrice) ? crop.price_per_unit : toNumber(proposedPrice);
    if (Number.isNaN(unitPrice) || unitPrice <= 0) return null;
    return q * unitPrice;
  }, [crop, quantity, proposedPrice]);

  if (!crop) return null;

  function validate() {
    const next = {};
    const qty = toNumber(quantity);

    if (Number.isNaN(qty)) next.quantity = "Quantity is required.";
    else if (qty <= 0) next.quantity = "Quantity must be greater than 0.";
    else if (crop.min_order_qty != null && qty < crop.min_order_qty) {
      next.quantity = `Minimum order is ${crop.min_order_qty} ${crop.unit}.`;
    } else if (qty > crop.quantity) {
      next.quantity = `Only ${crop.quantity} ${crop.unit} available.`;
    }

    if (!isBlank(proposedPrice)) {
      const pp = toNumber(proposedPrice);
      if (Number.isNaN(pp)) next.proposed_price = "Proposed price must be a number.";
      else if (pp <= 0) next.proposed_price = "Proposed price must be greater than 0.";
    }

    if (!contact.trim()) next.contact = "Phone or email is required.";

    if (deliveryNotes && deliveryNotes.length > 2000) {
      next.delivery_notes = "Notes too long (max 2000 characters).";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        crop_id: crop.id,
        quantity_requested: Number(quantity),
        contact_details: contact.trim(),
        proposed_price: isBlank(proposedPrice) ? null : Number(proposedPrice),
        delivery_notes: deliveryNotes.trim() || null,
      });
    } catch (e2) {
      setErrors((p) => ({ ...p, form: e2?.message || "Failed to send request." }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Request order — ${crop.name}`}
      subtitle={`Listed at ${formatKsh(crop.price_per_unit, { precise: true })} / ${crop.unit}`}
      footer={
        <>
          <button className="btn" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button className="btn primary" type="submit" form="order-form" disabled={submitting}>
            {submitting ? "Sending…" : "Send request"}
          </button>
        </>
      }
    >
      <form id="order-form" onSubmit={submit} noValidate>
        <div className="form-section">
          <div className="form-section-title">Your order</div>

          <div className="field">
            <label>Quantity ({crop.unit})</label>
            <input
              className="input"
              type="number" min="0" step="0.01"
              placeholder={`Available: ${crop.quantity} ${crop.unit}`}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            {crop.min_order_qty != null && (
              <div className="field-help">Minimum order: {crop.min_order_qty} {crop.unit}.</div>
            )}
            {errors.quantity && <div className="field-error">{errors.quantity}</div>}
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label>Proposed price (KSh per {crop.unit})</label>
            <input
              className="input"
              type="number" min="0" step="0.01"
              placeholder={`Listed: ${crop.price_per_unit}`}
              value={proposedPrice}
              onChange={(e) => setProposedPrice(e.target.value)}
            />
            <div className="field-help">Leave blank to accept the listed price.</div>
            {errors.proposed_price && <div className="field-error">{errors.proposed_price}</div>}
          </div>

          {estimatedTotal !== null && (
            <div className="banner" style={{ marginTop: 12 }}>
              <span className="banner-title">Estimated total:</span>
              {formatKsh(estimatedTotal, { precise: true })}
            </div>
          )}
        </div>

        <div className="form-section">
          <div className="form-section-title">Delivery & contact</div>

          <div className="field">
            <label>Delivery notes</label>
            <textarea
              className="textarea"
              placeholder="e.g. Preferred pickup time, transport arrangements…"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
            />
            <div className="field-help">Optional.</div>
            {errors.delivery_notes && <div className="field-error">{errors.delivery_notes}</div>}
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label>Contact details</label>
            <textarea
              className="textarea"
              placeholder="Phone number, email, or any preferred contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
            {errors.contact && <div className="field-error">{errors.contact}</div>}
          </div>
        </div>

        {errors.form && <div className="field-error">{errors.form}</div>}
      </form>
    </Modal>
  );
}

/* --------------------- Main page --------------------- */

export default function BuyerBrowse() {
  const toast = useToast();

  const [filters, setFilters] = useState({
    name: "",
    location: "",
    county: "",
    town: "",
    min_price: "",
    max_price: "",
  });

  const [geo, setGeo] = useState({ lat: "", lng: "", radius_km: "25" });
  const distanceEnabled = useMemo(
    () => geo.lat !== "" && geo.lng !== "" && geo.radius_km !== "",
    [geo.lat, geo.lng, geo.radius_km]
  );

  const [showAdvanced, setShowAdvanced] = useState(false);

  const [items, setItems] = useState([]);
  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(false);

  const [orderingCrop, setOrderingCrop] = useState(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState("");
  const [lightboxTitle, setLightboxTitle] = useState("");

  async function load(nextFilters = filters, nextGeo = geo) {
    setPageError("");
    setLoading(true);
    try {
      const params = {
        ...nextFilters,
        ...(nextGeo.lat && nextGeo.lng
          ? { lat: nextGeo.lat, lng: nextGeo.lng, radius_km: nextGeo.radius_km }
          : {}),
      };
      const res = await api.listCrops(params);
      setItems(res.items || []);
    } catch (e) {
      const msg = e?.message || "Failed to load crops.";
      setPageError(msg);
      toast.show({ type: "error", title: "Search failed", message: msg });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.show({
        type: "error",
        title: "Geolocation unavailable",
        message: "Your browser does not support location.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const nextGeo = { ...geo, lat: String(lat), lng: String(lng) };
        setGeo(nextGeo);
        load(filters, nextGeo);
        toast.show({
          type: "success",
          title: "Location set",
          message: "Now showing crops within range.",
        });
      },
      () => {
        toast.show({
          type: "error",
          title: "Could not get location",
          message: "Enable location permission and try again.",
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function clearDistance() {
    const nextGeo = { ...geo, lat: "", lng: "" };
    setGeo(nextGeo);
    load(filters, nextGeo);
  }

  function clearAll() {
    const blank = { name: "", location: "", county: "", town: "", min_price: "", max_price: "" };
    const blankGeo = { lat: "", lng: "", radius_km: "25" };
    setFilters(blank);
    setGeo(blankGeo);
    load(blank, blankGeo);
  }

  async function submitOrder(payload) {
    try {
      await api.createOrder(payload);
      toast.show({
        type: "success",
        title: "Request sent",
        message: "The farmer will review your order.",
      });
      setOrderingCrop(null);
    } catch (e) {
      toast.show({
        type: "error",
        title: "Could not send request",
        message: e?.message || "Failed to send request.",
      });
      throw e; // bubble back to modal so it can show inline error
    }
  }

  function openLightbox(crop, idx) {
    setLightboxTitle(`${crop.name} — image ${idx + 1}/${crop.images.length}`);
    setLightboxSrc(crop.images[idx].url);
    setLightboxOpen(true);
  }

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some((v) => v && String(v).trim()) || distanceEnabled;
  }, [filters, distanceEnabled]);

  return (
    <div className="container">
      <PageHeader
        title="Browse crops"
        subtitle="Find crops near you and send an order request."
        right={
          hasActiveFilters ? (
            <button className="btn sm" type="button" onClick={clearAll}>
              Clear filters
            </button>
          ) : null
        }
      />

      {/* Filter toolbar */}
      <div className="browse-toolbar">
        <div className="browse-search-row">
          <div className="browse-search">
            <span className="browse-search-icon" aria-hidden="true">🔍</span>
            <input
              className="input"
              type="search"
              placeholder="Search by crop name (e.g. maize)…"
              value={filters.name}
              onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") load(); }}
            />
          </div>
          <button
            className="btn primary"
            type="button"
            onClick={() => load()}
            disabled={loading}
          >
            {loading ? "Searching…" : "Search"}
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
          >
            {showAdvanced ? "Hide filters" : "More filters"}
          </button>
        </div>

        {showAdvanced && (
          <div className="browse-advanced">
            <input
              className="input"
              placeholder="Location"
              value={filters.location}
              onChange={(e) => setFilters((p) => ({ ...p, location: e.target.value }))}
            />
            <input
              className="input"
              placeholder="County"
              value={filters.county}
              onChange={(e) => setFilters((p) => ({ ...p, county: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Town"
              value={filters.town}
              onChange={(e) => setFilters((p) => ({ ...p, town: e.target.value }))}
            />
            <input
              className="input"
              type="number" min="0"
              placeholder="Min price (KSh)"
              value={filters.min_price}
              onChange={(e) => setFilters((p) => ({ ...p, min_price: e.target.value }))}
            />
            <input
              className="input"
              type="number" min="0"
              placeholder="Max price (KSh)"
              value={filters.max_price}
              onChange={(e) => setFilters((p) => ({ ...p, max_price: e.target.value }))}
            />
          </div>
        )}

        <div className="browse-distance-row">
          {!distanceEnabled ? (
            <button className="btn sm" type="button" onClick={useMyLocation} disabled={loading}>
              📍 Use my location
            </button>
          ) : (
            <>
              <span className="distance-tag">📍 Within {geo.radius_km} km</span>
              <select
                className="select"
                style={{ maxWidth: 140, padding: "6px 10px", fontSize: "0.8125rem" }}
                value={geo.radius_km}
                onChange={(e) => {
                  const nextGeo = { ...geo, radius_km: e.target.value };
                  setGeo(nextGeo);
                  load(filters, nextGeo);
                }}
              >
                {RADIUS_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <button className="btn sm" type="button" onClick={clearDistance}>
                Clear
              </button>
            </>
          )}
          <span className="small" style={{ marginLeft: "auto" }}>
            {loading ? "Loading…" : `${items.length} result${items.length === 1 ? "" : "s"}`}
          </span>
        </div>
      </div>

      {pageError && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="error">{pageError}</div>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="card"><div className="small">Loading crops…</div></div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No crops found"
          message="Try a different search, broaden your filters, or clear them all."
          action={
            hasActiveFilters ? (
              <button className="btn primary" onClick={clearAll}>Clear filters</button>
            ) : null
          }
        />
      ) : (
        <div className="browse-grid">
          {items.map((c) => (
            <div key={c.id} className="card browse-card">
              <div className="listing-head">
                <div>
                  <h3 className="listing-title">{c.name}</h3>
                  <div className="row" style={{ gap: 6, marginTop: 4 }}>
                    <span className="pill">{c.unit}</span>
                    {typeof c.distance_km === "number" && (
                      <span className="distance-tag">~{c.distance_km} km</span>
                    )}
                  </div>
                </div>
                <div className="listing-price">
                  {formatKsh(c.price_per_unit, { precise: true })}
                </div>
              </div>

              {c.images?.length > 0 && (
                <div className="thumb-row" aria-label="Listing thumbnails">
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

                <dt>Farmer</dt>
                <dd>{c.farmer?.name || "—"}</dd>
              </dl>

              <div className="browse-card-footer">
                <button
                  className="btn primary"
                  style={{ width: "100%" }}
                  type="button"
                  onClick={() => setOrderingCrop(c)}
                >
                  Request order
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <OrderRequestModal
        crop={orderingCrop}
        open={Boolean(orderingCrop)}
        onClose={() => setOrderingCrop(null)}
        onSubmit={submitOrder}
      />

      <Lightbox
        open={lightboxOpen}
        title={lightboxTitle}
        src={lightboxSrc}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
