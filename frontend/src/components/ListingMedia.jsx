// frontend/src/components/ListingMedia.jsx
import React from "react";

export default function ListingMedia({
  src,
  alt,
  fit = "cover", // "cover" | "contain"
  onClick,
}) {
  if (!src) return null;

  return (
    <div
      className={`media-frame ${fit === "contain" ? "contain" : ""}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      aria-label={onClick ? "Open image" : undefined}
      style={onClick ? { cursor: "zoom-in" } : undefined}
    >
      <img src={src} alt={alt || "Listing image"} loading="lazy" />
    </div>
  );
}