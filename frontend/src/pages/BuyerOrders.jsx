import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function BuyerOrders() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.myOrders()
      .then((res) => setItems(res.items || []))
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="container">
      <div className="card">
        <h2>My Orders</h2>
        {err && <div className="error">{err}</div>}
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
              Quantity requested: <b>{o.quantity_requested}</b> {o.crop.unit}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
