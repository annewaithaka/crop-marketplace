// frontend/src/pages/BuyerBrowse.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useToast } from "../context/ToastContext.jsx";
import Lightbox from "../components/Lightbox.jsx";

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return NaN;
  return Number(value);
}

function isBlank(v) {
  return v === null || v === undefined || String(v).trim() === "";
}

/**
 * Thumbnails-only gallery (no big image).
 * Clicking any thumbnail opens the lightbox.
 */
function ListingGalleryThumbs({ crop }) {
  const images = crop?.images || [];
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    setOpen(false);
    setActiveIdx(0);
  }, [crop?.id]);

  if (images.length === 0) return null;

  const active = images[activeIdx]?.url || images[0]?.url;

  return (
    <>
      <div className="thumb-row" aria-label="Listing thumbnails">
        {images.map((img, idx) => (
          <div
            key={img.id ?? `${img.url}-${idx}`}
            className={`thumb ${idx === activeIdx ? "thumb-active" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => {
              setActiveIdx(idx);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setActiveIdx(idx);
                setOpen(true);
              }
            }}
            aria-label={`Open image ${idx + 1}`}
            title={`Open image ${idx + 1}`}
          >
            <img src={img.url} alt={`${crop.name} thumbnail ${idx + 1}`} loading="lazy" />
          </div>
        ))}
      </div>

      <Lightbox open={open} title={`${crop.name} — image ${activeIdx + 1}/${images.length}`} src={active} onClose={() => setOpen(false)} />
    </>
  );
}

const RADIUS_OPTIONS = [
  { value: "10", label: "Within 10 km" },
  { value: "25", label: "Within 25 km" },
  { value: "50", label: "Within 50 km" },
];

export default function BuyerBrowse() {
  const toast = useToast();

  const [filters, setFilters] = useState({
    name: "",
    location: "",
    min_price: "",
    max_price: "",
    county: "",
    town: "",
  });

  const [geo, setGeo] = useState({
    lat: "",
    lng: "",
    radius_km: "25",
  });

  const distanceEnabled = useMemo(() => geo.lat !== "" && geo.lng !== "" && geo.radius_km !== "", [geo.lat, geo.lng, geo.radius_km]);

  const [items, setItems] = useState([]);
  const [pageError, setPageError] = useState("");
  const [loadingList, setLoadingList] = useState(false);

  const [orderCropId, setOrderCropId] = useState(null);
  const [quantityRequested, setQuantityRequested] = useState("");
  const [contactDetails, setContactDetails] = useState("");

  // Module 5 fields
  const [proposedPrice, setProposedPrice] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const [orderErrors, setOrderErrors] = useState({});
  const [placingOrder, setPlacingOrder] = useState(false);

  const activeCrop = useMemo(() => items.find((c) => c.id === orderCropId) || null, [items, orderCropId]);

  async function load(nextFilters = filters, nextGeo = geo) {
    setPageError("");
    setLoadingList(true);
    try {
      const params = {
        ...nextFilters,
        ...(nextGeo.lat && nextGeo.lng ? { lat: nextGeo.lat, lng: nextGeo.lng, radius_km: nextGeo.radius_km } : {}),
      };
      const res = await api.listCrops(params);
      setItems(res.items || []);
    } catch (e) {
      const msg = e?.message || "Failed to load crops.";
      setPageError(msg);
      toast.show({ type: "error", title: "Search failed", message: msg });
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetOrderForm() {
    setOrderCropId(null);
    setQuantityRequested("");
    setContactDetails("");
    setProposedPrice("");
    setDeliveryNotes("");
    setOrderErrors({});
    setPlacingOrder(false);
  }

  function validateOrder() {
    const next = {};
    const qty = toNumber(quantityRequested);

    if (!orderCropId) next.crop = "Select a crop first.";
    if (Number.isNaN(qty)) next.quantity = "Quantity is required.";
    else if (qty <= 0) next.quantity = "Quantity must be greater than 0.";
    else if (activeCrop?.min_order_qty != null && qty < activeCrop.min_order_qty) {
      next.quantity = `Minimum order is ${activeCrop.min_order_qty} ${activeCrop.unit}.`;
    }

    const pp = toNumber(proposedPrice);
    if (!isBlank(proposedPrice)) {
      if (Number.isNaN(pp)) next.proposed_price = "Proposed price must be a number.";
      else if (pp <= 0) next.proposed_price = "Proposed price must be greater than 0.";
    }

    if (!contactDetails.trim()) next.contact = "Contact details are required (phone/email).";
    if (deliveryNotes && deliveryNotes.length > 2000) next.delivery_notes = "Delivery notes too long (max 2000 characters).";

    setOrderErrors(next);
    return Object.keys(next).length === 0;
  }

  async function placeOrder(e) {
    e.preventDefault();
    setOrderErrors({});

    if (!validateOrder()) return;

    setPlacingOrder(true);
    try {
      await api.createOrder({
        crop_id: orderCropId,
        quantity_requested: Number(quantityRequested),
        contact_details: contactDetails.trim(),
        proposed_price: isBlank(proposedPrice) ? null : Number(proposedPrice),
        delivery_notes: deliveryNotes.trim() || null,
      });

      toast.show({
        type: "success",
        title: "Request sent",
        message: "The farmer will review your order request.",
      });

      resetOrderForm();
    } catch (e2) {
      const msg = e2?.message || "Failed to send request.";
      toast.show({ type: "error", title: "Could not send request", message: msg });
      setOrderErrors((p) => ({ ...p, form: msg }));
    } finally {
      setPlacingOrder(false);
    }
  }

  async function onSearchClick() {
    await load(filters, geo);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.show({ type: "error", title: "Geolocation unavailable", message: "Your browser does not support location." });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGeo((p) => ({ ...p, lat: String(lat), lng: String(lng) }));
        toast.show({ type: "success", title: "Location set", message: "Distance filtering is ready." });
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
    setGeo((p) => ({ ...p, lat: "", lng: "" }));
  }

  return (
    <div className="container">
      <PageHeader title="Browse Crops" subtitle="Search by crop name, location, or price. Optional: filter by distance." />

      <div className="card">
        <div className="row" style={{ marginTop: 10, flexWrap: "wrap", gap: 10 }}>
          <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Name (e.g. maize)" value={filters.name} onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))} />
          <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Location (e.g. Eldoret)" value={filters.location} onChange={(e) => setFilters((p) => ({ ...p, location: e.target.value }))} />
          <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder="County (optional)" value={filters.county} onChange={(e) => setFilters((p) => ({ ...p, county: e.target.value }))} />
          <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder="Town (optional)" value={filters.town} onChange={(e) => setFilters((p) => ({ ...p, town: e.target.value }))} />
          <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Min price" inputMode="decimal" value={filters.min_price} onChange={(e) => setFilters((p) => ({ ...p, min_price: e.target.value }))} />
          <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Max price" inputMode="decimal" value={filters.max_price} onChange={(e) => setFilters((p) => ({ ...p, max_price: e.target.value }))} />

          <button className="btn" onClick={onSearchClick} disabled={loadingList}>
            {loadingList ? "Searching…" : "Search"}
          </button>
        </div>

        <div className="row" style={{ marginTop: 10, flexWrap: "wrap", gap: 10 }}>
          <button className="btn" type="button" onClick={useMyLocation} disabled={loadingList}>
            Use my location
          </button>

          <select
            className="select"
            value={geo.radius_km}
            onChange={(e) => setGeo((p) => ({ ...p, radius_km: e.target.value }))}
            disabled={!distanceEnabled}
            title={!distanceEnabled ? "Set your location first" : ""}
          >
            {RADIUS_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <button className="btn" type="button" onClick={clearDistance} disabled={!distanceEnabled || loadingList}>
            Clear distance
          </button>

          {distanceEnabled && (
            <span className="pill" title="Your location is used only to calculate approximate distance">
              Distance: {geo.radius_km} km
            </span>
          )}
        </div>

        {pageError && (
          <div className="error" style={{ marginTop: 10 }}>
            {pageError}
          </div>
        )}
      </div>

      <div style={{ height: 14 }} />

      {loadingList ? (
        <div className="card">
          <div className="small">Loading crops…</div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No crops found" message="Try changing your search filters or clearing min/max price." />
      ) : (
        <div className="grid">
          {items.map((c) => {
            const isActive = orderCropId === c.id;
            const isSubmittingThis = placingOrder && isActive;

            return (
              <div key={c.id} className="card listing-card">
                <ListingGalleryThumbs crop={c} />

                <div className="kv">
                  <strong>{c.name}</strong>
                  <span className="pill">
                    KES {c.price_per_unit} / {c.unit}
                  </span>
                </div>

                <div className="small">
                  Available: <b>{c.quantity}</b> {c.unit}
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

                {(c.town || c.county) && (
                  <div className="small">
                    Area: {[c.town, c.county].filter(Boolean).join(", ")}
                  </div>
                )}

                {typeof c.distance_km === "number" && (
                  <div className="small">
                    Distance: <b>~{c.distance_km} km</b>
                  </div>
                )}

                <div className="small" style={{ marginTop: 6 }}>
                  Farmer: {c.farmer?.name} • {c.farmer?.phone || "no phone"} • {c.farmer?.email}
                </div>

                <div className="small" style={{ marginTop: 6 }}>
                  Pickup pin: {c.has_location ? "available after acceptance" : "not available"}
                </div>

                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn primary" onClick={() => setOrderCropId(c.id)} disabled={isSubmittingThis}>
                    {isSubmittingThis ? "Sending…" : "Request Order"}
                  </button>
                  <span className="pill">Unit: {c.unit}</span>
                </div>

                {isActive && (
                  <form onSubmit={placeOrder} className="grid" style={{ marginTop: 12 }} noValidate>
                    {c.min_order_qty != null && (
                      <div className="small">
                        Minimum order is <b>{c.min_order_qty}</b> {c.unit}.
                      </div>
                    )}

                    <div className="grid">
                      <label>Quantity requested ({c.unit})</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={`e.g. 10 (${c.unit})`}
                        value={quantityRequested}
                        onChange={(e) => setQuantityRequested(e.target.value)}
                        aria-invalid={Boolean(orderErrors.quantity)}
                      />
                      {orderErrors.quantity && <div className="error">{orderErrors.quantity}</div>}
                    </div>

                    <div className="grid">
                      <label>Proposed price (optional)</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={`e.g. ${c.price_per_unit}`}
                        value={proposedPrice}
                        onChange={(e) => setProposedPrice(e.target.value)}
                        aria-invalid={Boolean(orderErrors.proposed_price)}
                      />
                      {orderErrors.proposed_price && <div className="error">{orderErrors.proposed_price}</div>}
                      <div className="small">Leave blank to accept the listed price.</div>
                    </div>

                    <div className="grid">
                      <label>Delivery notes (optional)</label>
                      <textarea
                        className="textarea"
                        placeholder="Notes for the farmer (e.g. preferred pickup time)."
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        aria-invalid={Boolean(orderErrors.delivery_notes)}
                      />
                      {orderErrors.delivery_notes && <div className="error">{orderErrors.delivery_notes}</div>}
                    </div>

                    <div className="grid">
                      <label>Contact details</label>
                      <textarea
                        className="textarea"
                        placeholder="Phone/email + notes"
                        value={contactDetails}
                        onChange={(e) => setContactDetails(e.target.value)}
                        aria-invalid={Boolean(orderErrors.contact)}
                      />
                      {orderErrors.contact && <div className="error">{orderErrors.contact}</div>}
                    </div>

                    {orderErrors.form && <div className="error">{orderErrors.form}</div>}

                    <div className="row">
                      <button className="btn primary" type="submit" disabled={placingOrder}>
                        {placingOrder ? "Sending…" : "Send request"}
                      </button>
                      <button className="btn" type="button" onClick={resetOrderForm} disabled={placingOrder}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}