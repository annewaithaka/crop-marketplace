// frontend/src/pages/BuyerOrders.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Link } from "react-router-dom";

function mapsUrl(lat, lng) {
  return `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
}

export default function BuyerOrders() {
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setPageError("");
    setLoading(true);
    try {
      const res = await api.myOrders();
      setItems(res.items || []);
    } catch (e) {
      const msg = e?.message || "Failed to load orders.";
      setPageError(msg);
      toast.show({ type: "error", title: "Could not load orders", message: msg });
    } finally {
      setLoading(false);
    }
  }

  async function copyCoords(lat, lng) {
    const text = `${lat}, ${lng}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.show({ type: "success", title: "Copied", message: "Coordinates copied." });
    } catch {
      toast.show({ type: "error", title: "Copy failed", message: text });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container">
      <PageHeader
        title="My Orders"
        subtitle="Track the status of the orders you requested."
        right={
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      {pageError ? (
        <div className="card">
          <div className="error">{pageError}</div>
        </div>
      ) : loading ? (
        <div className="card">
          <div className="small">Loading your orders…</div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No orders yet"
          message="Browse crops and send an order request. Your requests will appear here."
          action={<Link className="btn primary" to="/buyer">Browse crops</Link>}
        />
      ) : (
        <div className="grid">
          {items.map((o) => {
            const pickup = o.pickup_location;
            const showPickup = Boolean(pickup && (o.status === "accepted" || o.status === "completed"));

            return (
              <div key={o.id} className="card">
                <div className="kv">
                  <strong>{o.crop?.name || "Crop"}</strong>
                  <span className="pill">{o.status}</span>
                </div>

                <div className="small">Location label: {o.crop?.location}</div>

                <div className="small">
                  Quantity requested: <b>{o.quantity_requested}</b> {o.crop?.unit}
                </div>

                {showPickup ? (
                  <div style={{ marginTop: 10 }} className="grid">
                    <div className="small">
                      <b>Pickup pin unlocked</b>
                      {pickup?.county || pickup?.town ? (
                        <span>
                          {" "}
                          — {pickup?.town || ""}{pickup?.town && pickup?.county ? ", " : ""}{pickup?.county || ""}
                        </span>
                      ) : null}
                    </div>

                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <a
                        className="btn primary"
                        href={mapsUrl(pickup.lat, pickup.lng)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open in Google Maps
                      </a>
                      <button className="btn" type="button" onClick={() => copyCoords(pickup.lat, pickup.lng)}>
                        Copy coordinates
                      </button>
                    </div>

                    <div className="small">
                      Coordinates: <code>{pickup.lat}, {pickup.lng}</code>
                    </div>
                  </div>
                ) : (
                  <div className="small" style={{ marginTop: 10 }}>
                    Pickup pin will appear after the farmer accepts your order.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}