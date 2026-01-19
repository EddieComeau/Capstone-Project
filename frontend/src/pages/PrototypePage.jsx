import { useEffect, useMemo, useState } from "react";
import PlayerCard from "../components/cards/PlayerCard";
import TeamCard from "../components/cards/TeamCard";
import PlayerSearchInput from "../components/PlayerSearchInput";
import { apiGet } from "../lib/api";
import { getDefaultSeason } from "../utils/season";
import "./PrototypePage.css";

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

function computeQbrApprox(stats, passerRating) {
  if (!stats) return 0;
  const passYds = stats.passing_yards || 0;
  const rushYds = stats.rushing_yards || 0;
  const passTds = stats.passing_tds || 0;
  const rushTds = stats.rushing_tds || 0;
  const ints = stats.interceptions || 0;
  const base = passerRating ? (passerRating / 158.3) * 100 : 0;
  const volume = passYds / 25 + rushYds / 10 + (passTds + rushTds) * 2.5 - ints * 3;
  const blended = base * 0.7 + volume * 0.3;
  return Math.max(0, Math.min(100, Math.round(blended)));
}

function buildDerivedAdvanced(totals) {
  if (!totals) return {};
  const fallbackGames =
    totals.passing_yards || totals.rushing_yards || totals.receiving_yards ? 17 : 0;
  const games = totals.games || fallbackGames;
  const passingAttempts = totals.passing_attempts || 0;
  const passingCompletions = totals.passing_completions || 0;
  const rushingAttempts = totals.rushing_attempts || 0;
  const receivingTargets = totals.receiving_targets || 0;
  const passerRating = computePasserRating(totals);

  return {
    passer_rating: totals.passer_rating || totals.qb_rating || passerRating || 0,
    qbr: totals.qbr || computeQbrApprox(totals, passerRating) || 0,
    completion_pct: safeDivide(passingCompletions, passingAttempts) * 100,
    yards_per_attempt: safeDivide(totals.passing_yards || 0, passingAttempts),
    passing_yards_per_game: safeDivide(totals.passing_yards || 0, games),
    rushing_yards_per_game: safeDivide(totals.rushing_yards || 0, games),
    yards_per_carry: safeDivide(totals.rushing_yards || 0, rushingAttempts),
    rushing_attempts: totals.rushing_attempts || 0,
    catch_rate: safeDivide(totals.receptions || 0, receivingTargets) * 100,
    yards_per_target: safeDivide(totals.receiving_yards || 0, receivingTargets),
    yards_per_reception: safeDivide(totals.receiving_yards || 0, totals.receptions || 0),
    receiving_yards_per_game: safeDivide(totals.receiving_yards || 0, games),
    tackles_per_game: safeDivide(totals.tackles || 0, games),
    sacks_per_game: safeDivide(totals.sacks || 0, games),
    interceptions_per_game: safeDivide(totals.interceptions || 0, games),
    qb_hits: totals.qb_hits || 0,
    tackles_for_loss: totals.tackles_for_loss || 0,
    passes_defended: totals.passes_defended || 0,
    forced_fumbles: totals.forced_fumbles || 0,
    fumbles_recovered: totals.fumbles_recovered || 0,
    sacks_allowed: totals.sacks_allowed || 0,
    pressures_allowed: totals.pressures_allowed || 0,
    ol_rating: totals.ol_rating || 0,
    passing_attempts: totals.passing_attempts || 0,
    receiving_targets: totals.receiving_targets || 0,
    field_goals_made: totals.field_goals_made || 0,
    field_goals_attempted: totals.field_goals_attempted || 0,
    field_goal_pct:
      totals.field_goals_attempted
        ? (totals.field_goals_made / totals.field_goals_attempted) * 100
        : 0,
    punts: totals.punts || 0,
    punt_yards: totals.punt_yards || 0,
    punting_avg: totals.punts ? totals.punt_yards / totals.punts : 0,
    punts_inside_20: totals.punts_inside_20 || 0,
    long_punt: totals.long_punt || 0,
  };
}

