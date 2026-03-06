import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const [s, u] = await Promise.all([api.adminSummary(), api.adminUsers()]);
    setSummary(s);
    setUsers(u.items || []);
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, []);

  async function toggleUser(id, is_active) {
    setErr(""); setMsg("");
    try {
      await api.adminSetUserActive(id, !is_active);
      setMsg("User updated.");
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Admin Dashboard</h2>
        {err && <div className="error">{err}</div>}
        {msg && <div className="success">{msg}</div>}
      </div>

      <div style={{ height: 14 }} />

      {summary && (
        <div className="card">
          <div className="row">
            <span className="pill">Users: {summary.users}</span>
            <span className="pill">Crops: {summary.crops}</span>
            <span className="pill">Orders: {summary.orders}</span>
          </div>
          <div className="small" style={{ marginTop: 10 }}>
            Orders by status: {Object.entries(summary.orders_by_status).map(([k, v]) => `${k}:${v}`).join(" • ")}
          </div>
        </div>
      )}

      <h3>Users</h3>
      <div className="grid">
        {users.map((u) => (
          <div key={u.id} className="card">
            <div className="kv">
              <strong>{u.name}</strong>
              <span className="pill">{u.role}</span>
            </div>
            <div className="small">{u.email}</div>
            <div className="row" style={{ marginTop: 10 }}>
              <span className="pill">{u.is_active ? "Active" : "Deactivated"}</span>
              <button className="btn" onClick={() => toggleUser(u.id, u.is_active)}>
                {u.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
