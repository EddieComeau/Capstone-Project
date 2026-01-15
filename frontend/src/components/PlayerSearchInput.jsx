import { useEffect, useState } from "react";
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

  useEffect(() => {
    // Clear suggestions if the query is empty or too short
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/players/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((json) => {
          if (!json.ok) return;
          // Apply optional team and position filters
          const filtered = (json.results || []).filter((p) => {
            const matchesTeam = teamFilter ? p.team_abbr === teamFilter : true;
            const matchesPos = posFilter ? (p.position || "").toUpperCase() === posFilter : true;
            // Simple fuzzy search: allow partial matches ignoring case and spaces
            const name = (p.full_name || "").toLowerCase();
            const q = query.toLowerCase().replace(/\s+/g, "");
            return matchesTeam && matchesPos && name.replace(/\s+/g, "").includes(q);
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
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          style={{ flex: 1 }}
        >
          <option value="">All Teams</option>
          {TEAM_LIST.map((t) => (
            <option key={t.abbr} value={t.abbr}>
              {t.abbr}
            </option>
          ))}
        </select>
        <select
          value={posFilter}
          onChange={(e) => setPosFilter(e.target.value)}
          style={{ flex: 1 }}
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
        placeholder="Search Player..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", padding: "6px 10px" }}
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
              }}
            >
              {p.full_name} <span style={{ opacity: 0.6 }}>({p.team_abbr})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
