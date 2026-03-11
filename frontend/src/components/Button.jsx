import React from "react";
import Spinner from "./Spinner.jsx";

export default function Button({ className = "btn", loading, disabled, children, ...props }) {
  const isDisabled = disabled || loading;
  return (
    <button className={className} disabled={isDisabled} {...props}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        {loading ? <Spinner size={18} /> : null}
        <span>{children}</span>
      </span>
    </button>
  );
}