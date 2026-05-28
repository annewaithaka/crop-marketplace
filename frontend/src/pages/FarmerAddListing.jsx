// frontend/src/pages/FarmerAddListing.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../context/ToastContext.jsx";
import ImagePicker from "../components/ImagePicker.jsx";
import PageHeader from "../components/PageHeader.jsx";

const UNITS = [
  { value: "kg",    label: "Kilograms (kg)" },
  { value: "bag",   label: "Bags (bag)" },
  { value: "crate", label: "Crates (crate)" },
  { value: "piece", label: "Pieces (piece)" },
];

const KENYA_CENTER = { lat: -0.0236, lng: 37.9062 };

function toNumber(v) {
  if (v === "" || v === null || v === undefined) return NaN;
  return Number(v);
}
function toOptionalNumber(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? NaN : n;
}
function clampToThree(files) { return (files || []).slice(0, 3); }
function fmtCoord(n) {
  if (n === "" || n === null || n === undefined) return "";
  const v = Number(n);
  if (Number.isNaN(v)) return "";
  return v.toFixed(6);
}

export default function FarmerAddListing() {
  const toast = useToast();
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    quantity: "",
    unit: "kg",
    price_per_unit: "",
    location: "",
    county: "",
    town: "",
    lat: "",
    lng: "",
    pack_size_kg: "",
    min_order_qty: "",
  });
  const [images, setImages] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [pageError, setPageError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const canSubmit = useMemo(() => {
    const hasPin = form.lat !== "" && form.lng !== "";
    return (
      form.name.trim() &&
      form.location.trim() &&
      form.quantity !== "" &&
      form.price_per_unit !== "" &&
      hasPin &&
      !submitting
    );
  }, [form, submitting]);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!mapElRef.current || mapRef.current) return;
      const L = (await import("leaflet")).default;

      const map = L.map(mapElRef.current, { zoomControl: true, attributionControl: true })
        .setView([KENYA_CENTER.lat, KENYA_CENTER.lng], 6);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

      const marker = L.marker([KENYA_CENTER.lat, KENYA_CENTER.lng], { draggable: true }).addTo(map);

      function syncFromMarker() {
        const ll = marker.getLatLng();
        setForm((p) => ({ ...p, lat: String(ll.lat), lng: String(ll.lng) }));
      }

      marker.on("dragend", syncFromMarker);
      map.on("click", (e) => {
        marker.setLatLng(e.latlng);
        syncFromMarker();
      });

      mapRef.current = map;
      markerRef.current = marker;
      if (!cancelled) setMapReady(true);
    }

    initMap();
    return () => {
      cancelled = true;
      try {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
          markerRef.current = null;
        }
      } catch { /* ignore */ }
    };
  }, []);

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = "Crop name is required.";
    if (!form.location.trim()) next.location = "Location label is required.";

    const qty = toNumber(form.quantity);
    if (Number.isNaN(qty)) next.quantity = "Quantity is required.";
    else if (qty <= 0) next.quantity = "Quantity must be greater than 0.";

    const ppu = toNumber(form.price_per_unit);
    if (Number.isNaN(ppu)) next.price_per_unit = "Price is required.";
    else if (ppu <= 0) next.price_per_unit = "Price must be greater than 0.";

    const lat = toNumber(form.lat);
    const lng = toNumber(form.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) next.location_pin = "Please tap or drag on the map to pin the pickup location.";
    else {
      if (lat < -90 || lat > 90) next.lat = "Latitude must be between -90 and 90.";
      if (lng < -180 || lng > 180) next.lng = "Longitude must be between -180 and 180.";
    }

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

    if (images.length > 3) next.images = "You can upload up to 3 images.";

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  function useMyLocation() {
    setFieldErrors((p) => ({ ...p, location_pin: undefined, lat: undefined, lng: undefined }));
    if (!navigator.geolocation) {
      toast.show({ type: "error", title: "Geolocation unavailable", message: "Your browser does not support location." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setForm((p) => ({ ...p, lat: String(lat), lng: String(lng) }));
        const map = mapRef.current;
        const marker = markerRef.current;
        if (map && marker) {
          marker.setLatLng([lat, lng]);
          map.setView([lat, lng], 14);
        }
      },
      () => {
        toast.show({ type: "error", title: "Could not get location", message: "Enable location permission and try again." });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function resetForm() {
    setForm({
      name: "", quantity: "", unit: "kg", price_per_unit: "",
      location: "", county: "", town: "",
      lat: "", lng: "",
      pack_size_kg: "", min_order_qty: "",
    });
    setImages([]);
    const map = mapRef.current;
    const marker = markerRef.current;
    if (map && marker) {
      marker.setLatLng([KENYA_CENTER.lat, KENYA_CENTER.lng]);
      map.setView([KENYA_CENTER.lat, KENYA_CENTER.lng], 6);
    }
  }

  async function create(e) {
    e.preventDefault();
    setFieldErrors({});
    setPageError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      const pack = toOptionalNumber(form.pack_size_kg);
      const minOrder = toOptionalNumber(form.min_order_qty);

      const res = await api.createCrop({
        name: form.name.trim(),
        location: form.location.trim(),
        county: form.county.trim() ? form.county.trim() : null,
        town: form.town.trim() ? form.town.trim() : null,
        lat: Number(form.lat),
        lng: Number(form.lng),
        unit: form.unit,
        quantity: Number(form.quantity),
        price_per_unit: Number(form.price_per_unit),
        pack_size_kg: pack === null ? null : pack,
        min_order_qty: minOrder === null ? null : minOrder,
      });

      const cropId = res?.id;
      if (cropId && images.length > 0) {
        await api.uploadCropImages(cropId, clampToThree(images));
      }

      toast.show({
        type: "success",
        title: "Listing added",
        message: images.length > 0 ? "Listing added with photos." : "Listing added.",
      });

      resetForm();
    } catch (e2) {
      const msg = e2?.message || "Failed to add listing.";
      setPageError(msg);
      toast.show({ type: "error", title: "Could not add listing", message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Add listing"
        subtitle="Create a new crop listing. Buyers will be able to find it and send order requests."
      />
      <div className="card">
      <form onSubmit={create} noValidate>
        <div className="form-section">
          <div className="form-section-title">Basics</div>
          <div className="field">
            <label>Crop name</label>
            <input
              className="input"
              placeholder="e.g. Maize"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            {fieldErrors.name && <div className="field-error">{fieldErrors.name}</div>}
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
                placeholder="e.g. 120"
                value={form.quantity}
                onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
              />
              {fieldErrors.quantity && <div className="field-error">{fieldErrors.quantity}</div>}
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
                placeholder="e.g. 3000"
                value={form.price_per_unit}
                onChange={(e) => setForm((p) => ({ ...p, price_per_unit: e.target.value }))}
              />
              {fieldErrors.price_per_unit && <div className="field-error">{fieldErrors.price_per_unit}</div>}
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 12 }}>
            <div className="field">
              <label>Pack size (kg)</label>
              <input
                className="input"
                type="number" min="0" step="0.01"
                placeholder="e.g. 90"
                value={form.pack_size_kg}
                onChange={(e) => setForm((p) => ({ ...p, pack_size_kg: e.target.value }))}
              />
              <div className="field-help">Optional. Useful for buyers who think in bags or crates.</div>
              {fieldErrors.pack_size_kg && <div className="field-error">{fieldErrors.pack_size_kg}</div>}
            </div>
            <div className="field">
              <label>Minimum order qty</label>
              <input
                className="input"
                type="number" min="0" step="0.01"
                placeholder={`e.g. 10`}
                value={form.min_order_qty}
                onChange={(e) => setForm((p) => ({ ...p, min_order_qty: e.target.value }))}
              />
              <div className="field-help">Optional.</div>
              {fieldErrors.min_order_qty && <div className="field-error">{fieldErrors.min_order_qty}</div>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">Pickup location</div>
          <div className="field">
            <label>Location label</label>
            <input
              className="input"
              placeholder="e.g. Eldoret / Kapsabet Road"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            />
            <div className="field-help">Shown to buyers before they place an order.</div>
            {fieldErrors.location && <div className="field-error">{fieldErrors.location}</div>}
          </div>

          <div className="form-row" style={{ marginTop: 12 }}>
            <div className="field">
              <label>County</label>
              <input
                className="input"
                placeholder="e.g. Uasin Gishu"
                value={form.county}
                onChange={(e) => setForm((p) => ({ ...p, county: e.target.value }))}
              />
              <div className="field-help">Optional.</div>
            </div>
            <div className="field">
              <label>Town</label>
              <input
                className="input"
                placeholder="e.g. Eldoret"
                value={form.town}
                onChange={(e) => setForm((p) => ({ ...p, town: e.target.value }))}
              />
              <div className="field-help">Optional.</div>
            </div>
          </div>

          <div className="row" style={{ marginTop: 14, justifyContent: "space-between" }}>
            <div className="field-help" style={{ margin: 0 }}>
              Tap or drag on the map to pin pickup. Buyers only see exact coordinates after you accept their order.
            </div>
            <button
              className="btn sm"
              type="button"
              onClick={useMyLocation}
              disabled={submitting || !mapReady}
            >
              Use my location
            </button>
          </div>

          <div ref={mapElRef} className="map-box" />

          <div className="form-row" style={{ marginTop: 12 }}>
            <div className="field">
              <label>Latitude</label>
              <input className="input" value={fmtCoord(form.lat)} readOnly />
              {fieldErrors.lat && <div className="field-error">{fieldErrors.lat}</div>}
            </div>
            <div className="field">
              <label>Longitude</label>
              <input className="input" value={fmtCoord(form.lng)} readOnly />
              {fieldErrors.lng && <div className="field-error">{fieldErrors.lng}</div>}
            </div>
          </div>
          {fieldErrors.location_pin && <div className="field-error">{fieldErrors.location_pin}</div>}
        </div>

        <div className="form-section">
          <div className="form-section-title">Photos</div>
          <div className="field-help">
            Add up to 3 photos (jpg, png, or webp). They’ll upload once the listing is created.
          </div>
          <div style={{ marginTop: 8 }}>
            <ImagePicker disabled={submitting} value={images} onChange={setImages} />
          </div>
          {fieldErrors.images && <div className="field-error">{fieldErrors.images}</div>}
        </div>

        {pageError && <div className="error" style={{ marginBottom: 12 }}>{pageError}</div>}

        <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
          <button className="btn" type="button" onClick={resetForm} disabled={submitting}>
            Clear
          </button>
          <button className="btn primary" type="submit" disabled={!canSubmit}>
            {submitting ? "Adding…" : "Add listing"}
          </button>
        </div>
      </form>
    </div>
    </>
  );
}
