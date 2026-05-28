// frontend/src/components/StatusPill.jsx
import React from "react";

const STATUS_MAP = {
  pending:   { label: "Pending",   cls: "warning" },
  accepted:  { label: "Accepted",  cls: "info" },
  completed: { label: "Completed", cls: "success" },
  rejected:  { label: "Rejected",  cls: "danger" },
};

export default function StatusPill({ status }) {
  const key = String(status || "").toLowerCase();
  const meta = STATUS_MAP[key] || { label: status || "Unknown", cls: "" };
  return <span className={`pill ${meta.cls}`}>{meta.label}</span>;
}