export default function PrototypePage() {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [playerAdvanced, setPlayerAdvanced] = useState(null);
  const [playerGrade, setPlayerGrade] = useState(null);
  const [positionRankInfo, setPositionRankInfo] = useState(null);
  const [season, setSeason] = useState(getDefaultSeason());
  const [seasonRequested, setSeasonRequested] = useState(null);
  const [teams, setTeams] = useState([]);
  const [standings, setStandings] = useState([]);
  const [teamQuery, setTeamQuery] = useState("");
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingPlayerStats, setLoadingPlayerStats] = useState(false);
  const [teamSearchActive, setTeamSearchActive] = useState(false);
  const [selectedTeamCard, setSelectedTeamCard] = useState(null);
  const [teamRankings, setTeamRankings] = useState(null);
  const [loadingTeamRankings, setLoadingTeamRankings] = useState(false);
  const [teamRankingsSeason, setTeamRankingsSeason] = useState(null);
  const [defenseStats, setDefenseStats] = useState({});
  const [defenseRanks, setDefenseRanks] = useState({});
  const [defenseRankCount, setDefenseRankCount] = useState(0);

  useEffect(() => {
    async function loadTeams() {
      try {
        setLoadingTeams(true);
        const [teamsRes, standingsRes] = await Promise.all([
          apiGet("/teams/db"),
          apiGet(`/standings/${season}`),
        ]);
        setTeams(Array.isArray(teamsRes) ? teamsRes : []);
        setStandings(standingsRes?.data || []);
        if (standingsRes?.season && standingsRes.season !== season) {
          setSeason(standingsRes.season);
        }
      } catch (e) {
        console.warn("Failed to load teams/standings", e);
        setTeams([]);
        setStandings([]);
      } finally {
        setLoadingTeams(false);
      }
    }
    loadTeams();
  }, [season]);

  useEffect(() => {
    setTeamRankings(null);
    setTeamRankingsSeason(null);
    setSelectedTeamCard(null);
  }, [season]);

  useEffect(() => {
    if (!teamSearchActive || !teamQuery.trim()) return;
    if (teamRankings && teamRankingsSeason === season) return;
    if (!teams.length) return;
    loadTeamRankings().catch(() => {});
  }, [teamSearchActive, teamQuery, teamRankings, teamRankingsSeason, season, teams]);

  useEffect(() => {
    let cancelled = false;
    async function loadDefenseStats() {
      try {
        const data = await apiGet("/stats/teams/defense", { season });
        const list = Array.isArray(data?.results) ? data.results : [];
        const perTeam = {};
        const ranks = {};
        list.forEach((row) => {
          if (!row?.team_abbr) return;
          perTeam[row.team_abbr] = row.defense_per_game || {};
          ranks[row.team_abbr] = row.defense_ranks || {};
        });
        if (!cancelled) {
          setDefenseStats(perTeam);
          setDefenseRanks(ranks);
          setDefenseRankCount(list.length || 0);
        }
      } catch (err) {
        if (!cancelled) {
          setDefenseStats({});
          setDefenseRanks({});
          setDefenseRankCount(0);
        }
      }
    }
    loadDefenseStats();
    return () => {
      cancelled = true;
    };
  }, [season]);

  useEffect(() => {
    async function loadPlayerStats() {
      if (!selectedPlayer?.player_id && !selectedPlayer?.id) {
        setPlayerStats(null);
        setPlayerAdvanced(null);
        return;
      }
      try {
        setLoadingPlayerStats(true);
        const playerId = selectedPlayer.player_id || selectedPlayer.id;
        const data = await apiGet(`/stats/player/${playerId}`, { season });
        setPlayerStats(data?.totals || null);
        const derived = buildDerivedAdvanced(data?.totals || null);
        const merged = { ...(derived || {}) };
        Object.entries(data?.advanced || {}).forEach(([key, value]) => {
          if (value == null || Number.isNaN(Number(value))) return;
          if (merged[key] == null || Number.isNaN(Number(merged[key])) || (merged[key] === 0 && value > 0)) {
            merged[key] = value;
          }
        });
        setPlayerAdvanced(merged);
        setPlayerGrade(data?.grade || null);
        setSeasonRequested(data?.season_requested ?? null);
        if (data?.season && data.season !== season) {
          setSeason(data.season);
        }
      } catch (e) {
        console.warn("Failed to load player stats", e);
        setPlayerStats(null);
        setPlayerAdvanced(null);
        setPlayerGrade(null);
        setSeasonRequested(null);
      } finally {
        setLoadingPlayerStats(false);
      }
    }
    loadPlayerStats();
  }, [selectedPlayer, season]);

  function resolvePositionGroup(position) {
    const raw = String(position || "").toUpperCase();
    if (raw.includes("QB")) return "QB";
    if (raw.includes("RB") || raw.includes("HALFBACK") || raw.includes("FULLBACK")) return "RB";
    if (raw.includes("WR") || raw.includes("WIDE RECEIVER")) return "WR";
    if (raw.includes("TE") || raw.includes("TIGHT END")) return "TE";
    if (["OT", "OG", "C", "G", "T", "OL", "LT", "RT", "LG", "RG"].includes(raw)) return "OL";
    if (["DE", "DT", "DL", "NT", "EDGE"].includes(raw)) return "DL";
    if (["LB", "OLB", "ILB", "MLB"].includes(raw) || raw.includes("LINEBACKER")) return "LB";
    if (["CB", "DB", "FS", "SS", "S"].includes(raw) || raw.includes("CORNERBACK") || raw.includes("SAFETY")) return "DB";
    return raw || "QB";
  }

  useEffect(() => {
    async function loadPositionRank() {
      if (!selectedPlayer) {
        setPositionRankInfo(null);
        return;
      }
      const playerId = selectedPlayer.player_id || selectedPlayer.id || selectedPlayer.PlayerID;
      if (!playerId) {
        setPositionRankInfo(null);
        return;
      }
      const normalizePositionExact = (position) => {
        if (!position) return "";
        const raw = String(position).toUpperCase().replace(/[0-9]/g, "").trim();
        if (raw.includes("QUARTERBACK")) return "QB";
        if (raw.includes("RUNNING BACK")) return "RB";
        if (raw.includes("HALFBACK")) return "HB";
        if (raw.includes("FULLBACK")) return "FB";
        if (raw.includes("WIDE RECEIVER")) return "WR";
        if (raw.includes("TIGHT END")) return "TE";
        if (raw.includes("DEFENSIVE TACKLE")) return "DT";
        if (raw.includes("DEFENSIVE END")) return "DE";
        if (raw.includes("NOSE TACKLE")) return "NT";
        if (raw.includes("DEFENSIVE LINE")) return "DL";
        if (raw.includes("LINEBACKER")) return "LB";
        if (raw.includes("CORNERBACK")) return "CB";
        if (raw.includes("FREE SAFETY")) return "FS";
        if (raw.includes("STRONG SAFETY")) return "SS";
        if (raw.includes("SAFETY")) return "S";
        if (raw.includes("CENTER")) return "C";
        if (raw.includes("GUARD")) return "G";
        if (raw.includes("TACKLE")) return "T";
        return raw;
      };
      const primaryValueForPosition = (position, totals) => {
        if (!totals) return -1;
        const pos = normalizePositionExact(position);
        if (pos === "QB") return totals.passing_yards || 0;
        if (["RB", "HB", "FB"].includes(pos)) return totals.rushing_yards || 0;
        if (["WR", "TE"].includes(pos)) return totals.receiving_yards || 0;
        if (["C", "G", "T", "OL", "OG", "OT", "LT", "RT", "LG", "RG"].includes(pos)) {
          const sacksAllowed = totals.sacks_allowed;
          if (sacksAllowed != null) return -sacksAllowed;
          return totals.games || 0;
        }
        if (["DL", "DE", "DT", "NT", "EDGE", "LB", "OLB", "ILB", "MLB", "DB", "CB", "FS", "SS", "S"].includes(pos)) {
          const sacks = totals.sacks || 0;
          const tackles = totals.tackles || 0;
          const ints = totals.interceptions || 0;
          const tfl = totals.tackles_for_loss || 0;
          const passesDef = totals.passes_defended || 0;
          const fumbles = totals.forced_fumbles || 0;
          return sacks * 20 + tackles * 2 + ints * 25 + tfl * 5 + passesDef * 5 + fumbles * 15;
        }
        return totals.games || 0;
      };
      const exact = normalizePositionExact(selectedPlayer.position);
      const group = resolvePositionGroup(exact);
      try {
        const data = await apiGet("/stats/players/position", {
          season,
          position: group,
          all: 1,
          min_passing_yards: 500,
        });
        const list = Array.isArray(data?.results) ? data.results : [];
        const filtered = list.filter(
          (row) => normalizePositionExact(row.position) === exact
        );
        const sorted = filtered.slice().sort((a, b) => {
          const aVal = primaryValueForPosition(a.position, a.totals);
          const bVal = primaryValueForPosition(b.position, b.totals);
          if (aVal !== bVal) return bVal - aVal;
          return (a.name || "").localeCompare(b.name || "");
        });
        const rankMap = new Map();
        sorted.forEach((row, idx) => {
          if (row?.player_id != null) rankMap.set(Number(row.player_id), idx + 1);
        });
        const rank = rankMap.get(Number(playerId)) || null;
        const count = sorted.length || 0;
        setPositionRankInfo(count ? { rank, count } : null);
      } catch (e) {
        setPositionRankInfo(null);
      }
    }
    loadPositionRank();
  }, [selectedPlayer, season]);

  const standingsByAbbr = useMemo(() => {
    const map = new Map();
    for (const row of standings || []) {
      if (row?.team?.abbreviation) {
        map.set(row.team.abbreviation, row);
      }
    }
    return map;
  }, [standings]);

  const divisionRanks = useMemo(() => {
    const byDivision = {};
    (standings || []).forEach((row) => {
      const division = formatDivisionLabel({
        division: row.division || row.team?.division,
        conference: row.conference || row.team?.conference,
      });
      const abbr = row.team?.abbreviation;
      if (!division || !abbr) return;
      if (!byDivision[division]) byDivision[division] = [];
      byDivision[division].push(row);
    });

    const rankMap = new Map();
    Object.values(byDivision).forEach((rows) => {
      const sorted = rows.slice().sort(compareTeams);
      sorted.forEach((row, idx) => {
        const abbr = row.team?.abbreviation;
        if (abbr) rankMap.set(abbr, idx + 1);
      });
    });
    return rankMap;
  }, [standings]);

  const standingsRanks = useMemo(() => {
    const list = (standings || [])
      .map((row) => ({
        abbr: row.team?.abbreviation,
        win_pct: row.win_pct ?? 0,
        points_for: row.points_for ?? 0,
        point_diff: row.point_diff ?? row.point_differential ?? 0,
      }))
      .filter((row) => row.abbr);

    const rankMap = (key) => {
      const sorted = [...list].sort((a, b) => (b[key] || 0) - (a[key] || 0));
      const map = new Map();
      sorted.forEach((row, idx) => {
        map.set(row.abbr, idx + 1);
      });
      return map;
    };

    return {
      win_pct: rankMap("win_pct"),
      points_for: rankMap("points_for"),
      point_diff: rankMap("point_diff"),
    };
  }, [standings]);

  async function loadTeamRankings() {
    if (!teams.length) return;
    try {
      setLoadingTeamRankings(true);
      const results = await Promise.all(
        teams.map(async (team) => {
          try {
            const data = await apiGet(`/stats/team/${team.abbreviation}`, { season });
            return {
              abbr: team.abbreviation,
              per_game: data?.per_game || null,
            };
          } catch (e) {
            return { abbr: team.abbreviation, per_game: null };
          }
        })
      );
      const perGameList = results
        .filter((row) => row.per_game)
        .map((row) => ({
          abbr: row.abbr,
          points: row.per_game.points ?? 0,
          passing_yards: row.per_game.passing_yards ?? 0,
          rushing_yards: row.per_game.rushing_yards ?? 0,
          total_yards: row.per_game.total_yards ?? 0,
          total_tds: row.per_game.total_tds ?? 0,
        }));

      const rankMap = (key) => {
        const sorted = [...perGameList].sort((a, b) => (b[key] || 0) - (a[key] || 0));
        const map = new Map();
        sorted.forEach((row, idx) => {
          map.set(row.abbr, idx + 1);
        });
        return map;
      };

      setTeamRankings({
        count: results.length,
        per_game: results.reduce((acc, row) => {
          acc[row.abbr] = row.per_game;
          return acc;
        }, {}),
        ranks: {
          points: rankMap("points"),
          passing_yards: rankMap("passing_yards"),
          rushing_yards: rankMap("rushing_yards"),
          total_yards: rankMap("total_yards"),
          total_tds: rankMap("total_tds"),
        },
      });
      setTeamRankingsSeason(season);
    } finally {
      setLoadingTeamRankings(false);
    }
  }

  const teamCards = useMemo(() => {
    const rankToScore = (rank, count, lowerBetter = false) => {
      if (!rank || !count) return null;
      const score = Math.round(((count - rank + 1) / count) * 100);
      return lowerBetter ? score : score;
    };
    if (!teamSearchActive || !teamQuery.trim()) return [];
    return teams
      .map((team) => {
        const entry = standingsByAbbr.get(team.abbreviation) || {};
        const division = formatDivisionLabel({
          division: team.division || entry.division,
          conference: team.conference || entry.conference,
        });
        const offenseRanks = teamRankings?.ranks || {};
        const defenseRankMap = defenseRanks?.[team.abbreviation] || {};
        const offenseScores = [
          rankToScore(offenseRanks.points?.get(team.abbreviation), teamRankings?.count),
          rankToScore(offenseRanks.passing_yards?.get(team.abbreviation), teamRankings?.count),
          rankToScore(offenseRanks.rushing_yards?.get(team.abbreviation), teamRankings?.count),
          rankToScore(offenseRanks.total_yards?.get(team.abbreviation), teamRankings?.count),
          rankToScore(offenseRanks.total_tds?.get(team.abbreviation), teamRankings?.count),
        ].filter((v) => v != null);
        const offenseRating = offenseScores.length
          ? Math.round(offenseScores.reduce((sum, v) => sum + v, 0) / offenseScores.length)
          : null;
        const defenseScores = [
          rankToScore(defenseRankMap.points_allowed, defenseRankCount, true),
          rankToScore(defenseRankMap.pass_yards_against, defenseRankCount, true),
          rankToScore(defenseRankMap.rush_yards_against, defenseRankCount, true),
          rankToScore(defenseRankMap.total_yards_against, defenseRankCount, true),
          rankToScore(defenseRankMap.touchdowns_allowed, defenseRankCount, true),
        ].filter((v) => v != null);
        const defenseRating = defenseScores.length
          ? Math.round(defenseScores.reduce((sum, v) => sum + v, 0) / defenseScores.length)
          : null;
        return {
          id: team.ballDontLieTeamId || team._id || team.abbreviation,
          name: team.fullName || team.name,
          code: team.abbreviation,
          division: division || "—",
          record: entry.record || "—",
          rank: divisionRanks.get(team.abbreviation) ?? entry.rank ?? null,
          pointsFor: entry.points_for ?? null,
          pointsAgainst: entry.points_against ?? null,
          season,
          offenseRating,
          defenseRating,
        };
      })
      .filter((team) => {
        if (!teamQuery) return false;
        const q = teamQuery.toLowerCase();
        return (
          team.name.toLowerCase().includes(q) ||
          team.code.toLowerCase().includes(q)
        );
      });
  }, [
    teams,
    standingsByAbbr,
    teamQuery,
    season,
    teamSearchActive,
    teamRankings,
    defenseRanks,
    defenseRankCount,
    divisionRanks,
  ]);

  const playerCardData = useMemo(() => {
    if (!selectedPlayer) return null;
    const position = selectedPlayer.position || "—";
    const pos = String(position).toUpperCase();
    const stats = playerStats || {};
    const advanced = playerAdvanced || {};

    let statLines = [];
    if (pos.includes("QB") || pos.includes("QUARTERBACK")) {
      statLines = [
        { label: "Pass Yds", value: stats.passing_yards },
        { label: "Pass TD", value: stats.passing_tds },
        { label: "INT", value: stats.interceptions },
        { label: "Rating", value: advanced.passer_rating },
      ];
    } else if (pos.includes("WR") || pos.includes("TE") || pos.includes("WIDE RECEIVER")) {
      statLines = [
        { label: "Rec Yds", value: stats.receiving_yards },
        { label: "Rec TD", value: stats.receiving_tds },
        { label: "Rec", value: stats.receptions },
        { label: "Yds/Tgt", value: advanced.yards_per_target },
      ];
    } else if (pos.includes("RB") || pos.includes("RUNNING BACK") || pos.includes("FB")) {
      statLines = [
        { label: "Rush Yds", value: stats.rushing_yards },
        { label: "Rush TD", value: stats.rushing_tds },
        { label: "Rec", value: stats.receptions },
        { label: "Yds/Car", value: advanced.yards_per_carry },
      ];
    } else if (pos.includes("K")) {
      statLines = [
        { label: "FG %", value: advanced.field_goal_pct },
        { label: "FG Made", value: advanced.field_goals_made },
        { label: "FG Att", value: advanced.field_goals_attempted },
        { label: "Long", value: stats.field_goals_long },
      ];
    } else if (pos.includes("P")) {
      statLines = [
        { label: "Avg Punt", value: advanced.punting_avg },
        { label: "Punts", value: advanced.punts },
        { label: "Inside 20", value: advanced.punts_inside_20 },
        { label: "Long", value: advanced.long_punt },
      ];
    } else {
      statLines = [
        { label: "Tackles", value: stats.tackles },
        { label: "Sacks", value: stats.sacks },
        { label: "INT", value: stats.interceptions },
        { label: "Points", value: stats.points },
      ];
    }

    const gradeValue =
      typeof playerGrade === "number"
        ? playerGrade
        : playerGrade && typeof playerGrade.value === "number"
        ? playerGrade.value
        : null;
    if (gradeValue != null) {
      statLines = [...statLines, { label: "Pos Grade", value: `${Math.round(gradeValue)}/100` }];
    }
    if (positionRankInfo?.rank && positionRankInfo?.count) {
      statLines = [
        ...statLines,
        {
          label: "Pos Rank",
          value:
            positionRankInfo.rank != null
              ? `#${positionRankInfo.rank} / ${positionRankInfo.count}`
              : `— / ${positionRankInfo.count}`,
        },
      ];
    } else if (positionRankInfo?.count) {
      statLines = [
        ...statLines,
        { label: "Pos Rank", value: `— / ${positionRankInfo.count}` },
      ];
    }

    return {
      name: selectedPlayer.full_name,
      team: selectedPlayer.team_abbr,
      position: selectedPlayer.position,
      number: selectedPlayer.jersey_number,
      season,
      statLines,
      grade: playerGrade,
    };
  }, [selectedPlayer, playerStats, playerAdvanced, playerGrade, positionRankInfo, season]);

  return (
    <div className="protoWrap">
      <header className="appHeader">
        <h1 className="appTitle">Cards</h1>
        <p className="appSubtitle">Search for any player below</p>
        <PlayerSearchInput onSelect={setSelectedPlayer} />
      </header>

      <div className="appContent">
        <section className="section">
          <h2 className="sectionTitle">Player Card</h2>
          {selectedPlayer ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  Season
                  <input
                    name="player-card-season"
                    type="number"
                    value={season}
                    onChange={(e) => setSeason(Number(e.target.value))}
                    style={{ width: 90 }}
                  />
                </label>
                {seasonRequested != null && seasonRequested !== season ? (
                  <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                    No regular-season data for {seasonRequested}; showing {season}.
                  </div>
                ) : null}
              </div>
              {loadingPlayerStats && <div>Loading player stats…</div>}
              <PlayerCard player={playerCardData || { name: selectedPlayer.full_name }} />
            </>
          ) : (
            <p>Search for a player to load a card.</p>
          )}
        </section>

        <section className="section">
          <h2 className="sectionTitle">Team Cards</h2>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <input
              name="team-search"
              placeholder="Search team..."
              value={teamQuery}
              onChange={(e) => {
                const next = e.target.value;
                setTeamQuery(next);
                setTeamSearchActive(next.trim().length > 0);
              }}
              style={{ width: 220, padding: "6px 10px" }}
            />
            <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              Season
              <input
                name="team-card-season"
                type="number"
                value={season}
                onChange={(e) => setSeason(Number(e.target.value))}
                style={{ width: 90 }}
              />
            </label>
          </div>
          {loadingTeams ? <p>Loading teams…</p> : null}
          {!teamQuery.trim() ? (
            <p>Search for a team to load cards.</p>
          ) : teamCards.length === 0 ? (
            <p>No matching teams for that search.</p>
          ) : (
            <div className="cardGrid">
              {teamCards.map((t) => (
                <TeamCard
                  key={t.id}
                  team={t}
                  onSelect={async () => {
                    setSelectedTeamCard(t);
                    if (!teamRankings || teamRankingsSeason !== season) {
                      await loadTeamRankings();
                    }
                  }}
                />
              ))}
            </div>
          )}
          {selectedTeamCard ? (
            <div style={{ marginTop: 16 }}>
              <h3>{selectedTeamCard.name} Rankings</h3>
              {loadingTeamRankings ? (
                <p>Loading team rankings…</p>
              ) : (
                <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
                  <div>Win % rank: #{standingsRanks.win_pct.get(selectedTeamCard.code) || "—"} / 32</div>
                  <div>Points For rank: #{standingsRanks.points_for.get(selectedTeamCard.code) || "—"} / 32</div>
                  <div>Point Diff rank: #{standingsRanks.point_diff.get(selectedTeamCard.code) || "—"} / 32</div>
                  <div>Pts/G rank: #{teamRankings?.ranks.points.get(selectedTeamCard.code) || "—"} / 32</div>
                  <div>Pass Yds/G rank: #{teamRankings?.ranks.passing_yards.get(selectedTeamCard.code) || "—"} / 32</div>
                  <div>Rush Yds/G rank: #{teamRankings?.ranks.rushing_yards.get(selectedTeamCard.code) || "—"} / 32</div>
                </div>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function formatDivisionLabel({ division, conference }) {
  if (!division) return conference || null;
  const upper = String(division).toUpperCase();
  if (upper.includes("AFC") || upper.includes("NFC")) return division;
  if (conference) return `${conference} ${division}`;
  return division;
}

function winPctFromRow(row) {
  const wins = row?.wins ?? row?.win ?? row?.w ?? 0;
  const losses = row?.losses ?? row?.loss ?? row?.l ?? 0;
  const ties = row?.ties ?? row?.t ?? 0;
  const total = wins + losses + ties;
  if (!total) return 0;
  return (wins + ties * 0.5) / total;
}

function compareTeams(a, b) {
  const aPct = a.win_pct ?? winPctFromRow(a);
  const bPct = b.win_pct ?? winPctFromRow(b);
  if (bPct !== aPct) return bPct - aPct;
  const aDiff = a.point_diff ?? a.point_differential ?? 0;
  const bDiff = b.point_diff ?? b.point_differential ?? 0;
  return bDiff - aDiff;
}
