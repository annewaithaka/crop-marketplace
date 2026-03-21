// frontend/src/pages/FarmerAddListing.jsx
import React, { useMemo, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../context/ToastContext.jsx";
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

function clampToThree(files) {
  return (files || []).slice(0, 3);
}

export default function FarmerAddListing() {
  const toast = useToast();

  const [form, setForm] = useState({
    name: "",
    quantity: "",
    unit: "kg",
    price_per_unit: "",
    location: "",
    pack_size_kg: "",
    min_order_qty: "",
  });

  const [images, setImages] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [pageError, setPageError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      form.name.trim() &&
      form.location.trim() &&
      form.quantity !== "" &&
      form.price_per_unit !== "" &&
      !submitting
    );
  }, [form, submitting]);

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

    if (images.length > 3) next.images = "You can upload up to 3 images.";

    setFieldErrors(next);
    return Object.keys(next).length === 0;
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
        message: images.length > 0 ? "Listing added with images." : "Listing added.",
      });

      setForm({
        name: "",
        quantity: "",
        unit: "kg",
        price_per_unit: "",
        location: "",
        pack_size_kg: "",
        min_order_qty: "",
      });
      setImages([]);
    } catch (e2) {
      const msg = e2?.message || "Failed to add listing.";
      setPageError(msg);
      toast.show({ type: "error", title: "Could not add listing", message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <div className="small" style={{ marginTop: 6 }}>
        Add up to 3 images (jpg/png/webp). Images upload after the listing is created.
      </div>

      <form onSubmit={create} className="grid" style={{ maxWidth: 760, marginTop: 12 }} noValidate>
        <div className="grid">
          <label>Crop name</label>
          <input
            className="input"
            placeholder="e.g. Maize"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name && <div className="error">{fieldErrors.name}</div>}
        </div>

        <div className="row">
          <div className="grid" style={{ flex: 1, minWidth: 180 }}>
            <label>Quantity</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 120"
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
              aria-invalid={Boolean(fieldErrors.quantity)}
            />
            {fieldErrors.quantity && <div className="error">{fieldErrors.quantity}</div>}
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
        </div>

        <div className="grid">
          <label>Price per unit (KES)</label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 3000"
            value={form.price_per_unit}
            onChange={(e) => setForm((p) => ({ ...p, price_per_unit: e.target.value }))}
            aria-invalid={Boolean(fieldErrors.price_per_unit)}
          />
          {fieldErrors.price_per_unit && <div className="error">{fieldErrors.price_per_unit}</div>}
        </div>

        <div className="row">
          <div className="grid" style={{ flex: 1, minWidth: 180 }}>
            <label>Pack size (kg) (optional)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 90"
              value={form.pack_size_kg}
              onChange={(e) => setForm((p) => ({ ...p, pack_size_kg: e.target.value }))}
              aria-invalid={Boolean(fieldErrors.pack_size_kg)}
            />
            {fieldErrors.pack_size_kg && <div className="error">{fieldErrors.pack_size_kg}</div>}
          </div>

          <div className="grid" style={{ flex: 1, minWidth: 180 }}>
            <label>Minimum order qty (optional)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder={`e.g. 10 (${form.unit})`}
              value={form.min_order_qty}
              onChange={(e) => setForm((p) => ({ ...p, min_order_qty: e.target.value }))}
              aria-invalid={Boolean(fieldErrors.min_order_qty)}
            />
            {fieldErrors.min_order_qty && <div className="error">{fieldErrors.min_order_qty}</div>}
          </div>
        </div>

        <div className="grid">
          <label>Location</label>
          <input
            className="input"
            placeholder="e.g. Eldoret"
            value={form.location}
            onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            aria-invalid={Boolean(fieldErrors.location)}
          />
          {fieldErrors.location && <div className="error">{fieldErrors.location}</div>}
        </div>

        <ImagePicker disabled={submitting} value={images} onChange={setImages} />
        {fieldErrors.images && <div className="error">{fieldErrors.images}</div>}

        <button className="btn primary" type="submit" disabled={!canSubmit}>
          {submitting ? "Adding…" : "Add listing"}
        </button>

        {pageError && <div className="error">{pageError}</div>}
      </form>
    </div>
  );
}