// frontend/src/components/ImagePicker.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

const MAX = 3;

function makePreviewUrl(file) {
  return URL.createObjectURL(file);
}

export default function ImagePicker({ disabled, value, onChange }) {
  const inputRef = useRef(null);
  const files = value || [];

  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const next = files.map((f) => ({ name: f.name, url: makePreviewUrl(f) }));
    setPreviews(next);

    return () => {
      next.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [files]);

  const countLabel = useMemo(() => `${files.length}/${MAX}`, [files.length]);

  function addFiles(fileList) {
    const picked = Array.from(fileList || []);
    if (picked.length === 0) return;

    const merged = [...files, ...picked].slice(0, MAX);
    onChange?.(merged);

    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(idx) {
    const next = files.filter((_, i) => i !== idx);
    onChange?.(next);
  }

  return (
    <div className="grid">
      <div className="row" style={{ alignItems: "flex-end" }}>
        <div className="grid" style={{ flex: 1, minWidth: 240 }}>
          <label>Images (optional, up to 3)</label>
          <input
            ref={inputRef}
            className="input"
            type="file"
            accept="image/*"
            multiple
            disabled={disabled}
            onChange={(e) => addFiles(e.target.files)}
          />
          <div className="file-help">Tip: you can select multiple images in one pick (desktop: Ctrl/Shift).</div>
        </div>

        <span className="pill" style={{ height: 34, display: "inline-flex", alignItems: "center" }}>
          Selected: {countLabel}
        </span>
      </div>

      {files.length > 0 && (
        <>
          <div className="preview-grid">
            {previews.map((p, idx) => (
              <div key={`${p.name}-${idx}`} className="preview-tile">
                <img src={p.url} alt={p.name} />
                <div className="preview-actions">
                  <div className="small" style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.name}
                  </div>
                  <button className="btn danger" type="button" onClick={() => removeAt(idx)} disabled={disabled}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}