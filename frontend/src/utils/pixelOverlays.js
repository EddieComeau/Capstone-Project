// src/utils/pixelOverlays.js

function enc(svg) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
  
  function normHex(hex) {
    return String(hex || "#1C2541").trim();
  }
  
  // Pixel shoulder-pad / body silhouette (changes by position)
  export function padOverlayDataUri({ variant = "default", primary = "#1C2541", secondary = "#5BC0BE" } = {}) {
    primary = normHex(primary);
    secondary = normHex(secondary);
  
    // 64x64, crisp pixels
    // Variants: "bulk" (OL/DL), "skill" (WR/CB/DB), "default"
    const shapes = {
      bulk: `
        <rect x="6" y="38" width="52" height="22" fill="${primary}"/>
        <rect x="4" y="40" width="56" height="18" fill="${primary}"/>
        <rect x="6" y="40" width="52" height="3" fill="${secondary}" opacity="0.55"/>
        <rect x="10" y="36" width="44" height="8" fill="${primary}" opacity="0.9"/>
        <rect x="14" y="34" width="36" height="4" fill="${secondary}" opacity="0.45"/>
      `,
      skill: `
        <rect x="12" y="40" width="40" height="20" fill="${primary}"/>
        <rect x="10" y="42" width="44" height="16" fill="${primary}"/>
        <rect x="12" y="42" width="40" height="3" fill="${secondary}" opacity="0.55"/>
        <rect x="18" y="36" width="28" height="8" fill="${primary}" opacity="0.9"/>
        <rect x="20" y="34" width="24" height="4" fill="${secondary}" opacity="0.45"/>
      `,
      default: `
        <rect x="10" y="39" width="44" height="21" fill="${primary}"/>
        <rect x="8" y="41" width="48" height="17" fill="${primary}"/>
        <rect x="10" y="41" width="44" height="3" fill="${secondary}" opacity="0.55"/>
        <rect x="16" y="36" width="32" height="8" fill="${primary}" opacity="0.9"/>
        <rect x="18" y="34" width="28" height="4" fill="${secondary}" opacity="0.45"/>
      `,
    };
  
    const body = shapes[variant] || shapes.default;
  
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" shape-rendering="crispEdges">
      <rect x="0" y="0" width="64" height="64" fill="transparent"/>
      ${body}
      <!-- subtle bottom shadow -->
      <rect x="0" y="56" width="64" height="8" fill="#000000" opacity="0.18"/>
    </svg>`;
  
    return enc(svg);
  }
  
  // Pixel facemask overlay (same for all, but you could branch by variant)
  export function maskOverlayDataUri() {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" shape-rendering="crispEdges">
      <rect x="0" y="0" width="64" height="64" fill="transparent"/>
      <!-- mask bars -->
      <rect x="18" y="26" width="28" height="3" fill="#000" opacity="0.55"/>
      <rect x="20" y="31" width="24" height="3" fill="#000" opacity="0.55"/>
      <rect x="22" y="36" width="20" height="3" fill="#000" opacity="0.55"/>
      <!-- verticals -->
      <rect x="26" y="26" width="2" height="18" fill="#000" opacity="0.55"/>
      <rect x="32" y="26" width="2" height="18" fill="#000" opacity="0.55"/>
      <rect x="38" y="26" width="2" height="18" fill="#000" opacity="0.55"/>
    </svg>`;
    return enc(svg);
  }
  