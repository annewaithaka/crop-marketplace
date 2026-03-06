import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function FarmerOrders() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await api.incomingOrders();
    setItems(res.items || []);
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, []);

  async function setStatus(id, status) {
    setErr(""); setMsg("");
    try {
      await api.updateOrderStatus(id, status);
      setMsg("Updated.");
      await load();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Incoming Orders</h2>
        {err && <div className="error">{err}</div>}
        {msg && <div className="success">{msg}</div>}
      </div>

      <div style={{ height: 14 }} />

      <div className="grid">
        {items.map((o) => (
          <div key={o.id} className="card">
            <div className="kv">
              <strong>{o.crop.name}</strong>
              <span className="pill">{o.status}</span>
            </div>
            <div className="small">Location: {o.crop.location}</div>
            <div className="small">
              Qty requested: <b>{o.quantity_requested}</b> {o.crop.unit}
            </div>
            <div className="small" style={{ marginTop: 6 }}>Contact: {o.contact_details}</div>

            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn good" onClick={() => setStatus(o.id, "accepted")}>Accept</button>
              <button className="btn bad" onClick={() => setStatus(o.id, "rejected")}>Reject</button>
              <button className="btn" onClick={() => setStatus(o.id, "completed")}>Complete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
