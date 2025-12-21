// src/components/common/teamTheme.js

export const TEAM_THEME = {
    KC: { primary: "#E31837", secondary: "#FFB81C" },
    SF: { primary: "#AA0000", secondary: "#B3995D" },
    PHI: { primary: "#004C54", secondary: "#A5ACAF" },
    DAL: { primary: "#003594", secondary: "#869397" },
    BUF: { primary: "#00338D", secondary: "#C60C30" },
    MIA: { primary: "#008E97", secondary: "#FC4C02" },
    NYJ: { primary: "#125740", secondary: "#FFFFFF" },
    NE: { primary: "#002244", secondary: "#C60C30" },
    DEFAULT: { primary: "#2E7D32", secondary: "#0B1F0E" },
  };
  
  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  
  function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
  
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  
    const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, "0");
  
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }
  
  export function getTheme(abbr) {
    if (!abbr) return TEAM_THEME.DEFAULT;
    if (TEAM_THEME[abbr]) return TEAM_THEME[abbr];
  
    const h = hashString(abbr);
    const hue1 = h % 360;
    const hue2 = (hue1 + 70) % 360;
  
    return {
      primary: hslToHex(hue1, 78, 46),
      secondary: hslToHex(hue2, 72, 56),
    };
  }
  