// FRONTEND (React/Vite) — BALLDONTLIE NFL API helper (direct-from-frontend fetch)
//
// Requires:
//   VITE_BALLDONTLIE_API_KEY in your .env (Vite exposes only VITE_* vars)
// Optional:
//   VITE_BALLDONTLIE_BASE_URL (defaults to https://api.balldontlie.io)

const BASE_URL = (import.meta.env.VITE_BALLDONTLIE_BASE_URL || "https://api.balldontlie.io").replace(/\/$/, "");
const API_KEY = import.meta.env.VITE_BALLDONTLIE_API_KEY;

function requireKey() {
  if (!API_KEY) {
    throw new Error("Missing VITE_BALLDONTLIE_API_KEY (frontend env var).");
  }
}

function toQuery(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;

    // support arrays: team_ids[]=1&team_ids[]=2
    if (Array.isArray(v)) {
      v.forEach((item) => sp.append(`${k}[]`, String(item)));
      return;
    }

    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function apiGet(path, params) {
  requireKey();

  const url = `${BASE_URL}${path}${toQuery(params)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: API_KEY,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`BALLDONTLIE error ${res.status} ${res.statusText}: ${text}`);
  }

  return res.json();
}

// Docs: https://nfl.balldontlie.io/ :contentReference[oaicite:0]{index=0}
export async function getNflTeams() {
  return apiGet("/nfl/v1/teams");
}

// Docs show roster endpoint + optional season query param :contentReference[oaicite:1]{index=1}
export async function getNflTeamRoster(teamId, season) {
  return apiGet(`/nfl/v1/teams/${teamId}/roster`, { season });
}
