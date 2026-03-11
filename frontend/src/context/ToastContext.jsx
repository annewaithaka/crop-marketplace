//frontend/src/context/ToastContext.jsx
import React, { createContext, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

function id() {
  return Math.random().toString(16).slice(2);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const api = useMemo(() => ({
    show({ type = "info", title = "", message = "", timeoutMs = 3500 }) {
      const toastId = id();
      setToasts((prev) => [...prev, { id: toastId, type, title, message }]);

      if (timeoutMs > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toastId));
        }, timeoutMs);
      }

      return toastId;
    },
    remove(toastId) {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }
  }), []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onClose={api.remove} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function ToastViewport({ toasts, onClose }) {
  return (
    <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <div className="toast-head">
            <strong className="toast-title">{t.title || label(t.type)}</strong>
            <button className="toast-x" onClick={() => onClose(t.id)} aria-label="Close">✕</button>
          </div>
          {t.message ? <div className="toast-msg">{t.message}</div> : null}
        </div>
      ))}
    </div>
  );
}

function label(type) {
  if (type === "success") return "Success";
  if (type === "error") return "Error";
  if (type === "warning") return "Notice";
  return "Info";
}