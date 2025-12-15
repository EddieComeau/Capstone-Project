// src/components/common/PixelBadge.jsx
import React, { useMemo } from "react";

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shade(hex, amt) {
  const n = hex.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(n.slice(0, 2), 16) + amt));
  const g = Math.max(0, Math.min(255, parseInt(n.slice(2, 4), 16) + amt));
  const b = Math.max(0, Math.min(255, parseInt(n.slice(4, 6), 16) + amt));
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export default function PixelBadge({ abbr = "TEAM", primary, secondary, size = 28 }) {
  const dataUrl = useMemo(() => {
    const w = 16;
    const h = 16;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    const seed = hashString(abbr);
    const palette = [
      primary,
      secondary,
      shade(primary, -55),
      shade(secondary, +35),
    ];

    ctx.fillStyle = shade(primary, -20);
    ctx.fillRect(0, 0, w, h);

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const v = (seed ^ (x * 374761393) ^ (y * 668265263)) >>> 0;
        const pick = v % 10;

        let c = palette[0];
        if (pick < 4) c = palette[0];
        else if (pick < 8) c = palette[1];
        else if (pick === 8) c = palette[2];
        else c = palette[3];

        const sx = x < w / 2 ? x : w - 1 - x;
        const sv = (seed ^ (sx * 2246822519) ^ (y * 3266489917)) >>> 0;
        if (sv % 7 === 0) c = palette[2];

        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Border
    ctx.fillStyle = "#0b0b0b";
    for (let x = 0; x < w; x++) {
      ctx.fillRect(x, 0, 1, 1);
      ctx.fillRect(x, h - 1, 1, 1);
    }
    for (let y = 0; y < h; y++) {
      ctx.fillRect(0, y, 1, 1);
      ctx.fillRect(w - 1, y, 1, 1);
    }

    return canvas.toDataURL("image/png");
  }, [abbr, primary, secondary]);

  return (
    <img
      src={dataUrl}
      alt={`${abbr} badge`}
      width={size}
      height={size}
      style={{
        imageRendering: "pixelated",
        borderRadius: 6,
      }}
    />
  );
}
