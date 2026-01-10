// frontend/src/pages/BettingPage.jsx

import { useEffect, useState } from "react";
import PlayerSearchInput from "../components/PlayerSearchInput";
import WeekPicker from "../components/WeekPicker";

export default function BettingPage() {
  const [odds, setOdds] = useState([]);
  const [props, setProps] = useState([]);
  const [playerNameMap, setPlayerNameMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [syncedAt, setSyncedAt] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Filters now include season/week controlled via WeekPicker
  const [filters, setFilters] = useState({
    playerId: "",
    gameId: "",
    season: new Date().getFullYear().toString(),
    week: "",
  });

  function buildQuery(params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== "" && v !== undefined && v !== null) {
        qs.set(k, v);
      }
    });
    return qs.toString();
  }

  async function fetchData() {
    setLoading(true);
    try {
      const playerId = selectedPlayer?.player_id || filters.playerId;
      const oddsQuery = buildQuery({ ...filters, playerId, limit: 25 });
      const propsQuery = buildQuery({ ...filters, playerId, limit: 25 });

      const [oddsRes, propsRes] = await Promise.all([
        fetch(`/api/betting/odds?${oddsQuery}`),
        fetch(`/api/betting/props?${propsQuery}`),
      ]);

      const [oddsJson, propsJson] = await Promise.all([
        oddsRes.json(),
        propsRes.json(),
      ]);

      setOdds(oddsJson.odds || []);
      setProps(propsJson.props || []);

      const timestamps = [...(propsJson.props || []), ...(oddsJson.odds || [])]
        .map((x) => x.synced_at)
        .filter(Boolean)
        .sort()
        .reverse();
      if (timestamps.length) setSyncedAt(timestamps[0]);

      // Load player names
      const ids = new Set(props.map((p) => p.player_id));
      const entries = [...ids].map(async (id) => {
        const res = await fetch(`/api/players/${id}`);
        const json = await res.json();
        if (json.ok) return [id, json.player];
        return [id, null];
      });
      const results = await Promise.all(entries);
      setPlayerNameMap(Object.fromEntries(results));
    } catch (e) {
      console.error("Error loading betting data:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateFilter(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Betting Odds & Player Props</h2>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <PlayerSearchInput
          onSelect={(player) => {
            setSelectedPlayer(player);
            updateFilter("playerId", player.player_id);
          }}
        />
        <input
          placeholder="Game ID"
          value={filters.gameId}
          onChange={(e) => updateFilter("gameId", e.target.value)}
        />
        <input
          placeholder="Season"
          value={filters.season}
          onChange={(e) => updateFilter("season", e.target.value)}
        />
        {/* Replace free‑text Week input with WeekPicker */}
        <WeekPicker
          seasonStart={`${filters.season}-09-05`}
          value={Number(filters.week) || undefined}
          onChange={(w) => updateFilter("week", w)}
        />
        <button onClick={fetchData} disabled={loading}>
          {loading ? "Loading..." : "🔁 Refresh"}
        </button>
      </div>

      {syncedAt && (
        <p style={{ fontSize: 12, color: "#555" }}>
          Last updated: {new Date(syncedAt).toLocaleString()}
        </p>
      )}

      <h3>Player Props ({props.length})</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {props.map((p, i) => {
          const player = playerNameMap[p.player_id];
          return (
            <div
              key={p._id || i}
              style={{
                border: "1px solid #ccc",
                borderRadius: 8,
                padding: 10,
                width: 280,
              }}
            >
              <div>
                <b>
                  {player
                    ? `${player.full_name} (${player.team_abbr})`
                    : `ID ${p.player_id}`}
                </b>
              </div>
              <div>
                Prop: {p.prop_type ?? p.market ?? p.stat_type ?? "Unknown"}
              </div>
              <div>Book: {p.sportsbook ?? p.book_key ?? "N/A"}</div>
              <div>Line: {p.line ?? "N/A"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
