// frontend/src/pages/FarmerCrops.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../context/ToastContext.jsx";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";

const UNITS = [
  { value: "kg", label: "Kilograms (kg)" },
  { value: "bag", label: "Bags (bag)" }
];

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return NaN;
  return Number(value);
}

export default function FarmerCrops() {
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [pageError, setPageError] = useState("");
  const [loadingList, setLoadingList] = useState(false);

  const [form, setForm] = useState({
    name: "",
    quantity: "",
    unit: "kg",
    price_per_unit: "",
    location: ""
  });

  const [fieldErrors, setFieldErrors] = useState({});
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
      await api.createCrop({
        name: form.name.trim(),
        location: form.location.trim(),
        unit: form.unit,
        quantity: Number(form.quantity),
        price_per_unit: Number(form.price_per_unit)
      });

      toast.show({
        type: "success",
        title: "Listing added",
        message: "Buyers can now request orders from this listing."
      });

      setForm({ name: "", quantity: "", unit: "kg", price_per_unit: "", location: "" });
      await load();
    } catch (e2) {
      const msg = e2?.message || "Failed to add listing.";
      setPageError(msg);
      toast.show({ type: "error", title: "Could not add listing", message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container">
      <PageHeader
        title="My Crops"
        subtitle="Add a crop listing and manage your current listings."
      />

      <div className="card">
        <div className="small" style={{ marginTop: 6 }}>
          Quantity is numeric. Choose a unit (kg or bag).
        </div>

        <form onSubmit={create} className="grid" style={{ maxWidth: 620, marginTop: 12 }} noValidate>
          <div className="grid">
            <label>Crop name</label>
            <input
              className="input"
              placeholder="e.g. Maize"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "fc-name-error" : undefined}
            />
            {fieldErrors.name && <div id="fc-name-error" className="error">{fieldErrors.name}</div>}
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
                aria-describedby={fieldErrors.quantity ? "fc-qty-error" : undefined}
              />
              {fieldErrors.quantity && <div id="fc-qty-error" className="error">{fieldErrors.quantity}</div>}
            </div>

            <div className="grid" style={{ flex: 1, minWidth: 180 }}>
              <label>Unit</label>
              <select
                className="select"
                value={form.unit}
                onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
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
              aria-describedby={fieldErrors.price_per_unit ? "fc-ppu-error" : undefined}
            />
            {fieldErrors.price_per_unit && <div id="fc-ppu-error" className="error">{fieldErrors.price_per_unit}</div>}
          </div>

          <div className="grid">
            <label>Location</label>
            <input
              className="input"
              placeholder="e.g. Eldoret"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              aria-invalid={Boolean(fieldErrors.location)}
              aria-describedby={fieldErrors.location ? "fc-loc-error" : undefined}
            />
            {fieldErrors.location && <div id="fc-loc-error" className="error">{fieldErrors.location}</div>}
          </div>

          <button className="btn primary" type="submit" disabled={!canSubmit}>
            {submitting ? "Adding…" : "Add listing"}
          </button>

          {pageError && <div className="error">{pageError}</div>}
        </form>
      </div>

      <div style={{ height: 14 }} />

      {loadingList ? (
        <div className="card">
          <div className="small">Loading your listings…</div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No listings yet"
          description="Add your first crop listing above. Buyers will be able to request orders."
        />
      ) : (
        <div className="grid">
          {items.map((c) => (
            <div key={c.id} className="card">
              <div className="kv">
                <strong>{c.name}</strong>
                <span className="pill">KES {c.price_per_unit} / {c.unit}</span>
              </div>
              <div className="small">Qty: <b>{c.quantity}</b> {c.unit}</div>
              <div className="small">Location: {c.location}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}