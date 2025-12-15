// src/components/common/TeamBadge.jsx
import React from "react";
import { getTheme } from "./teamTheme";
import PixelBadge from "./PixelBadge";

export default function TeamBadge({ abbr, size = 28 }) {
  const t = getTheme(abbr);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <PixelBadge abbr={abbr} primary={t.primary} secondary={t.secondary} size={size} />
      <span style={{ fontWeight: 900, letterSpacing: 0.4 }}>{abbr}</span>
    </div>
  );
}
