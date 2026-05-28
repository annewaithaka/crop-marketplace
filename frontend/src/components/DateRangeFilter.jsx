// frontend/src/components/DateRangeFilter.jsx
import React, { useState } from "react";
import { toIsoDate, daysAgo, startOfYear, today } from "../utils/format.js";

const PRESETS = [
  { key: "7d",  label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "ytd", label: "This year" },
  { key: "all", label: "All time" },
];

function presetToRange(key) {
  const t = today();
  switch (key) {
    case "7d":  return { from: toIsoDate(daysAgo(6)),  to: toIsoDate(t) };
    case "30d": return { from: toIsoDate(daysAgo(29)), to: toIsoDate(t) };
    case "90d": return { from: toIsoDate(daysAgo(89)), to: toIsoDate(t) };
    case "ytd": return { from: toIsoDate(startOfYear()), to: toIsoDate(t) };
    case "all":
    default:    return { from: "", to: "" };
  }
}

export default function DateRangeFilter({ value, onChange, defaultPreset = "30d" }) {
  const [active, setActive] = useState(defaultPreset);
  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(value?.from || "");
  const [customTo, setCustomTo] = useState(value?.to || "");

  function applyPreset(key) {
    setActive(key);
    setCustomOpen(false);
    onChange(presetToRange(key));
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    setActive("custom");
    onChange({ from: customFrom, to: customTo });
  }

  return (
    <div className="filter-bar" role="toolbar" aria-label="Date range">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          className={`range-chip ${active === p.key ? "active" : ""}`}
          onClick={() => applyPreset(p.key)}
        >
          {p.label}
        </button>
      ))}

      <div className="range-divider" aria-hidden="true" />

      <button
        type="button"
        className={`range-chip ${active === "custom" ? "active" : ""}`}
        onClick={() => setCustomOpen((o) => !o)}
      >
        Custom…
      </button>

      {customOpen && (
        <div className="range-custom">
          <input
            type="date"
            className="input"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            aria-label="From date"
          />
          <span className="small">to</span>
          <input
            type="date"
            className="input"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            aria-label="To date"
          />
          <button
            type="button"
            className="btn sm primary"
            onClick={applyCustom}
            disabled={!customFrom || !customTo}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

export { presetToRange };
