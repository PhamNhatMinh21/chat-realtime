import React from "react";
import { createPortal } from "react-dom";
import { Download } from "lucide-react";
import { downloadFile } from "../lib/fileHelpers";

export default function ImageLightbox({ src, filename, onClose }) {
  return createPortal(
    <div className="img-lightbox-overlay" onClick={onClose}>
      <img src={src} alt="preview" onClick={e => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }} />
      <button
        onClick={e => { e.stopPropagation(); downloadFile(src, filename); }}
        style={{ position: "fixed", top: 20, right: 20, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "9px 18px", color: "white", fontSize: 14, display: "flex", alignItems: "center", gap: 7, cursor: "pointer", zIndex: 10000 }}
      >
        <Download size={15} /> Tải về
      </button>
    </div>,
    document.body
  );
}
