import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import { TEAM_LIST } from "../data/teamOptions";
import { POSITIONS } from "../data/positions";

// POSITIONS is imported from ../data/positions to allow reuse across components.

/**
 * PlayerSearchInput component with optional team and position filters.
 *
 * This component fetches suggestions from `/api/players/search?q=...` as the user types.
 * It supports filtering by team abbreviation and position, showing only players that
 * match the selected filters.  The suggestion list is debounced by 300ms.
 */
export default function PlayerSearchInput({ onSelect }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [teamFilter, setTeamFilter] = useState("");
  const [posFilter, setPosFilter] = useState("");

  function normalizePosition(position) {
    if (!position) return "";
    const raw = String(position).toUpperCase();
    if (POSITIONS.includes(raw)) return raw;
    if (raw.includes("QUARTERBACK")) return "QB";
    if (raw.includes("RUNNING BACK")) return "RB";
    if (raw.includes("FULLBACK")) return "FB";
    if (raw.includes("WIDE RECEIVER")) return "WR";
    if (raw.includes("TIGHT END")) return "TE";
    if (raw.includes("CENTER")) return "C";
    if (raw.includes("GUARD")) return "OG";
    if (raw.includes("TACKLE")) return "OT";
    if (raw.includes("DEFENSIVE END")) return "DE";
    if (raw.includes("DEFENSIVE TACKLE")) return "DT";
    if (raw.includes("NOSE TACKLE")) return "NT";
    if (raw.includes("LINEBACKER")) return "LB";
    if (raw.includes("CORNERBACK")) return "CB";
    if (raw.includes("FREE SAFETY")) return "FS";
    if (raw.includes("STRONG SAFETY")) return "SS";
    if (raw.includes("SAFETY")) return "S";
    if (raw.includes("KICKER")) return "K";
    if (raw.includes("PUNTER")) return "P";
    if (raw.includes("LONG SNAPPER")) return "LS";
    if (raw.includes("KICK RETURNER")) return "KR";
    if (raw.includes("PUNT RETURNER")) return "PR";
    return raw;
  }

  function matchesPositionFilter(position, filter) {
    if (!filter) return true;
    const norm = normalizePosition(position);
    const groups = {
      OL: ["LT", "LG", "C", "RG", "RT", "OT", "OG", "OL"],
      DL: ["DT", "DE", "NT", "EDGE", "DL"],
      LB: ["LB", "ILB", "MLB", "OLB"],
      DB: ["CB", "FS", "SS", "S", "DB"],
      S: ["FS", "SS", "S"],
    };
    if (groups[filter]) return groups[filter].includes(norm);
    return norm === filter;
  }

  const normalizeQuery = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");

  const stripExtras = (value) =>
    String(value || "")
      .replace(/\([^)]*\)/g, "")
      .trim();

  useEffect(() => {
    const searchText = stripExtras(query);
    // Clear suggestions if the query is empty or too short
    if (!searchText || searchText.length < 2) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(() => {
      setLoading(true);
      apiGet(`/players/search`, { q: searchText })
        .then((json) => {
          if (!json.ok) return;
          const filtered = (json.results || []).filter((p) => {
            const matchesTeam = teamFilter ? p.team_abbr === teamFilter : true;
            const matchesPos = matchesPositionFilter(p.position, posFilter);
            const name = normalizeQuery(
              p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim()
            );
            const q = normalizeQuery(searchText);
            return matchesTeam && matchesPos && (q ? name.includes(q) : true);
          });
          setSuggestions(filtered);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, teamFilter, posFilter]);

  return (
    <div style={{ position: "relative", width: 220 }}>
      {/* Filters row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
        <select
          name="player-team-filter"
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          style={{ flex: 1, color: "#111", background: "#fff" }}
        >
          <option value="">All Teams</option>
          {TEAM_LIST.map((t) => (
            <option key={t.abbr} value={t.abbr}>
              {t.abbr}
            </option>
          ))}
        </select>
        <select
          name="player-position-filter"
          value={posFilter}
          onChange={(e) => setPosFilter(e.target.value)}
          style={{ flex: 1, color: "#111", background: "#fff" }}
        >
          <option value="">All Pos</option>
          {POSITIONS.map((pos) => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}
        </select>
      </div>

      <input
        name="player-search"
        placeholder="Search Player..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", padding: "6px 10px", color: "#111", background: "#fff" }}
      />

      {loading && <div style={{ fontSize: 12 }}>Loading...</div>}

      {suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            border: "1px solid #ccc",
            background: "white",
            zIndex: 10,
            maxHeight: 180,
            overflowY: "auto",
            color: "#111",
          }}
        >
          {suggestions.map((p) => (
            <div
              key={p.player_id || p.id}
              onClick={() => {
                setQuery(`${p.full_name} (${p.team_abbr})`);
                setSuggestions([]);
                onSelect(p);
              }}
              style={{
                padding: "6px 10px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
                color: "#111",
              }}
            >
              {p.full_name} <span style={{ opacity: 0.6 }}>({p.team_abbr})</span>
            </div>
          ))}
        </div>
      )}
      {stripExtras(query).length >= 2 && !loading && suggestions.length === 0 ? (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            border: "1px solid #ccc",
            background: "white",
            zIndex: 10,
            padding: "6px 10px",
            color: "#333",
          }}
        >
          No matches
        </div>
      ) : null}
    </div>
  );
}
