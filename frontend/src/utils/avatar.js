// src/utils/avatar.js
import { createAvatar } from "@dicebear/core";
import { pixelArt } from "@dicebear/pixel-art";

const _cache = new Map();

export const TEAM_COLORS = {
  KC: { primary: "#E31837", secondary: "#FFB81C" },
  SF: { primary: "#AA0000", secondary: "#B3995D" },
  DAL:{ primary: "#041E42", secondary: "#869397" },
  PHI:{ primary: "#004C54", secondary: "#A5ACAF" },
  // add more later
};

export function getTeamColors(teamAbbr) {
  return TEAM_COLORS[String(teamAbbr || "").toUpperCase()] || { primary: "#1C2541", secondary: "#5BC0BE" };
}

function stripHash(hex) {
  return String(hex || "").replace("#", "").trim();
}

// “Male-coded-ish” knobs (not perfect, but helps):
// - only short hair variants
// - some beard probability (more for trenches)
// DiceBear Pixel Art options documented here. :contentReference[oaicite:3]{index=3}
const SHORT_HAIR = Array.from({ length: 24 }, (_, i) => `short${String(i + 1).padStart(2, "0")}`);
const BEARDS = Array.from({ length: 8 }, (_, i) => `variant${String(i + 1).padStart(2, "0")}`);

export function dicebearPixelHeadDataUri(seed, { position, backgroundHex, clothingHex } = {}) {
  const key = `head:${seed}:${position || ""}:${backgroundHex || ""}:${clothingHex || ""}`;
  if (_cache.has(key)) return _cache.get(key);

  const pos = String(position || "").toUpperCase();
  const isTrench = ["LT","LG","C","RG","RT","OL","OT","OG","DT","NT","DE","DL"].includes(pos);

  const svg = createAvatar(pixelArt, {
    seed: String(seed),
    size: 96,
    radius: 10,

    // background behind the head (team secondary looks nice)
    ...(backgroundHex ? { backgroundColor: [stripHash(backgroundHex)] } : {}),

    // “guys-only” attempt (still not guaranteed)
    hair: SHORT_HAIR,
    beard: BEARDS,
    beardProbability: isTrench ? 45 : 18,

    // keep it clean / consistent
    glassesProbability: 0,
    accessoriesProbability: 0,
    hatProbability: 0,

    ...(clothingHex ? { clothingColor: [stripHash(clothingHex)] } : {}),
  }).toString();

  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  _cache.set(key, uri);
  return uri;
}

export function positionProfile(positionRaw = "") {
  const pos = String(positionRaw).toUpperCase();

  // big bodies
  if (["LT","LG","C","RG","RT","OL","OT","OG"].includes(pos)) return { frame: "bulk", scale: 1.06 };
  if (["DT","NT","DE","DL"].includes(pos)) return { frame: "bulk", scale: 1.04 };

  // slim skill
  if (["WR","CB","SS","FS","DB"].includes(pos)) return { frame: "skill", scale: 0.98 };

  // everyone else
  return { frame: "default", scale: 1.0 };
}
