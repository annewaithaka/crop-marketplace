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
  return { accept: false, reject: false, complete: false }; // rejected/completed/unknown
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
                <div className="small" style={{ marginTop: 6 }}>
                  Contact: {o.contact_details}
                </div>

                <div className="row" style={{ marginTop: 10 }}>
                  {actions.accept && (
                    <button
                      className="btn primary"
                      onClick={() => setStatus(o.id, "accepted")}
                      disabled={disableAll}
                      title={busy ? "Updating…" : "Accept order"}
                    >
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

                  {!actions.accept && !actions.reject && !actions.complete && (
                    <span className="pill">No actions available</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}