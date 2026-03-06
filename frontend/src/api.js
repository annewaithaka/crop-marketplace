const API_BASE = "http://172.27.45.68:5000/api";

export function getToken() {
  return localStorage.getItem("token") || "";
}

export function setToken(token) {
  if (!token) localStorage.removeItem("token");
  else localStorage.setItem("token", token);
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  me: () => request("/auth/me"),

  listCrops: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/crops${qs ? `?${qs}` : ""}`, { auth: false });
  },
  myCrops: () => request("/crops/mine"),
  createCrop: (payload) => request("/crops", { method: "POST", body: payload }),

  createOrder: (payload) => request("/orders", { method: "POST", body: payload }),
  myOrders: () => request("/orders/mine"),
  incomingOrders: () => request("/orders/incoming"),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: "PUT", body: { status } }),

  adminUsers: () => request("/admin/users"),
  adminSetUserActive: (id, is_active) => request(`/admin/users/${id}/active`, { method: "PUT", body: { is_active } }),
  adminCrops: () => request("/admin/crops"),
  adminOrders: () => request("/admin/orders"),
  adminSummary: () => request("/admin/reports/summary")
};
