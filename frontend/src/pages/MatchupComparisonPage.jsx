import { useMemo, useState, useEffect } from "react";
import "./MatchupComparisonPage.css";
import PlayerSearchInput from "../components/PlayerSearchInput";
import { apiGet } from "../lib/api";
import { getDefaultSeason } from "../utils/season";

function Selector({ label, options, value, onChange }) {
  const selectName = String(label || "selector")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (
    <label className="matchLabel">
      <span>{label}</span>
      <select name={selectName} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const num = Number(value);
  if (Number.isInteger(num)) return `${num}`;
  return num.toFixed(1);
}

function ScorePill({ label, value, loading, subLabel, highlight }) {
  // Display a placeholder while loading metrics.  If the value is null or
  // undefined and not loading, show an em dash to indicate absence.
  const display = loading ? '…' : formatNumber(value);
  return (
    <div className={`scorePill${highlight ? " highlight" : ""}`}>
      <span className="scoreLabel">{label}</span>
      <span className="scoreValue">{display}</span>
      {subLabel ? <span className="scoreSub">{subLabel}</span> : null}
    </div>
  );
}

const METRIC_MAX = {
  passing_yards: 5000,
  passing_tds: 50,
  interceptions: 20,
  rushing_yards: 2000,
  rushing_tds: 25,
  receiving_yards: 2000,
  receiving_tds: 20,
  receptions: 120,
  receiving_targets: 180,
  tackles: 180,
  sacks: 20,
  forced_fumbles: 10,
  sacks_allowed: 20,
  pressures: 60,
  ol_rating: 100,
};

const LOWER_BETTER = new Set([
  "interceptions",
  "sacks_allowed",
  "pass_yards_against",
  "rush_yards_against",
  "total_yards_against",
  "avg_pass_completion_against",
  "avg_rush_against",
  "points_allowed",
  "touchdowns_allowed",
]);

function toScore(value, key) {
  if (value == null || Number.isNaN(Number(value))) return 0;
  const max = METRIC_MAX[key] || 100;
  if (!max) return 0;
  const raw = Math.max(0, Math.min(Number(value), max));
  const pct = raw / max;
  return Math.round((LOWER_BETTER.has(key) ? (1 - pct) : pct) * 100);
}

function safeDivide(numerator, denominator) {
  if (!denominator) return 0;
  return numerator / denominator;
}

function computePasserRating(stats) {
  if (!stats) return 0;
  const attempts = stats.passing_attempts || 0;
  const completions = stats.passing_completions || 0;
  const passingYards = stats.passing_yards || 0;
  const passingTds = stats.passing_tds || 0;
  const interceptions = stats.interceptions || 0;
  if (!attempts) return 0;
  const completionRatio = completions / attempts;
  const a = Math.min(Math.max(((completionRatio * 100) - 30) / 20, 0), 2.375);
  const b = Math.min(Math.max(((passingYards / attempts) - 3) / 4, 0), 2.375);
  const c = Math.min(Math.max(((passingTds / attempts) * 20), 0), 2.375);
  const d = Math.min(Math.max(2.375 - ((interceptions / attempts) * 25), 0), 2.375);
  return Number((((a + b + c + d) / 6) * 100).toFixed(1));
}

export default function MatchupComparisonPage() {
  const [mode, setMode] = useState("players");
  const [leftPlayer, setLeftPlayer] = useState(null);
  const [rightPlayer, setRightPlayer] = useState(null);
  const [leftTeam, setLeftTeam] = useState("");
  const [rightTeam, setRightTeam] = useState("");
  const [teams, setTeams] = useState([]);

  // Fetched advanced metrics for the selected teams. These states hold
  // objects with fields like passing_yards_per_game, rushing_yards_per_game
  // and points_per_game when the mode is 'teams'. They remain null in
  // player mode.
  const [leftMetrics, setLeftMetrics] = useState(null);
  const [rightMetrics, setRightMetrics] = useState(null);
  const [teamRanks, setTeamRanks] = useState({});
  const [teamRankCount, setTeamRankCount] = useState(0);
  const [starterRanks, setStarterRanks] = useState({});
  const [starterRankCount, setStarterRankCount] = useState(0);
  const [defenseByTeam, setDefenseByTeam] = useState({});
  const [defenseRankCount, setDefenseRankCount] = useState(0);

  // Loading flags for metrics fetches.  These are used to display a
  // loading indicator while waiting for the API response.
  const [leftLoading, setLeftLoading] = useState(false);
  const [rightLoading, setRightLoading] = useState(false);
  const [leftPlayerLoading, setLeftPlayerLoading] = useState(false);
  const [rightPlayerLoading, setRightPlayerLoading] = useState(false);

  const [season, setSeason] = useState(getDefaultSeason());

  useEffect(() => {
    async function loadTeams() {
      try {
        const list = await apiGet("/teams/db");
        setTeams(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Failed to load teams", err);
        setTeams([]);
      }
    }
    loadTeams();
  }, []);

  useEffect(() => {
    if (mode !== "teams") return;
    if (!teams.length) return;
    if (!leftTeam) setLeftTeam(teams[0]?.abbreviation || "");
    if (!rightTeam) setRightTeam(teams[1]?.abbreviation || teams[0]?.abbreviation || "");
  }, [mode, teams, leftTeam, rightTeam]);

  useEffect(() => {
    if (mode !== "teams") return;
    async function loadTeamRanks() {
      try {
        const data = await apiGet("/stats/teams/summary", { season });
        const list = Array.isArray(data?.results) ? data.results : [];
        const buildRankMap = (key) => {
          const entries = list
            .filter((row) => row?.team_abbr && row?.per_game?.[key] != null)
            .sort((a, b) => (b.per_game[key] || 0) - (a.per_game[key] || 0));
          const map = new Map();
          entries.forEach((row, idx) => {
            map.set(row.team_abbr, idx + 1);
          });
          return map;
        };
        setTeamRanks({
          passing_yards: buildRankMap("passing_yards"),
          rushing_yards: buildRankMap("rushing_yards"),
          receiving_yards: buildRankMap("receiving_yards"),
          points: buildRankMap("points"),
          total_yards: buildRankMap("total_yards"),
        });
        setTeamRankCount(list.length);
      } catch (err) {
        console.error("Failed to load team ranks", err);
        setTeamRanks({});
        setTeamRankCount(0);
      }
    }
    loadTeamRanks();
  }, [mode, season]);

  useEffect(() => {
    if (mode !== "teams") return;
    const positions = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB"];
    async function loadStarterRanks() {
      try {
        const responses = await Promise.all(
          positions.map((pos) => apiGet("/stats/players/position", { season, position: pos }))
        );
        const nextRanks = {};
        let count = 0;
        responses.forEach((res, idx) => {
          const list = Array.isArray(res?.results) ? res.results : [];
          const map = new Map();
          list.forEach((row, rankIdx) => {
            if (!row?.team_abbr) return;
            map.set(row.team_abbr, rankIdx + 1);
          });
          nextRanks[positions[idx]] = map;
          if (!count && list.length) count = list.length;
        });
        setStarterRanks(nextRanks);
        setStarterRankCount(count);
      } catch (err) {
        console.error("Failed to load starter ranks", err);
        setStarterRanks({});
        setStarterRankCount(0);
      }
    }
    loadStarterRanks();
  }, [mode, season]);

  useEffect(() => {
    if (mode !== "teams") return;
    async function loadDefenseStats() {
      try {
        const data = await apiGet("/stats/teams/defense", { season });
        const list = Array.isArray(data?.results) ? data.results : [];
        const map = {};
        list.forEach((row) => {
          if (row?.team_abbr) map[row.team_abbr] = row;
        });
        setDefenseByTeam(map);
        setDefenseRankCount(list.length);
      } catch (err) {
        console.error("Failed to load defense stats", err);
        setDefenseByTeam({});
        setDefenseRankCount(0);
      }
    }
    loadDefenseStats();
  }, [mode, season]);

  function resolvePlayerId(player) {
    const rawId = player?.PlayerID ?? player?.player_id ?? player?.id;
    const num = rawId != null ? Number(rawId) : NaN;
    return Number.isNaN(num) ? null : num;
  }

  function playerDisplayName(player) {
    if (!player) return "";
    return (
      player.full_name ||
      `${player.first_name || ""} ${player.last_name || ""}`.trim()
    );
  }

  function normalizePosition(position) {
    if (!position) return "";
    const raw = String(position).toUpperCase().trim();
    if (raw.includes("QUARTERBACK")) return "QB";
    if (raw.includes("RUNNING BACK")) return "RB";
    if (raw.includes("FULLBACK")) return "FB";
    if (raw.includes("WIDE RECEIVER")) return "WR";
    if (raw.includes("TIGHT END")) return "TE";
    if (raw.includes("CENTER")) return "C";
    if (raw.includes("GUARD")) return "OG";
    if (raw.includes("TACKLE")) return "OT";
    if (raw.includes("OFFENSIVE LINE")) return "OL";
    if (raw.includes("DEFENSIVE END")) return "DE";
    if (raw.includes("DEFENSIVE TACKLE")) return "DT";
    if (raw.includes("NOSE TACKLE")) return "NT";
    if (raw.includes("LINEBACKER")) return "LB";
    if (raw.includes("CORNERBACK")) return "CB";
    if (raw.includes("FREE SAFETY")) return "FS";
    if (raw.includes("STRONG SAFETY")) return "SS";
    if (raw.includes("SAFETY")) return "S";
    if (["QB", "RB", "FB", "WR", "TE", "C", "OG", "OT", "OL", "DL", "LB", "DB", "EDGE"].includes(raw)) {
      return raw;
    }
    return raw;
  }

  function getTeamByAbbr(abbr) {
    return teams.find((t) => t.abbreviation === abbr) || null;
  }

  /**
   * Helper to fetch a team's stats for the current season. Uses the
   * `/api/stats/team/:abbr` endpoint backed by Mongo.
   *
   * @param {string} teamAbbr Team abbreviation.
   * @returns {Promise<object|null>} A metrics object or null if not found.
   */
  async function fetchTeamMetrics(teamAbbr) {
    try {
      const data = await apiGet(`/stats/team/${teamAbbr}`, { season });
      return data?.per_game || null;
    } catch (err) {
      console.error('fetchTeamMetrics error', err);
      return null;
    }
  }

  function mergeDerivedTotals(baseTotals, derivedTotals) {
    const merged = { ...(baseTotals || {}) };
    Object.entries(derivedTotals || {}).forEach(([key, val]) => {
      if (val == null || Number.isNaN(Number(val))) return;
      const current = merged[key];
      if (current == null || Number.isNaN(Number(current)) || (current === 0 && val > 0)) {
        merged[key] = val;
      }
    });
    return merged;
  }

  function buildTotalsFromWeekly(weeklyRows) {
    const totals = {
      passing_yards: 0,
      passing_tds: 0,
      interceptions: 0,
      rushing_yards: 0,
      rushing_tds: 0,
      receiving_yards: 0,
      receiving_tds: 0,
      receptions: 0,
      receiving_targets: 0,
      tackles: 0,
      sacks: 0,
      forced_fumbles: 0,
    };
    (weeklyRows || []).forEach((row) => {
      if (!row) return;
      Object.keys(totals).forEach((key) => {
        const val = row[key];
        if (val == null || Number.isNaN(Number(val))) return;
        totals[key] += Number(val);
      });
    });
    totals.games = Math.max(totals.games || 0, (weeklyRows || []).length);
    return totals;
  }

  async function fetchPlayerStats(playerId) {
    try {
      const data = await apiGet(`/stats/player/${playerId}`, { season });
      if (!data) return null;
      const weekly = Array.isArray(data?.weekly) ? data.weekly : [];
      const derivedTotals = buildTotalsFromWeekly(weekly);
      const totals = mergeDerivedTotals(data?.totals || {}, derivedTotals);
      const fallbackGames =
        totals.passing_yards || totals.rushing_yards || totals.receiving_yards ? 17 : 0;
      const games = totals.games || weekly.length || fallbackGames;
      const passerRating = computePasserRating(totals);
      const derived = {
        completion_pct: safeDivide(totals.passing_completions || 0, totals.passing_attempts || 0) * 100,
        yards_per_attempt: safeDivide(totals.passing_yards || 0, totals.passing_attempts || 0),
        passing_yards_per_game: safeDivide(totals.passing_yards || 0, games),
        rushing_yards_per_game: safeDivide(totals.rushing_yards || 0, games),
        receiving_yards_per_game: safeDivide(totals.receiving_yards || 0, games),
        yards_per_carry: safeDivide(totals.rushing_yards || 0, totals.rushing_attempts || 0),
        yards_per_target: safeDivide(totals.receiving_yards || 0, totals.receiving_targets || 0),
        passer_rating: passerRating,
      };
      return {
        ...totals,
        ...derived,
        grade: data.grade || null,
        position: data.player?.position || null,
        season: data.season || season,
        seasonRequested: data.season_requested ?? null,
      };
    } catch (err) {
      console.error("fetchPlayerStats error", err);
      return null;
    }
  }

  // Whenever the mode or selected teams change, fetch metrics for those teams.
  useEffect(() => {
    if (mode !== 'teams') return;
    // Fetch metrics for the left team
    if (leftTeam) {
      setLeftLoading(true);
      fetchTeamMetrics(leftTeam)
        .then((metrics) => setLeftMetrics(metrics))
        .finally(() => setLeftLoading(false));
    }
    // Fetch metrics for the right team
    if (rightTeam) {
      setRightLoading(true);
      fetchTeamMetrics(rightTeam)
        .then((metrics) => setRightMetrics(metrics))
        .finally(() => setRightLoading(false));
    }
  }, [mode, leftTeam, rightTeam, season]);

  useEffect(() => {
    if (mode !== "players") return;
    const leftId = resolvePlayerId(leftPlayer);
    if (leftId) {
      setLeftPlayerLoading(true);
      fetchPlayerStats(leftId)
        .then((metrics) => {
          setLeftMetrics(metrics);
          if (
            metrics?.seasonRequested != null &&
            metrics?.season &&
            metrics.season !== season
          ) {
            setSeason(metrics.season);
          }
        })
        .finally(() => setLeftPlayerLoading(false));
    } else {
      setLeftMetrics(null);
    }
    const rightId = resolvePlayerId(rightPlayer);
    if (rightId) {
      setRightPlayerLoading(true);
      fetchPlayerStats(rightId)
        .then((metrics) => {
          setRightMetrics(metrics);
          if (
            metrics?.seasonRequested != null &&
            metrics?.season &&
            metrics.season !== season
          ) {
            setSeason(metrics.season);
          }
        })
        .finally(() => setRightPlayerLoading(false));
    } else {
      setRightMetrics(null);
    }
  }, [mode, leftPlayer, rightPlayer, season]);

  const leftEntity = useMemo(() => {
    if (mode === "players") return leftPlayer;
    return getTeamByAbbr(leftTeam);
  }, [mode, leftPlayer, leftTeam, teams]);

  const rightEntity = useMemo(() => {
    if (mode === "players") return rightPlayer;
    return getTeamByAbbr(rightTeam);
  }, [mode, rightPlayer, rightTeam, teams]);

  const primaryMetrics = useMemo(() => {
    if (mode === "players") {
      const pickStat = (metrics, keys) => {
        if (!metrics) return 0;
        for (const key of keys) {
          const val = metrics[key];
          if (val !== undefined && val !== null && !Number.isNaN(Number(val))) {
            return Number(val);
          }
        }
        return 0;
      };
      const metricsFor = (pos, metrics) => {
        const resolvedPos = metrics?.position || pos;
        const norm = normalizePosition(resolvedPos);
        const isQB = norm === "QB";
        const isRB = ["RB", "HB", "FB"].includes(norm);
        const isWR = ["WR", "TE"].includes(norm);
        const isDefense = [
          "DE",
          "DT",
          "DL",
          "NT",
          "LB",
          "OLB",
          "ILB",
          "MLB",
          "EDGE",
          "CB",
          "S",
          "FS",
          "SS",
          "DB",
        ].includes(norm);
        const isOL = ["OT", "OG", "C", "G", "T", "OL"].includes(norm);

        if (isQB) {
          return [
            { key: "passing_yards", label: "Pass Yards", value: pickStat(metrics, ["passing_yards", "pass_yards"]) },
            { key: "passing_tds", label: "Pass TDs", value: pickStat(metrics, ["passing_tds", "pass_tds"]) },
            { key: "interceptions", label: "INTs", value: pickStat(metrics, ["interceptions", "ints", "passing_ints"]) },
            { key: "rushing_yards", label: "Rush Yds", value: pickStat(metrics, ["rushing_yards", "rush_yards"]) },
            { key: "rushing_tds", label: "Rush TDs", value: pickStat(metrics, ["rushing_tds", "rush_tds"]) },
            { key: "completion_pct", label: "Comp %", value: pickStat(metrics, ["completion_pct"]) },
            { key: "yards_per_attempt", label: "Yds/Att", value: pickStat(metrics, ["yards_per_attempt"]) },
            { key: "passer_rating", label: "Passer Rating", value: pickStat(metrics, ["passer_rating"]) },
          ];
        }
        if (isRB) {
          return [
            { key: "rushing_yards", label: "Rush Yards", value: pickStat(metrics, ["rushing_yards", "rush_yards"]) },
            { key: "rushing_tds", label: "Rush TDs", value: pickStat(metrics, ["rushing_tds", "rush_tds"]) },
            { key: "receptions", label: "Receptions", value: pickStat(metrics, ["receptions", "rec"]) },
            { key: "receiving_targets", label: "Targets", value: pickStat(metrics, ["receiving_targets", "targets"]) },
            { key: "yards_per_carry", label: "Yds/Carry", value: pickStat(metrics, ["yards_per_carry"]) },
          ];
        }
        if (isWR) {
          return [
            { key: "receiving_yards", label: "Rec Yards", value: pickStat(metrics, ["receiving_yards", "rec_yards"]) },
            { key: "receiving_tds", label: "Rec TDs", value: pickStat(metrics, ["receiving_tds", "rec_tds"]) },
            { key: "receptions", label: "Receptions", value: pickStat(metrics, ["receptions", "rec"]) },
            { key: "receiving_targets", label: "Targets", value: pickStat(metrics, ["receiving_targets", "targets"]) },
            { key: "yards_per_target", label: "Yds/Target", value: pickStat(metrics, ["yards_per_target"]) },
          ];
        }
        if (isDefense) {
          return [
            { key: "tackles", label: "Tackles", value: pickStat(metrics, ["tackles", "total_tackles", "combined_tackles"]) },
            { key: "sacks", label: "Sacks", value: pickStat(metrics, ["sacks", "sack"]) },
            { key: "interceptions", label: "INTs", value: pickStat(metrics, ["interceptions", "ints"]) },
            { key: "forced_fumbles", label: "Forced Fumbles", value: pickStat(metrics, ["forced_fumbles", "fumbles_forced"]) },
            { key: "tackles_for_loss", label: "TFL", value: pickStat(metrics, ["tackles_for_loss", "tfl"]) },
          ];
        }
        if (isOL) {
          return [
            { key: "sacks_allowed", label: "Sacks Allowed", value: pickStat(metrics, ["sacks_allowed", "qb_sacks_allowed"]) },
            { key: "pressures", label: "Pressures", value: pickStat(metrics, ["pressures_allowed"]) },
            { key: "ol_rating", label: "OL Rating", value: pickStat(metrics, ["ol_rating"]) },
            { key: "passing_yards", label: "Team Pass Yds", value: pickStat(metrics, ["passing_yards", "pass_yards"]) },
          ];
        }
        return [
          { key: "passing_yards", label: "Pass Yards", value: pickStat(metrics, ["passing_yards", "pass_yards"]) },
          { key: "rushing_yards", label: "Rush Yards", value: pickStat(metrics, ["rushing_yards", "rush_yards"]) },
          { key: "receiving_yards", label: "Rec Yards", value: pickStat(metrics, ["receiving_yards", "rec_yards"]) },
        ];
      };

      return {
        left: metricsFor(leftEntity?.position, leftMetrics),
        right: metricsFor(rightEntity?.position, rightMetrics),
      };
    }
    // Build metrics from fetched advanced metrics when in team mode.  Each
    // entry displays "—" when the value is null or undefined.
    const passLeft = leftMetrics?.passing_yards;
    const passRight = rightMetrics?.passing_yards;
    const rushLeft = leftMetrics?.rushing_yards;
    const rushRight = rightMetrics?.rushing_yards;
    const recLeft = leftMetrics?.receiving_yards;
    const recRight = rightMetrics?.receiving_yards;
    const ptsLeft = leftMetrics?.points;
    const ptsRight = rightMetrics?.points;
    const totalLeft = leftMetrics?.total_yards;
    const totalRight = rightMetrics?.total_yards;
    return [
      {
        label: "Pass YPG (For)",
        a: passLeft,
        b: passRight,
        leftRank: teamRanks.passing_yards?.get(leftTeam) || null,
        rightRank: teamRanks.passing_yards?.get(rightTeam) || null,
      },
      {
        label: "Rush YPG (For)",
        a: rushLeft,
        b: rushRight,
        leftRank: teamRanks.rushing_yards?.get(leftTeam) || null,
        rightRank: teamRanks.rushing_yards?.get(rightTeam) || null,
      },
      {
        label: "Rec YPG (For)",
        a: recLeft,
        b: recRight,
        leftRank: teamRanks.receiving_yards?.get(leftTeam) || null,
        rightRank: teamRanks.receiving_yards?.get(rightTeam) || null,
      },
      {
        label: "Pts/G (For)",
        a: ptsLeft,
        b: ptsRight,
        leftRank: teamRanks.points?.get(leftTeam) || null,
        rightRank: teamRanks.points?.get(rightTeam) || null,
      },
      {
        label: "Total YPG (For)",
        a: totalLeft,
        b: totalRight,
        leftRank: teamRanks.total_yards?.get(leftTeam) || null,
        rightRank: teamRanks.total_yards?.get(rightTeam) || null,
      },
    ];
  }, [mode, leftMetrics, rightMetrics, leftEntity, rightEntity, leftTeam, rightTeam, teamRanks]);

  const defenseMetrics = useMemo(() => {
    if (mode !== "teams") return [];
    const left = defenseByTeam[leftTeam]?.defense_per_game || {};
    const right = defenseByTeam[rightTeam]?.defense_per_game || {};
    const leftRanks = defenseByTeam[leftTeam]?.defense_ranks || {};
    const rightRanks = defenseByTeam[rightTeam]?.defense_ranks || {};
    return [
      {
        key: "points_allowed",
        label: "Pts Allowed/G",
        a: left.points_allowed,
        b: right.points_allowed,
        leftRank: leftRanks.points_allowed || null,
        rightRank: rightRanks.points_allowed || null,
      },
      {
        key: "pass_yards_against",
        label: "Pass YPG Against",
        a: left.pass_yards_against,
        b: right.pass_yards_against,
        leftRank: leftRanks.pass_yards_against || null,
        rightRank: rightRanks.pass_yards_against || null,
      },
      {
        key: "rush_yards_against",
        label: "Rush YPG Against",
        a: left.rush_yards_against,
        b: right.rush_yards_against,
        leftRank: leftRanks.rush_yards_against || null,
        rightRank: rightRanks.rush_yards_against || null,
      },
      {
        key: "total_yards_against",
        label: "Total YPG Against",
        a: left.total_yards_against,
        b: right.total_yards_against,
        leftRank: leftRanks.total_yards_against || null,
        rightRank: rightRanks.total_yards_against || null,
      },
      {
        key: "avg_pass_completion_against",
        label: "Avg/Comp Against",
        a: left.avg_pass_completion_against,
        b: right.avg_pass_completion_against,
        leftRank: leftRanks.avg_pass_completion_against || null,
        rightRank: rightRanks.avg_pass_completion_against || null,
      },
      {
        key: "avg_rush_against",
        label: "Avg/Rush Against",
        a: left.avg_rush_against,
        b: right.avg_rush_against,
        leftRank: leftRanks.avg_rush_against || null,
        rightRank: rightRanks.avg_rush_against || null,
      },
      {
        key: "turnovers_forced",
        label: "Turnovers Forced/G",
        a: left.turnovers_forced,
        b: right.turnovers_forced,
        leftRank: leftRanks.turnovers_forced || null,
        rightRank: rightRanks.turnovers_forced || null,
      },
      {
        key: "interceptions",
        label: "INTs/G",
        a: left.interceptions,
        b: right.interceptions,
        leftRank: leftRanks.interceptions || null,
        rightRank: rightRanks.interceptions || null,
      },
      {
        key: "sacks",
        label: "Sacks/G",
        a: left.sacks,
        b: right.sacks,
        leftRank: leftRanks.sacks || null,
        rightRank: rightRanks.sacks || null,
      },
      {
        key: "tackles_for_loss",
        label: "TFL/G",
        a: left.tackles_for_loss,
        b: right.tackles_for_loss,
        leftRank: leftRanks.tackles_for_loss || null,
        rightRank: rightRanks.tackles_for_loss || null,
      },
      {
        key: "passes_defended",
        label: "Passes Def/G",
        a: left.passes_defended,
        b: right.passes_defended,
        leftRank: leftRanks.passes_defended || null,
        rightRank: rightRanks.passes_defended || null,
      },
      {
        key: "forced_fumbles",
        label: "Forced Fumbles/G",
        a: left.forced_fumbles,
        b: right.forced_fumbles,
        leftRank: leftRanks.forced_fumbles || null,
        rightRank: rightRanks.forced_fumbles || null,
      },
      {
        key: "touchdowns_allowed",
        label: "TDs Allowed/G",
        a: left.touchdowns_allowed,
        b: right.touchdowns_allowed,
        leftRank: leftRanks.touchdowns_allowed || null,
        rightRank: rightRanks.touchdowns_allowed || null,
      },
    ];
  }, [mode, defenseByTeam, leftTeam, rightTeam]);

  const leftGradeValue =
    typeof leftMetrics?.grade === "number"
      ? leftMetrics.grade
      : leftMetrics?.grade?.value ?? null;
  const rightGradeValue =
    typeof rightMetrics?.grade === "number"
      ? rightMetrics.grade
      : rightMetrics?.grade?.value ?? null;

  const playerImpact = useMemo(() => {
    if (mode !== "players") return { left: null, right: null };
    const leftList = primaryMetrics.left || [];
    const rightList = primaryMetrics.right || [];
    const leftScores = leftList.map((m) => toScore(m.value, m.key));
    const rightScores = rightList.map((m) => toScore(m.value, m.key));
    const avg = (list) => {
      if (!list.length) return null;
      const sum = list.reduce((acc, val) => acc + val, 0);
      return Math.round(sum / list.length);
    };
    return {
      left: avg(leftScores),
      right: avg(rightScores),
    };
  }, [mode, primaryMetrics]);

  return (
    <section className="matchPage">
      <header className="matchHeader">
        <div>
          <p className="pill">MATCHUP</p>
          <h2>Player-vs-Player or Team-vs-Team</h2>
          <p className="muted">
            Quick side-by-side to gauge advantage before setting fantasy lineups or bets. Swap mode to flip
            between player and team views.
          </p>
        </div>
        <div className="modeSwitch">
          <button
            type="button"
            className={`modeBtn ${mode === "players" ? "active" : ""}`}
            onClick={() => {
              setMode("players");
              setLeftPlayer(null);
              setRightPlayer(null);
            }}
          >
            Players
          </button>
          <button
            type="button"
            className={`modeBtn ${mode === "teams" ? "active" : ""}`}
            onClick={() => {
              setMode("teams");
              setLeftTeam(teams[0]?.abbreviation || "");
              setRightTeam(teams[1]?.abbreviation || teams[0]?.abbreviation || "");
            }}
          >
            Teams
          </button>
        </div>
      </header>

      <div className="matchSelectors">
        {mode === "players" ? (
          <>
            {/* Player-vs-Player search inputs.  Each search input fires onSelect with the selected player's full name. */}
            <PlayerSearchInput onSelect={setLeftPlayer} />
            <PlayerSearchInput onSelect={setRightPlayer} />
          </>
        ) : (
          <>
            {/* Team-vs-Team dropdowns.  Use the full list of team names for both sides. */}
            <Selector
              label="Team 1"
              options={teams.map((t) => t.abbreviation)}
              value={leftTeam || teams[0]?.abbreviation || ""}
              onChange={(val) => setLeftTeam(val)}
            />
            <Selector
              label="Team 2"
              options={teams.map((t) => t.abbreviation)}
              value={rightTeam || teams[1]?.abbreviation || teams[0]?.abbreviation || ""}
              onChange={(val) => setRightTeam(val)}
            />
          </>
        )}
      </div>

      <div className="matchGrid">
        <div className="matchCard">
          <p className="muted">
            {mode === "players"
              ? leftEntity?.position || leftMetrics?.position || "—"
              : "Offense/Defense"}
          </p>
          <h3>
            {mode === "players"
              ? playerDisplayName(leftEntity)
              : leftEntity?.fullName || leftEntity?.name || leftEntity?.abbreviation}
          </h3>
          <p className="pill">
            {mode === "players"
              ? leftEntity?.team_abbr || leftEntity?.team?.abbreviation || leftEntity?.team
              : leftEntity?.abbreviation}
          </p>
          <div className="scoreRow">
            {mode === "players"
              ? primaryMetrics.left.map((m) => {
                  const rightMatch = primaryMetrics.right.find((r) => r.key === m.key);
                  const rightVal = rightMatch?.value ?? null;
                  const lowerBetter = LOWER_BETTER.has(m.key);
                  const highlight =
                    m.value != null && rightVal != null && m.value !== rightVal
                      ? lowerBetter
                        ? m.value < rightVal
                        : m.value > rightVal
                      : false;
                  return (
                    <ScorePill
                      key={m.label}
                      label={m.label}
                      value={m.value}
                      loading={leftPlayerLoading}
                      highlight={highlight}
                    />
                  );
                })
              : primaryMetrics.map((m) => (
                  <ScorePill
                    key={m.label}
                    label={m.label}
                    value={m.a}
                    loading={leftLoading}
                    highlight={m.a != null && m.b != null && m.a > m.b}
                    subLabel={
                      m.leftRank && teamRankCount
                        ? `Rank ${m.leftRank} / ${teamRankCount}`
                        : null
                    }
                  />
                ))}
          </div>
          {mode === "teams" ? (
            <>
              <div className="scoreRow">
                {defenseMetrics.map((m) => (
                  <ScorePill
                    key={`left-defense-${m.label}`}
                    label={m.label}
                    value={m.a}
                    loading={leftLoading}
                    highlight={
                      m.a != null && m.b != null && m.a !== m.b
                        ? LOWER_BETTER.has(m.key)
                          ? m.a < m.b
                          : m.a > m.b
                        : false
                    }
                    subLabel={
                      m.leftRank && defenseRankCount
                        ? `Rank ${m.leftRank} / ${defenseRankCount}`
                        : null
                    }
                  />
                ))}
              </div>
              <div className="starterRanks">
                <div className="starterTitle">Starter Ranks</div>
                {["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB"].map((pos) => {
                  const rank = starterRanks[pos]?.get(leftTeam) || null;
                  return (
                    <div key={`left-${pos}`} className="starterRow">
                      <span>{pos}1</span>
                      <span>
                        {rank && starterRankCount
                          ? `Rank ${rank} / ${starterRankCount}`
                          : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
          {mode === "players" && leftGradeValue != null ? (
            <div className="scorePill">
              <span className="scoreLabel">Position Grade</span>
              <span className="scoreValue">{Math.round(leftGradeValue)} / 100</span>
            </div>
          ) : null}
          {mode === "players" && playerImpact.left != null ? (
            <ScorePill
              label="Impact Score"
              value={playerImpact.left}
              highlight={
                playerImpact.right != null && playerImpact.left > playerImpact.right
              }
            />
          ) : null}
        </div>

        <div className="versus">vs</div>

        <div className="matchCard">
          <p className="muted">
            {mode === "players"
              ? rightEntity?.position || rightMetrics?.position || "—"
              : "Offense/Defense"}
          </p>
          <h3>
            {mode === "players"
              ? playerDisplayName(rightEntity)
              : rightEntity?.fullName || rightEntity?.name || rightEntity?.abbreviation}
          </h3>
          <p className="pill">
            {mode === "players"
              ? rightEntity?.team_abbr || rightEntity?.team?.abbreviation || rightEntity?.team
              : rightEntity?.abbreviation}
          </p>
          <div className="scoreRow">
            {mode === "players"
              ? primaryMetrics.right.map((m) => {
                  const leftMatch = primaryMetrics.left.find((r) => r.key === m.key);
                  const leftVal = leftMatch?.value ?? null;
                  const lowerBetter = LOWER_BETTER.has(m.key);
                  const highlight =
                    m.value != null && leftVal != null && m.value !== leftVal
                      ? lowerBetter
                        ? m.value < leftVal
                        : m.value > leftVal
                      : false;
                  return (
                    <ScorePill
                      key={m.label}
                      label={m.label}
                      value={m.value}
                      loading={rightPlayerLoading}
                      highlight={highlight}
                    />
                  );
                })
              : primaryMetrics.map((m) => (
                  <ScorePill
                    key={m.label}
                    label={m.label}
                    value={m.b}
                    loading={rightLoading}
                    highlight={m.a != null && m.b != null && m.b > m.a}
                    subLabel={
                      m.rightRank && teamRankCount
                        ? `Rank ${m.rightRank} / ${teamRankCount}`
                        : null
                    }
                  />
                ))}
          </div>
          {mode === "teams" ? (
            <>
              <div className="scoreRow">
                {defenseMetrics.map((m) => (
                  <ScorePill
                    key={`right-defense-${m.label}`}
                    label={m.label}
                    value={m.b}
                    loading={rightLoading}
                    highlight={
                      m.a != null && m.b != null && m.a !== m.b
                        ? LOWER_BETTER.has(m.key)
                          ? m.b < m.a
                          : m.b > m.a
                        : false
                    }
                    subLabel={
                      m.rightRank && defenseRankCount
                        ? `Rank ${m.rightRank} / ${defenseRankCount}`
                        : null
                    }
                  />
                ))}
              </div>
              <div className="starterRanks">
                <div className="starterTitle">Starter Ranks</div>
                {["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB"].map((pos) => {
                  const rank = starterRanks[pos]?.get(rightTeam) || null;
                  return (
                    <div key={`right-${pos}`} className="starterRow">
                      <span>{pos}1</span>
                      <span>
                        {rank && starterRankCount
                          ? `Rank ${rank} / ${starterRankCount}`
                          : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
          {mode === "players" && rightGradeValue != null ? (
            <div className="scorePill">
              <span className="scoreLabel">Position Grade</span>
              <span className="scoreValue">{Math.round(rightGradeValue)} / 100</span>
            </div>
          ) : null}
          {mode === "players" && playerImpact.right != null ? (
            <ScorePill
              label="Impact Score"
              value={playerImpact.right}
              highlight={
                playerImpact.left != null && playerImpact.right > playerImpact.left
              }
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
