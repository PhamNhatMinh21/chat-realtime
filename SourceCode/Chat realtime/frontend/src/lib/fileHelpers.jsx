import React from "react";
import { FileText } from "lucide-react";

import { BASE_URL } from "./config";

export function downloadFile(url, filename) {
  const storedFilename = url.split("/uploads/").pop();
  const displayName = filename || storedFilename;
  const downloadUrl =
    `${BASE_URL}/api/download?file=${encodeURIComponent(storedFilename)}&name=${encodeURIComponent(displayName)}`;

  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = displayName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FileIcon({ type }) {
  const color =
    type?.includes("pdf") ? "#FF4136" :
      type?.includes("word") || type?.includes("doc") ? "#2563EB" :
        type?.includes("zip") || type?.includes("rar") || type?.includes("7z") ? "#D97706" :
          type?.includes("excel") || type?.includes("sheet") ? "#16A34A" :
            "#6366F1";

  const ext = (type?.split("/")?.[1] || "FILE").toUpperCase().slice(0, 4);

  return (
    <div style={{ width: 44, height: 44, borderRadius: 10, background: color, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <FileText size={18} color="white" />
      <span style={{ fontSize: 8, color: "white", fontWeight: 800, marginTop: 1 }}>{ext}</span>
    </div>
  );
}
