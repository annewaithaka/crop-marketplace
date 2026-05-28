// frontend/src/utils/format.js
// Small formatting helpers used throughout the app.

const KSH = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

const KSH_PRECISE = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 2,
});

const NUM = new Intl.NumberFormat("en-KE");

export function formatKsh(value, { precise = false } = {}) {
  const n = Number(value || 0);
  return precise ? KSH_PRECISE.format(n) : KSH.format(n);
}

export function formatNumber(value) {
  return NUM.format(Number(value || 0));
}

export function formatCompactNumber(value) {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return NUM.format(n);
}

export function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function toIsoDate(d) {
  // YYYY-MM-DD in local time
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export function startOfYear() {
  const d = new Date();
  return new Date(d.getFullYear(), 0, 1);
}

export function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}