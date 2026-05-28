// frontend/src/pages/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

import { api } from "../api.js";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import DateRangeFilter, { presetToRange } from "../components/DateRangeFilter.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatKsh, formatNumber, formatCompactNumber } from "../utils/format.js";

// --- Tiny presentational helpers ---

function Kpi({ label, value, sub, accent = false }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className={`kpi-value ${accent ? "kpi-accent" : ""}`}>{value}</span>
      {sub ? <span className="kpi-sub">{sub}</span> : null}
    </div>
  );
}

function ChartCard({ title, subtitle, children, height }) {
  return (
    <div className="card chart-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">{title}</h3>
          {subtitle ? <div className="chart-meta">{subtitle}</div> : null}
        </div>
      </div>
      <div className={`chart-body ${height === "sm" ? "chart-body-sm" : ""}`}>
        {children}
      </div>
    </div>
  );
}

function FunnelChart({ stages }) {
  if (!stages?.length) return <div className="small">No data.</div>;
  const max = Math.max(...stages.map((s) => s.count), 1);
  return (
    <div className="funnel">
      {stages.map((s) => {
        const width = Math.max(4, (s.count / max) * 100);
        return (
          <div key={s.key} className="funnel-row">
            <div className="funnel-bar" title={`${s.label}: ${s.count}`}>
              <div className="funnel-fill" style={{ width: `${width}%` }} />
              <div className="funnel-label">
                <span>{s.label}</span>
                <span>{formatNumber(s.count)}</span>
              </div>
            </div>
            <span className="funnel-pct">{s.pct_of_total}%</span>
          </div>
        );
      })}
    </div>
  );
}

// --- Page ---

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "reports",  label: "Reports" },
  { key: "users",    label: "Users" },
];

