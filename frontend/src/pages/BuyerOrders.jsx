// frontend/src/pages/BuyerOrders.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import StatusPill from "../components/StatusPill.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatKsh, formatNumber } from "../utils/format.js";

function mapsUrl(lat, lng) {
  return `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
}

/* --- Message thread (quiet style, matches farmer side) --- */

function MessageThread({ orderId }) {
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
      toast.show({
        type: "error",
        title: "Could not load messages",
        message: e?.message || "Failed to load messages.",
      });
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
      if (res.item) setItems((prev) => [...prev, res.item]);
      setDraft("");
    } catch (e2) {
      toast.show({
        type: "error",
        title: "Send failed",
        message: e2?.message || "Could not send message.",
      });
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="thread">
      <div className="thread-head">
        <span className="thread-title">Messages with farmer</span>
        <button className="btn sm ghost" type="button" onClick={() => setOpen((p) => !p)}>
          {open ? "Hide" : "Open"}
        </button>
      </div>

      {open && (
        <>
          {loading ? (
            <div className="small" style={{ marginTop: 10 }}>Loading messages…</div>
          ) : items.length === 0 ? (
            <div className="small" style={{ marginTop: 10 }}>No messages yet.</div>
          ) : (
            <div className="thread-list">
              {items.map((m) => (
                <div key={m.id} className="thread-msg">
                  <div className="thread-msg-meta">
                    <span className="pill">{m.sender_role}</span>
                    <span>{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <div className="thread-msg-body">{m.message}</div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={send} className="thread-compose">
            <textarea
              className="textarea"
              placeholder="Write a message…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="row">
              <button className="btn sm primary" type="submit" disabled={sending || !draft.trim()}>
                {sending ? "Sending…" : "Send"}
              </button>
              <button className="btn sm" type="button" onClick={load} disabled={loading || sending}>
                Refresh
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

/* --- Page --- */

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

  const header = (
    <PageHeader
      title="My orders"
      subtitle="Track the status of crops you’ve requested."
      right={
        <div className="row" style={{ gap: 8 }}>
          <button className="btn sm" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      }
    />
  );

  if (loading && items.length === 0) {
    return (
      <div className="container">
        {header}
        <div className="card"><div className="small">Loading your orders…</div></div>
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className="container">
        {header}
        <EmptyState
          title="No orders yet"
          message="Browse crops and send an order request. Your requests will appear here."
          action={<Link className="btn primary" to="/buyer">Browse crops</Link>}
        />
      </div>
    );
  }

  return (
    <div className="container">
      {header}

      <div className="grid">
        {items.map((o) => {
          const pickup = o.pickup_location;
          const showPickup = Boolean(
            pickup && (o.status === "accepted" || o.status === "completed")
          );

          return (
            <div key={o.id} className="card listing-card">
              <div className="listing-head">
                <div>
                  <h3 className="listing-title">{o.crop?.name || "Crop"}</h3>
                  <div className="row" style={{ gap: 6, marginTop: 4 }}>
                    <StatusPill status={o.status} />
                    <span className="xs">
                      {new Date(o.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <dl className="stat-list" style={{ marginTop: 12 }}>
                <dt>Quantity</dt>
                <dd>{formatNumber(o.quantity_requested)} {o.crop?.unit}</dd>

                <dt>Listed price</dt>
                <dd>{formatKsh(o.crop?.price_per_unit, { precise: true })} / {o.crop?.unit}</dd>

                {o.proposed_price != null && (
                  <>
                    <dt>Your offer</dt>
                    <dd>{formatKsh(o.proposed_price, { precise: true })} / {o.crop?.unit}</dd>
                  </>
                )}

                <dt>Location</dt>
                <dd>{o.crop?.location}</dd>

                {o.delivery_notes && (
                  <>
                    <dt>Notes</dt>
                    <dd style={{ whiteSpace: "pre-wrap" }}>{o.delivery_notes}</dd>
                  </>
                )}
              </dl>

              {showPickup ? (
                <div className="pickup-block">
                  <div className="pickup-block-title">
                    📍 Pickup location unlocked
                  </div>
                  {(pickup.town || pickup.county) && (
                    <div className="small">
                      {[pickup.town, pickup.county].filter(Boolean).join(", ")}
                    </div>
                  )}
                  <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <a
                      className="btn sm primary"
                      href={mapsUrl(pickup.lat, pickup.lng)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Google Maps
                    </a>
                    <button
                      className="btn sm"
                      type="button"
                      onClick={() => copyCoords(pickup.lat, pickup.lng)}
                    >
                      Copy coordinates
                    </button>
                  </div>
                  <div className="pickup-block-coords">
                    {pickup.lat}, {pickup.lng}
                  </div>
                </div>
              ) : o.status === "pending" ? (
                <div className="pickup-pending">
                  Pickup location will appear here once the farmer accepts your order.
                </div>
              ) : o.status === "rejected" ? (
                <div className="pickup-pending">
                  This order was rejected by the farmer.
                </div>
              ) : null}

              <MessageThread orderId={o.id} />
            </div>
          );
        })}
      </div>

      {pageError && <div className="error" style={{ marginTop: 12 }}>{pageError}</div>}
    </div>
  );
}
