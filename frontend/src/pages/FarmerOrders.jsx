// frontend/src/pages/FarmerOrders.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useToast } from "../context/ToastContext.jsx";

function allowedActions(status) {
  const s = (status || "").toLowerCase();
  if (s === "pending") return { accept: true, reject: true, complete: false };
  if (s === "accepted") return { accept: false, reject: true, complete: true };
  return { accept: false, reject: false, complete: false };
}

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
        <strong>Messages</strong>
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

export default function FarmerOrders() {
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(false);

  const [updatingId, setUpdatingId] = useState(null);

  const canInteract = useMemo(() => !loading && updatingId === null, [loading, updatingId]);

  async function load() {
    setPageError("");
    setLoading(true);
    try {
      const res = await api.incomingOrders();
      setItems(res.items || []);
    } catch (e) {
      const msg = e?.message || "Failed to load incoming orders.";
      setPageError(msg);
      toast.show({ type: "error", title: "Could not load orders", message: msg });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(id, status) {
    setPageError("");
    setUpdatingId(id);
    try {
      await api.updateOrderStatus(id, status);
      toast.show({ type: "success", title: "Updated", message: `Order marked as ${status}.` });
      await load();
    } catch (e2) {
      const msg = e2?.message || "Failed to update order.";
      setPageError(msg);
      toast.show({ type: "error", title: "Update failed", message: msg });
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="container">
      <PageHeader
        title="Incoming Orders"
        subtitle="Accept, reject, or complete incoming buyer requests."
        right={
          <button className="btn" onClick={load} disabled={!canInteract}>
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
          <div className="small">Loading incoming orders…</div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No incoming orders" message="When buyers request your crops, their orders will appear here." />
      ) : (
        <div className="grid">
          {items.map((o) => {
            const busy = updatingId === o.id;
            const actions = allowedActions(o.status);
            const disableAll = busy || loading;

            return (
              <div key={o.id} className="card">
                <div className="kv">
                  <strong>{o.crop?.name || "Crop"}</strong>
                  <span className="pill">{o.status}</span>
                </div>

                <div className="small">Location: {o.crop?.location}</div>

                <div className="small">
                  Qty requested: <b>{o.quantity_requested}</b> {o.crop?.unit}
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

                <div className="small" style={{ marginTop: 6 }}>
                  Contact: {o.contact_details}
                </div>

                <div className="row" style={{ marginTop: 10 }}>
                  {actions.accept && (
                    <button className="btn primary" onClick={() => setStatus(o.id, "accepted")} disabled={disableAll} title={busy ? "Updating…" : "Accept order"}>
                      {busy ? "Updating…" : "Accept"}
                    </button>
                  )}

                  {actions.reject && (
                    <button className="btn danger" onClick={() => setStatus(o.id, "rejected")} disabled={disableAll}>
                      Reject
                    </button>
                  )}

                  {actions.complete && (
                    <button className="btn" onClick={() => setStatus(o.id, "completed")} disabled={disableAll}>
                      Complete
                    </button>
                  )}

                  {!actions.accept && !actions.reject && !actions.complete && <span className="pill">No actions available</span>}
                </div>

                <MessageThread orderId={o.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}