export default function AdminDashboard() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [range, setRange] = useState(presetToRange("30d"));

  const [kpis, setKpis] = useState(null);
  const [series, setSeries] = useState({ bucket: "day", items: [] });
  const [topCrops, setTopCrops] = useState([]);
  const [topFarmers, setTopFarmers] = useState([]);
  const [topBuyers, setTopBuyers] = useState([]);
  const [byCounty, setByCounty] = useState([]);
  const [funnel, setFunnel] = useState(null);

  const [users, setUsers] = useState([]);
  const [togglingId, setTogglingId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");

  const canRefresh = useMemo(() => !loading && togglingId === null, [loading, togglingId]);

  async function loadAll() {
    setPageError("");
    setLoading(true);
    try {
      const [
        kpisRes, otRes, tcRes, tfRes, tbRes, bcRes, fnRes, uRes,
      ] = await Promise.all([
        api.adminReportKpis(range),
        api.adminReportOrdersOverTime(range),
        api.adminReportTopCrops(range, 10),
        api.adminReportTopFarmers(range, 10),
        api.adminReportTopBuyers(range, 10),
        api.adminReportOrdersByCounty(range),
        api.adminReportFunnel(range),
        api.adminUsers(),
      ]);

      setKpis(kpisRes);
      setSeries(otRes || { bucket: "day", items: [] });
      setTopCrops(tcRes.items || []);
      setTopFarmers(tfRes.items || []);
      setTopBuyers(tbRes.items || []);
      setByCounty(bcRes.items || []);
      setFunnel(fnRes || null);
      setUsers(uRes.items || []);
    } catch (e) {
      const msg = e?.message || "Failed to load admin dashboard.";
      setPageError(msg);
      toast.show({ type: "error", title: "Load failed", message: msg });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  async function toggleUser(id, is_active) {
    setPageError("");
    setTogglingId(id);
    try {
      await api.adminSetUserActive(id, !is_active);
      toast.show({
        type: "success",
        title: "User updated",
        message: !is_active ? "User activated." : "User deactivated.",
      });
      const uRes = await api.adminUsers();
      setUsers(uRes.items || []);
    } catch (e) {
      const msg = e?.message || "Failed to update user.";
      setPageError(msg);
      toast.show({ type: "error", title: "Update failed", message: msg });
    } finally {
      setTogglingId(null);
    }
  }

  const rangeLabel = !range.from && !range.to
    ? "All time"
    : `${range.from || "…"} to ${range.to || "…"}`;

  const showFilterBar = activeTab !== "users";

  return (
    <div className="container">
      <PageHeader
        title="Admin dashboard"
        subtitle="Marketplace overview, reports, and user management."
        right={
          <button className="btn" onClick={loadAll} disabled={!canRefresh}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      {/* TABS */}
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={activeTab === t.key}
            className={`tab ${activeTab === t.key ? "active" : ""}`}
            onClick={() => setActiveTab(t.key)}
            type="button"
          >
            {t.label}
            {t.key === "users" && users.length > 0 ? (
              <span className="tab-count">{users.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* DATE FILTER (Overview + Reports only) */}
      {showFilterBar && (
        <DateRangeFilter value={range} onChange={setRange} defaultPreset="30d" />
      )}

      {pageError ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="error">{pageError}</div>
        </div>
      ) : null}

      {/* ======================= OVERVIEW ======================= */}
      {activeTab === "overview" && (
        <>
          <div className="kpi-grid">
            <Kpi
              label="GMV"
              value={kpis ? formatKsh(kpis.gmv) : "—"}
              sub="Accepted + completed orders"
              accent
            />
            <Kpi label="Orders" value={kpis ? formatNumber(kpis.orders) : "—"} sub={rangeLabel} />
            <Kpi
              label="Active listings"
              value={kpis ? formatNumber(kpis.active_listings) : "—"}
              sub={`of ${kpis ? formatNumber(kpis.crops) : "—"} total`}
            />
            <Kpi label="Users" value={kpis ? formatNumber(kpis.users) : "—"} sub="Registered accounts" />
          </div>

          <div className="dash-grid dash-grid-2">
            <ChartCard title="Orders over time" subtitle={`Bucketed by ${series.bucket || "day"}`}>
              {series.items?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series.items} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="var(--brand-500)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--brand-500)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--slate-200)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      tickFormatter={formatCompactNumber}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#fff",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Orders"
                      stroke="var(--brand-600)"
                      strokeWidth={2}
                      fill="url(#gradTotal)"
                    />
                    <Area
                      type="monotone"
                      dataKey="accepted"
                      name="Accepted"
                      stroke="var(--info)"
                      strokeWidth={2}
                      fill="transparent"
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      name="Completed"
                      stroke="var(--success)"
                      strokeWidth={2}
                      fill="transparent"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No orders" message="No orders in this date range." />
              )}
            </ChartCard>

            <ChartCard title="Conversion funnel" subtitle="From requested to completed">
              {funnel ? (
                <>
                  <FunnelChart stages={funnel.stages} />
                  <div className="row" style={{ marginTop: 14 }}>
                    <span className="pill warning">Rejected: {formatNumber(funnel.rejected)}</span>
                    <span className="pill info">Still pending: {formatNumber(funnel.still_pending)}</span>
                  </div>
                </>
              ) : (
                <div className="small">Loading…</div>
              )}
            </ChartCard>
          </div>
        </>
      )}

      {/* ======================= REPORTS ======================= */}
      {activeTab === "reports" && (
        <>
          <div className="dash-grid" style={{ marginBottom: 16 }}>
            <ChartCard title="Orders by county" subtitle="Geographic distribution" height="sm">
              {byCounty.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCounty} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--slate-200)" vertical={false} />
                    <XAxis
                      dataKey="county"
                      tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#fff",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="orders_count" name="Orders" fill="var(--brand-600)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No geographic data" message="No orders matched with a county." />
              )}
            </ChartCard>
          </div>

          <div className="dash-grid dash-grid-2" style={{ marginBottom: 16 }}>
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Top crops</h3>
                  <div className="chart-meta">By orders, then revenue</div>
                </div>
              </div>
              {topCrops.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Crop</th>
                        <th className="num">Orders</th>
                        <th className="num">Qty sold</th>
                        <th className="num">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCrops.map((r) => (
                        <tr key={r.crop_id}>
                          <td>{r.crop_name}</td>
                          <td className="num">{formatNumber(r.orders_count)}</td>
                          <td className="num">{formatNumber(r.quantity_sold)}</td>
                          <td className="num">{formatKsh(r.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No sales yet" message="No accepted or completed orders in range." />
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Top farmers</h3>
                  <div className="chart-meta">By orders received</div>
                </div>
              </div>
              {topFarmers.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Farmer</th>
                        <th className="num">Orders</th>
                        <th className="num">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topFarmers.map((r) => (
                        <tr key={r.user_id}>
                          <td>
                            <div>{r.name}</div>
                            <div className="xs">{r.email}</div>
                          </td>
                          <td className="num">{formatNumber(r.orders_count)}</td>
                          <td className="num">{formatKsh(r.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No farmer data" message="No farmers with sales in range." />
              )}
            </div>
          </div>

          <div className="dash-grid">
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Top buyers</h3>
                  <div className="chart-meta">By orders placed</div>
                </div>
              </div>
              {topBuyers.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Buyer</th>
                        <th className="num">Orders</th>
                        <th className="num">Spend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topBuyers.map((r) => (
                        <tr key={r.user_id}>
                          <td>
                            <div>{r.name}</div>
                            <div className="xs">{r.email}</div>
                          </td>
                          <td className="num">{formatNumber(r.orders_count)}</td>
                          <td className="num">{formatKsh(r.spend)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No buyer data" message="No buyers placed orders in range." />
              )}
            </div>
          </div>
        </>
      )}

      {/* ======================= USERS ======================= */}
      {activeTab === "users" && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">User management</h3>
              <div className="chart-meta">Activate or deactivate accounts</div>
            </div>
          </div>
          {users.length === 0 ? (
            <EmptyState title="No users" message="No users found." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const busy = togglingId === u.id;
                    return (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td><span className="xs">{u.email}</span></td>
                        <td><span className="pill brand">{u.role}</span></td>
                        <td>
                          {u.is_active
                            ? <span className="pill success">Active</span>
                            : <span className="pill danger">Deactivated</span>}
                        </td>
                        <td className="num">
                          <button
                            className="btn sm"
                            onClick={() => toggleUser(u.id, u.is_active)}
                            disabled={busy || loading}
                          >
                            {busy ? "Updating…" : u.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
