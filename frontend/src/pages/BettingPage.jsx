// frontend/src/pages/BettingPage.jsx

import { useEffect, useState } from "react";
import PlayerSearchInput from "../components/PlayerSearchInput";
import WeekPicker from "../components/WeekPicker";
import { getDefaultSeason } from "../utils/season";

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
  const [syncing, setSyncing] = useState(false);
  const [syncAttempted, setSyncAttempted] = useState(false);
  const [syncedAt, setSyncedAt] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedStats, setSelectedStats] = useState(null);
  const [statsSeason, setStatsSeason] = useState(getDefaultSeason());

  // List of games for the selected season/week
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(false);

  // Filters now include season/week controlled via WeekPicker
  const [filters, setFilters] = useState({
    playerId: "",
    gameId: "",
    season: getDefaultSeason().toString(),
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

      const nextOdds = oddsJson.odds || [];
      const nextProps = propsJson.props || [];
      setOdds(nextOdds);
      setProps(nextProps);

      const timestamps = [...(propsJson.props || []), ...(oddsJson.odds || [])]
        .map((x) => x.synced_at)
        .filter(Boolean)
        .sort()
        .reverse();
      if (timestamps.length) setSyncedAt(timestamps[0]);

      // Load player names
      const ids = new Set(nextProps.map((p) => p.player_id));
      const entries = [...ids].map(async (id) => {
        const res = await fetch(`/api/players/${id}`);
        const json = await res.json();
        if (json.ok) return [id, json.player];
        return [id, null];
      });
      const results = await Promise.all(entries);
      setPlayerNameMap(Object.fromEntries(results));

      if (
        !syncAttempted &&
        !loadingGames &&
        (oddsJson.odds || []).length === 0 &&
        (propsJson.props || []).length === 0 &&
        (filters.week || filters.gameId)
      ) {
        setSyncAttempted(true);
        await syncBettingData();
        await fetchData();
      }
    } catch (e) {
      console.error("Error loading betting data:", e);
    } finally {
      setLoading(false);
    }
  }

  async function syncBettingData() {
    try {
      setSyncing(true);
      const payload = {
        season: Number(filters.season) || undefined,
        week: filters.week ? Number(filters.week) : undefined,
        gameIds: filters.gameId ? [Number(filters.gameId)] : undefined,
      };
      await fetch("/api/betting/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error("Failed to sync betting data", e);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function loadPlayerStats() {
      const playerId = selectedPlayer?.player_id || filters.playerId;
      if (!playerId) {
        setSelectedStats(null);
        return;
      }
      try {
        const params = new URLSearchParams({
          season: String(statsSeason),
        });
        const res = await fetch(`/api/stats/player/${playerId}?${params.toString()}`);
        const json = await res.json();
        setSelectedStats(json?.totals || null);
      } catch (e) {
        console.error("Failed to load player stats", e);
        setSelectedStats(null);
      }
    }
    loadPlayerStats();
  }, [selectedPlayer, filters.playerId, statsSeason]);

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
        {selectedPlayer ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 600 }}>
                {selectedPlayer.full_name} ({selectedPlayer.team_abbr})
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>
                {selectedPlayer.position} • #{selectedPlayer.jersey_number || "—"}
              </div>
            </div>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              Season
              <input
                name="betting-player-season"
                type="number"
                value={statsSeason}
                onChange={(e) => setStatsSeason(Number(e.target.value))}
                style={{ width: 90 }}
              />
            </label>
            {selectedStats ? (
              <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
                <span>Pass Yds: {selectedStats.passing_yards ?? "—"}</span>
                <span>Rush Yds: {selectedStats.rushing_yards ?? "—"}</span>
                <span>Rec Yds: {selectedStats.receiving_yards ?? "—"}</span>
                <span>TDs: {selectedStats.receiving_tds ?? selectedStats.rushing_tds ?? selectedStats.passing_tds ?? "—"}</span>
              </div>
            ) : null}
          </div>
        ) : null}
        {/* Game selector: choose from games fetched for the selected season/week */}
        <select
          name="betting-game"
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
          name="betting-season"
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
        <button onClick={syncBettingData} disabled={syncing}>
          {syncing ? "Syncing..." : "Sync Odds/Props"}
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
