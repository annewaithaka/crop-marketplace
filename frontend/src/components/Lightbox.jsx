// frontend/src/components/Lightbox.jsx
import React, { useEffect } from "react";

export default function Lightbox({ open, title = "Image preview", src, onClose }) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="lightbox-backdrop"
      onClick={() => onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="lightbox" onClick={(e) => e.stopPropagation()}>
        <div className="lightbox-top">
          <div className="lightbox-title">{title}</div>
          <button className="btn" type="button" onClick={() => onClose?.()}>
            Close
          </button>
        </div>
        <div className="lightbox-body">{src ? <img src={src} alt={title} /> : null}</div>
      </div>
    </div>
  );
}