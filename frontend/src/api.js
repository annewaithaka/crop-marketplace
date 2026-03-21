// frontend/src/api.js
const API_BASE = "http://172.27.45.68:5000/api";

export function getToken() {
  return localStorage.getItem("token") || "";
}

export function setToken(token) {
  if (!token) localStorage.removeItem("token");
  else localStorage.setItem("token", token);
}

function cleanParams(params = {}) {
  const out = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s === "") continue;
    out[k] = s;
  }
  return out;
}

async function safeParseJson(res) {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function networkFriendlyMessage(err) {
  const msg = err?.message || "";
  if (msg === "Failed to fetch") {
    return "Network error: cannot reach the server. Check backend is running and CORS/Vite proxy is configured.";
  }
  return msg || "Network error.";
}

function pickFirstFieldError(errors) {
  if (!errors || typeof errors !== "object") return "";
  const firstKey = Object.keys(errors)[0];
  if (!firstKey) return "";
  const val = errors[firstKey];
  if (typeof val === "string" && val.trim()) return val.trim();
  return "";
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error(networkFriendlyMessage(err));
  }

  const data = await safeParseJson(res);

  if (!res.ok) {
    const baseMessage =
      data?.error ||
      data?.message ||
      (typeof data === "string" ? data : "") ||
      `Request failed (${res.status})`;

    const fieldMsg = data?.error === "validation failed" ? pickFirstFieldError(data?.errors) : "";

    const message = fieldMsg ? `${baseMessage}: ${fieldMsg}` : baseMessage;
    throw new Error(message);
  }

  return data;
}

async function requestMultipart(path, { method = "POST", formData, auth = true } = {}) {
  const headers = {};

  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body: formData });
  } catch (err) {
    throw new Error(networkFriendlyMessage(err));
  }

  const data = await safeParseJson(res);

  if (!res.ok) {
    const baseMessage =
      data?.error ||
      data?.message ||
      (typeof data === "string" ? data : "") ||
      `Request failed (${res.status})`;

    const fieldMsg = data?.error === "validation failed" ? pickFirstFieldError(data?.errors) : "";

    const message = fieldMsg ? `${baseMessage}: ${fieldMsg}` : baseMessage;
    throw new Error(message);
  }

  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  me: () => request("/auth/me"),

  listCrops: (params = {}) => {
    const qs = new URLSearchParams(cleanParams(params)).toString();
    return request(`/crops${qs ? `?${qs}` : ""}`, { auth: false });
  },

  myCrops: () => request("/crops/mine"),
  createCrop: (payload) => request("/crops", { method: "POST", body: payload }),

  // Listings CRUD (Farmer)
  updateCrop: (cropId, payload) => request(`/crops/${cropId}`, { method: "PUT", body: payload }),
  deleteCrop: (cropId) => request(`/crops/${cropId}`, { method: "DELETE" }),

  // Images
  uploadCropImages: (cropId, files) => {
    const fd = new FormData();
    for (const f of files) fd.append("images", f);
    return requestMultipart(`/crops/${cropId}/images`, { method: "POST", formData: fd });
  },

  deleteCropImage: (cropId, imageId) =>
    request(`/crops/${cropId}/images/${imageId}`, { method: "DELETE" }),

  // Orders
  createOrder: (payload) => request("/orders", { method: "POST", body: payload }),
  myOrders: () => request("/orders/mine"),
  incomingOrders: () => request("/orders/incoming"),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: "PUT", body: { status } }),

  // Admin
  adminUsers: () => request("/admin/users"),
  adminSetUserActive: (id, is_active) => request(`/admin/users/${id}/active`, { method: "PUT", body: { is_active } }),
  adminCrops: () => request("/admin/crops"),
  adminOrders: () => request("/admin/orders"),
  adminSummary: () => request("/admin/reports/summary"),
};