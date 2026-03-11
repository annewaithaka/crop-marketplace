//frontend/src/components/PageHeader.jsx
import React from "react";

export default function PageHeader({ title, subtitle, right }) {
  return (
    <div className="page-header">
      <div>
        <h2 className="page-title">{title}</h2>
        {subtitle ? <div className="page-subtitle">{subtitle}</div> : null}
      </div>
      {right ? <div className="page-header-right">{right}</div> : null}
    </div>
  );
}