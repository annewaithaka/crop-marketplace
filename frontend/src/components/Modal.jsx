// frontend/src/components/Modal.jsx
import React, { useEffect } from "react";

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  wide = false,
  footer,
  children,
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    // Lock body scroll while open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={`modal ${wide ? "modal-wide" : ""}`}>
        <div className="modal-head">
          <div>
            <h3 className="modal-title">{title}</h3>
            {subtitle ? <div className="modal-sub">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            className="modal-x"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
