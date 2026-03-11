// frontend/src/pages/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function AdminDashboard() {
  const toast = useToast();

  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);

  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(false);

  const [togglingId, setTogglingId] = useState(null);

  const canRefresh = useMemo(() => !loading && togglingId === null, [loading, togglingId]);

  async function load() {
    setPageError("");
    setLoading(true);
    try {
      const [s, u] = await Promise.all([api.adminSummary(), api.adminUsers()]);
      setSummary(s);
      setUsers(u.items || []);
    } catch (e) {
      const msg = e?.message || "Failed to load admin dashboard.";
      setPageError(msg);
      toast.show({ type: "error", title: "Load failed", message: msg });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleUser(id, is_active) {
    setPageError("");
    setTogglingId(id);
    try {
      await api.adminSetUserActive(id, !is_active);
      toast.show({
        type: "success",
        title: "User updated",
        message: !is_active ? "User activated." : "User deactivated."
      });
      await load();
    } catch (e) {
      const msg = e?.message || "Failed to update user.";
      setPageError(msg);
      toast.show({ type: "error", title: "Update failed", message: msg });
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="container">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Manage users and monitor marketplace activity."
        right={
          <button className="btn" onClick={load} disabled={!canRefresh}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      {pageError ? (
        <div className="card">
          <div className="error">{pageError}</div>
        </div>
      ) : loading && !summary ? (
        <div className="card">
          <div className="small">Loading dashboard…</div>
        </div>
      ) : (
        <>
          {summary ? (
            <div className="card">
              <div className="row">
                <span className="pill">Users: {summary.users}</span>
                <span className="pill">Crops: {summary.crops}</span>
                <span className="pill">Orders: {summary.orders}</span>
              </div>

              <div className="small" style={{ marginTop: 10 }}>
                Orders by status:{" "}
                {summary.orders_by_status
                  ? Object.entries(summary.orders_by_status)
                      .map(([k, v]) => `${k}:${v}`)
                      .join(" • ")
                  : "—"}
              </div>
            </div>
          ) : null}

          <div style={{ height: 10 }} />
          <h3>Users</h3>

          {loading && users.length === 0 ? (
            <div className="card">
              <div className="small">Loading users…</div>
            </div>
          ) : users.length === 0 ? (
            <EmptyState title="No users" message="No users found." />
          ) : (
            <div className="grid">
              {users.map((u) => {
                const busy = togglingId === u.id;
                return (
                  <div key={u.id} className="card">
                    <div className="kv">
                      <strong>{u.name}</strong>
                      <span className="pill">{u.role}</span>
                    </div>
                    <div className="small">{u.email}</div>

                    <div className="row" style={{ marginTop: 10 }}>
                      <span className="pill">{u.is_active ? "Active" : "Deactivated"}</span>
                      <button
                        className="btn"
                        onClick={() => toggleUser(u.id, u.is_active)}
                        disabled={busy || loading}
                      >
                        {busy ? "Updating…" : u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}