import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function BuyerBrowse() {
  const [filters, setFilters] = useState({ name: "", location: "", min_price: "", max_price: "" });
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [orderCropId, setOrderCropId] = useState(null);
  const [quantity_requested, setQuantityRequested] = useState("");
  const [contact_details, setContactDetails] = useState("");

  async function load() {
    setErr("");
    const res = await api.listCrops(filters);
    setItems(res.items || []);
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, []);

  async function placeOrder(e) {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      await api.createOrder({
        crop_id: orderCropId,
        quantity_requested: Number(quantity_requested),
        contact_details
      });
      setMsg("Order request sent.");
      setOrderCropId(null);
      setQuantityRequested("");
      setContactDetails("");
    } catch (e2) {
      setErr(e2.message);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Browse Crops</h2>
        <div className="row" style={{ marginTop: 10 }}>
          <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Name" value={filters.name} onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))} />
          <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Location" value={filters.location} onChange={(e) => setFilters((p) => ({ ...p, location: e.target.value }))} />
          <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Min price" value={filters.min_price} onChange={(e) => setFilters((p) => ({ ...p, min_price: e.target.value }))} />
          <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Max price" value={filters.max_price} onChange={(e) => setFilters((p) => ({ ...p, max_price: e.target.value }))} />
          <button className="btn" onClick={() => load().catch((e) => setErr(e.message))}>Search</button>
        </div>

        {err && <div className="error" style={{ marginTop: 10 }}>{err}</div>}
        {msg && <div className="success" style={{ marginTop: 10 }}>{msg}</div>}
      </div>

      <div style={{ height: 14 }} />

      <div className="grid">
        {items.map((c) => (
          <div key={c.id} className="card">
            <div className="kv">
              <strong>{c.name}</strong>
              <span className="pill">KES {c.price_per_unit} / {c.unit}</span>
            </div>
            <div className="small">Available: <b>{c.quantity}</b> {c.unit}</div>
            <div className="small">Location: {c.location}</div>
            <div className="small" style={{ marginTop: 6 }}>
              Farmer: {c.farmer?.name} • {c.farmer?.phone || "no phone"} • {c.farmer?.email}
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn primary" onClick={() => setOrderCropId(c.id)}>
                Request Order
              </button>
              <span className="pill">Unit: {c.unit}</span>
            </div>

            {orderCropId === c.id && (
              <form onSubmit={placeOrder} className="grid" style={{ marginTop: 12 }}>
                <div className="grid">
                  <label>Quantity requested ({c.unit})</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={`e.g. 10 (${c.unit})`}
                    value={quantity_requested}
                    onChange={(e) => setQuantityRequested(e.target.value)}
                  />
                </div>
                <div className="grid">
                  <label>Contact details</label>
                  <textarea className="textarea" placeholder="Phone/email + notes" value={contact_details} onChange={(e) => setContactDetails(e.target.value)} />
                </div>

                <div className="row">
                  <button className="btn good" type="submit">Send request</button>
                  <button className="btn" type="button" onClick={() => setOrderCropId(null)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
