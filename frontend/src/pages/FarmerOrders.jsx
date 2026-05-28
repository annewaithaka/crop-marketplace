// frontend/src/pages/FarmerOrders.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import EmptyState from "../components/EmptyState.jsx";
import StatusPill from "../components/StatusPill.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatKsh, formatNumber } from "../utils/format.js";

function allowedActions(status) {
  const s = (status || "").toLowerCase();
  if (s === "pending")  return { accept: true,  reject: true,  complete: false };
  if (s === "accepted") return { accept: false, reject: true,  complete: true  };
  return { accept: false, reject: false, complete: false };
}

/* --- Message thread (quieter visual style) --- */

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
      if (res.item) setItems((prev) => [...prev, res.item]);
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
    <div className="thread">
      <div className="thread-head">
        <span className="thread-title">Messages with buyer</span>
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

  // Group orders so pending ones bubble to the top — useful for farmers
  const sorted = useMemo(() => {
    const rank = { pending: 0, accepted: 1, completed: 2, rejected: 3 };
    return [...items].sort((a, b) => {
      const ra = rank[(a.status || "").toLowerCase()] ?? 99;
      const rb = rank[(b.status || "").toLowerCase()] ?? 99;
      if (ra !== rb) return ra - rb;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [items]);

  const pendingCount = useMemo(
    () => items.filter((o) => (o.status || "").toLowerCase() === "pending").length,
    [items]
  );

  const header = (
    <PageHeader
      title="Incoming orders"
      subtitle="Accept, reject, or complete buyer requests."
      right={
        <div className="row" style={{ gap: 8 }}>
          {pendingCount > 0 ? (
            <span className="pill warning">{pendingCount} pending</span>
          ) : items.length > 0 ? (
            <span className="pill success">All caught up</span>
          ) : null}
          <button className="btn sm" onClick={load} disabled={!canInteract}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      }
    />
  );

  if (loading && items.length === 0) {
    return (
      <>
        {header}
        <div className="card"><div className="small">Loading incoming orders…</div></div>
      </>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          title="No incoming orders"
          message="When buyers request your crops, their orders will appear here."
        />
      </>
    );
  }

  return (
    <>
      {header}

      <div className="grid">
        {sorted.map((o) => {
          const busy = updatingId === o.id;
          const actions = allowedActions(o.status);
          const disableAll = busy || loading;

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

                {o.proposed_price != null && (
                  <>
                    <dt>Proposed price</dt>
                    <dd>{formatKsh(o.proposed_price, { precise: true })} / {o.crop?.unit}</dd>
                  </>
                )}

                <dt>Location</dt>
                <dd>{o.crop?.location}</dd>

                <dt>Contact</dt>
                <dd style={{ whiteSpace: "pre-wrap" }}>{o.contact_details}</dd>

                {o.delivery_notes && (
                  <>
                    <dt>Notes</dt>
                    <dd style={{ whiteSpace: "pre-wrap" }}>{o.delivery_notes}</dd>
                  </>
                )}
              </dl>

              <div className="listing-actions">
                {actions.accept && (
                  <button
                    className="btn sm primary"
                    onClick={() => setStatus(o.id, "accepted")}
                    disabled={disableAll}
                  >
                    {busy ? "Updating…" : "Accept"}
                  </button>
                )}
                {actions.reject && (
                  <button
                    className="btn sm danger"
                    onClick={() => setStatus(o.id, "rejected")}
                    disabled={disableAll}
                  >
                    Reject
                  </button>
                )}
                {actions.complete && (
                  <button
                    className="btn sm"
                    onClick={() => setStatus(o.id, "completed")}
                    disabled={disableAll}
                  >
                    Mark completed
                  </button>
                )}
                {!actions.accept && !actions.reject && !actions.complete && (
                  <span className="small">No actions available for {o.status} orders.</span>
                )}
              </div>

              <MessageThread orderId={o.id} />
            </div>
          );
        })}
      </div>

      {pageError && <div className="error" style={{ marginTop: 12 }}>{pageError}</div>}
    </>
  );
}
