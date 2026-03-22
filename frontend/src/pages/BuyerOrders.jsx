// frontend/src/pages/BuyerOrders.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Link } from "react-router-dom";

function mapsUrl(lat, lng) {
  return `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
}

function MessageThread({ orderId, title = "Messages" }) {
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.orderMessages(orderId);
      setItems(res.items || []);
    } catch (e) {
      toast.show({ type: "error", title: "Could not load messages", message: e?.message || "Failed to load messages." });
    } finally {
      setLoading(false);
    }
  }

  async function send(e) {
    e.preventDefault();
    const msg = draft.trim();
    if (!msg) return;

    setSending(true);
    try {
      const res = await api.sendOrderMessage(orderId, msg);
      const item = res.item;
      setItems((prev) => [...prev, ...(item ? [item] : [])]);
      setDraft("");
    } catch (e2) {
      toast.show({ type: "error", title: "Send failed", message: e2?.message || "Could not send message." });
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <strong>{title}</strong>
        <button className="btn" type="button" onClick={() => setOpen((p) => !p)}>
          {open ? "Hide" : "Open"}
        </button>
      </div>

      {open && (
        <div className="grid" style={{ marginTop: 10 }}>
          {loading ? (
            <div className="small">Loading messages…</div>
          ) : items.length === 0 ? (
            <div className="small">No messages yet.</div>
          ) : (
            <div className="grid" style={{ gap: 8 }}>
              {items.map((m) => (
                <div key={m.id} className="small" style={{ padding: 10, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10 }}>
                  <div className="kv">
                    <span className="pill">{m.sender_role}</span>
                    <span className="small">{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{m.message}</div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={send} className="grid" style={{ gap: 8 }}>
            <textarea className="textarea" placeholder="Write a message…" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <div className="row" style={{ gap: 8 }}>
              <button className="btn primary" type="submit" disabled={sending || !draft.trim()}>
                {sending ? "Sending…" : "Send"}
              </button>
              <button className="btn" type="button" onClick={load} disabled={loading || sending}>
                Refresh messages
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
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

  const hasAny = useMemo(() => items.length > 0, [items]);

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
      ) : !hasAny ? (
        <EmptyState title="No orders yet" message="Browse crops and send an order request. Your requests will appear here." action={<Link className="btn primary" to="/buyer">Browse crops</Link>} />
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

                {o.proposed_price != null && (
                  <div className="small">
                    Proposed price: <b>KES {o.proposed_price}</b> / {o.crop?.unit}
                  </div>
                )}

                {o.delivery_notes && (
                  <div className="small" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                    Delivery notes: {o.delivery_notes}
                  </div>
                )}

                {showPickup ? (
                  <div style={{ marginTop: 10 }} className="grid">
                    <div className="small">
                      <b>Pickup pin unlocked</b>
                      {pickup?.county || pickup?.town ? (
                        <span>
                          {" "}
                          — {pickup?.town || ""}
                          {pickup?.town && pickup?.county ? ", " : ""}
                          {pickup?.county || ""}
                        </span>
                      ) : null}
                    </div>

                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <a className="btn primary" href={mapsUrl(pickup.lat, pickup.lng)} target="_blank" rel="noreferrer">
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

                <MessageThread orderId={o.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}