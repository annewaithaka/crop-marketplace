// frontend/src/pages/BuyerBrowse.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useToast } from "../context/ToastContext.jsx";

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return NaN;
  return Number(value);
}

export default function BuyerBrowse() {
  const toast = useToast();

  const [filters, setFilters] = useState({
    name: "",
    location: "",
    min_price: "",
    max_price: "",
  });

  const [items, setItems] = useState([]);
  const [pageError, setPageError] = useState("");
  const [loadingList, setLoadingList] = useState(false);

  const [orderCropId, setOrderCropId] = useState(null);
  const [quantityRequested, setQuantityRequested] = useState("");
  const [contactDetails, setContactDetails] = useState("");

  const [orderErrors, setOrderErrors] = useState({});
  const [placingOrder, setPlacingOrder] = useState(false);

  const activeCrop = useMemo(
    () => items.find((c) => c.id === orderCropId) || null,
    [items, orderCropId]
  );

  async function load(nextFilters = filters) {
    setPageError("");
    setLoadingList(true);
    try {
      const res = await api.listCrops(nextFilters);
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
    setOrderErrors({});
    setPlacingOrder(false);
  }

  function validateOrder() {
    const next = {};
    const qty = toNumber(quantityRequested);

    if (!orderCropId) next.crop = "Select a crop first.";
    if (Number.isNaN(qty)) next.quantity = "Quantity is required.";
    else if (qty <= 0) next.quantity = "Quantity must be greater than 0.";

    if (!contactDetails.trim()) next.contact = "Contact details are required (phone/email).";

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
    await load(filters);
  }

  return (
    <div className="container">
      <PageHeader title="Browse Crops" subtitle="Search by crop name, location, or price." />

      <div className="card">
        <div className="row" style={{ marginTop: 10 }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 180 }}
            placeholder="Name (e.g. maize)"
            value={filters.name}
            onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            className="input"
            style={{ flex: 1, minWidth: 180 }}
            placeholder="Location (e.g. Eldoret)"
            value={filters.location}
            onChange={(e) => setFilters((p) => ({ ...p, location: e.target.value }))}
          />
          <input
            className="input"
            style={{ flex: 1, minWidth: 140 }}
            placeholder="Min price"
            inputMode="decimal"
            value={filters.min_price}
            onChange={(e) => setFilters((p) => ({ ...p, min_price: e.target.value }))}
          />
          <input
            className="input"
            style={{ flex: 1, minWidth: 140 }}
            placeholder="Max price"
            inputMode="decimal"
            value={filters.max_price}
            onChange={(e) => setFilters((p) => ({ ...p, max_price: e.target.value }))}
          />
          <button className="btn" onClick={onSearchClick} disabled={loadingList}>
            {loadingList ? "Searching…" : "Search"}
          </button>
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
        <EmptyState
          title="No crops found"
          message="Try changing your search filters or clearing min/max price."
        />
      ) : (
        <div className="grid">
          {items.map((c) => (
            <div key={c.id} className="card">
              <div className="kv">
                <strong>{c.name}</strong>
                <span className="pill">
                  KES {c.price_per_unit} / {c.unit}
                </span>
              </div>

              <div className="small">
                Available: <b>{c.quantity}</b> {c.unit}
              </div>
              <div className="small">Location: {c.location}</div>

              <div className="small" style={{ marginTop: 6 }}>
                Farmer: {c.farmer?.name} • {c.farmer?.phone || "no phone"} • {c.farmer?.email}
              </div>

              <div className="row" style={{ marginTop: 10 }}>
                <button
                  className="btn primary"
                  onClick={() => setOrderCropId(c.id)}
                  disabled={placingOrder && orderCropId === c.id}
                >
                  {orderCropId === c.id ? "Requesting…" : "Request Order"}
                </button>
                <span className="pill">Unit: {c.unit}</span>
              </div>

              {orderCropId === c.id && (
                <form onSubmit={placeOrder} className="grid" style={{ marginTop: 12 }} noValidate>
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
                    <button className="btn good" type="submit" disabled={placingOrder}>
                      {placingOrder ? "Sending…" : "Send request"}
                    </button>
                    <button className="btn" type="button" onClick={resetOrderForm} disabled={placingOrder}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}