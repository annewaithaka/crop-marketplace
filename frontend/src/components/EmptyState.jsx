// frontend/src/components/EmptyState.jsx
import React from "react";

export default function EmptyState({ title, message, action }) {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      {title ? <div className="empty-title">{title}</div> : null}
      {message ? <div className="empty-msg">{message}</div> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}