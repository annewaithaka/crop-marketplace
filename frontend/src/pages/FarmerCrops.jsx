import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const UNITS = [
  { value: "kg", label: "Kilograms (kg)" },
  { value: "bag", label: "Bags (bag)" }
];

export default function FarmerCrops() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    quantity: "",
    unit: "kg",
    price_per_unit: "",
    location: ""
  });

  async function load() {
    const res = await api.myCrops();
    setItems(res.items || []);
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, []);

  async function create(e) {
    e.preventDefault();
    setErr(""); setMsg("");

    try {
      await api.createCrop({
        name: form.name,
        location: form.location,
        unit: form.unit,
        quantity: Number(form.quantity),
        price_per_unit: Number(form.price_per_unit)
      });
      setMsg("Listing added.");
      setForm({ name: "", quantity: "", unit: "kg", price_per_unit: "", location: "" });
      await load();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2>My Crops</h2>
        <p className="small">Quantity is numeric. Choose a unit (kg or bag).</p>

        <form onSubmit={create} className="grid" style={{ maxWidth: 560, marginTop: 12 }}>
          <div className="grid">
            <label>Crop name</label>
            <input className="input" placeholder="e.g. Maize" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>

          <div className="row">
            <div className="grid" style={{ flex: 1, minWidth: 180 }}>
              <label>Quantity</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="e.g. 120" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
            </div>
            <div className="grid" style={{ flex: 1, minWidth: 180 }}>
              <label>Unit</label>
              <select className="select" value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}>
                {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid">
            <label>Price per unit</label>
            <input className="input" type="number" min="0" step="0.01" placeholder="e.g. 3000" value={form.price_per_unit} onChange={(e) => setForm((p) => ({ ...p, price_per_unit: e.target.value }))} />
          </div>

          <div className="grid">
            <label>Location</label>
            <input className="input" placeholder="e.g. Eldoret" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
          </div>

          <button className="btn primary" type="submit">Add listing</button>
          {err && <div className="error">{err}</div>}
          {msg && <div className="success">{msg}</div>}
        </form>
      </div>

      <div style={{ height: 14 }} />

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
    </div>
  );
}
