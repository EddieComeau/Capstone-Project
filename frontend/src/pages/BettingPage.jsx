// frontend/src/pages/BettingPage.jsx

import { useEffect, useState } from "react";
import PlayerSearchInput from "../components/PlayerSearchInput";
import WeekPicker from "../components/WeekPicker";

/**
 * BettingPage
 *
 * This page displays betting odds and player props.  It has been updated to be
 * more user‑friendly by replacing the free‑text "Game ID" input with a
 * game selector.  When the user picks a season and week via the WeekPicker,
 * the page fetches the list of scheduled games from the server (via
 * `/api/games`).  The user can then select a matchup from a dropdown and the
 * Game ID will be set automatically.  Player search and props remain
 * unchanged.
 */

export default function BettingPage() {
  const [odds, setOdds] = useState([]);
  const [props, setProps] = useState([]);
  const [playerNameMap, setPlayerNameMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [syncedAt, setSyncedAt] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // List of games for the selected season/week
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(false);

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

  // Load games whenever the season or week changes
  useEffect(() => {
    async function loadGames() {
      // Require both season and week to fetch games
      if (!filters.season || !filters.week) {
        setGames([]);
        return;
      }
      try {
        setLoadingGames(true);
        const params = new URLSearchParams({
          season: filters.season,
          week: filters.week,
          per_page: "100",
        }).toString();
        const res = await fetch(`/api/games?${params}`);
        const json = await res.json();
        setGames(json?.data || []);
      } catch (e) {
        console.error("Failed to fetch games:", e);
        setGames([]);
      } finally {
        setLoadingGames(false);
      }
    }
    loadGames();
    // do not include filters.gameId in the dependency array to avoid refetching on game selection
  }, [filters.season, filters.week]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Betting Odds &amp; Player Props</h2>

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
        {/* Game selector: choose from games fetched for the selected season/week */}
        <select
          value={filters.gameId}
          onChange={(e) => updateFilter("gameId", e.target.value)}
          disabled={loadingGames || games.length === 0}
        >
          <option value="">Select Game</option>
          {games.map((g) => {
            const home = g.home_team?.abbreviation || "HOME";
            const away = g.visitor_team?.abbreviation || "AWAY";
            return (
              <option key={g.id} value={g.id}>
                {away} @ {home}
              </option>
            );
          })}
        </select>
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
