// src/pages/DepthChartPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";
import TeamBadge from "../components/common/TeamBadge";
import PlayerAvatar from "../components/common/avatar";
import PlayerSearchInput from "../components/PlayerSearchInput"; // ← ADDED
import "./DepthChartPage.css";
import { getDefaultSeason } from "../utils/season";

function SlotCard({ player, onSelect, active }) {
  return (
    <button
      className={`dcCard ${active ? "active" : ""}`}
      type="button"
      onClick={() => onSelect(player)}
    >
      <div className="dcTop">
        <div className="dcPos">{player.position}</div>
        <TeamBadge abbr={player.team} size={22} />
      </div>
      <div className="dcName">{player.name}</div>
      <div className="dcMeta">
        #{player.number} • {player.depthLabel}
      </div>
      <div className="dcAvatar">
        <PlayerAvatar seed={`${player.team}-${player.name}`} size={48} />
      </div>
    </button>
  );
}

const STAT_MAX = {
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
  sacks_allowed: 20,
  qb_hits: 40,
  tackles_for_loss: 40,
  passes_defended: 30,
  forced_fumbles: 10,
  fumbles_recovered: 10,
  points: 180,
  games: 17,
  team_rush_ypg: 200,
  team_pass_ypg: 350,
  pass_block_score: 100,
  run_block_score: 100,
  line_score: 100,
  completion_pct: 100,
  yards_per_attempt: 10,
  passing_yards_per_game: 350,
  rushing_yards_per_game: 150,
  receiving_yards_per_game: 150,
  yards_per_carry: 8,
  yards_per_target: 12,
  yards_per_reception: 20,
  catch_rate: 100,
  tackles_per_game: 15,
  sacks_per_game: 2.5,
  interceptions_per_game: 1,
  tackles_for_loss_per_game: 3,
  passes_defended_per_game: 2,
  forced_fumbles_per_game: 1,
  qb_hits_per_game: 5,
  sacks_allowed_per_game: 2,
  punts: 90,
  punt_yards: 4500,
  punting_avg: 55,
  punts_inside_20: 40,
  long_punt: 80,
  qbr_approx: 100,
  passer_rating: 158.3,
  field_goal_pct: 100,
  field_goals_attempted: 50,
  field_goals_made: 50,
  field_goals_missed: 15,
  field_goals_long: 70,
  extra_points_made: 60,
  extra_points_attempted: 60,
  field_goal_0_19_pct: 100,
  field_goal_20_29_pct: 100,
  field_goal_30_39_pct: 100,
  field_goal_40_49_pct: 100,
  field_goal_50_59_pct: 100,
  field_goal_60_plus_pct: 100,
};

const METRIC_DESCRIPTORS = {
  completion_pct: { strength: "Accurate passer", weakness: "Inaccurate passer" },
  yards_per_attempt: { strength: "Pushes ball downfield", weakness: "Checkdown heavy" },
  passing_yards_per_game: { strength: "High-volume passer", weakness: "Low-volume passer" },
  passer_rating: { strength: "Efficient passer", weakness: "Inefficient passer" },
  qbr_approx: { strength: "Playmaker under pressure", weakness: "Limited playmaking" },
  passing_attempts: { strength: "High-usage passer", weakness: "Low-usage passer" },
  rushing_attempts: { strength: "Mobile threat", weakness: "Limited mobility" },
  yards_per_carry: { strength: "Explosive scrambler", weakness: "Low scramble efficiency" },
  rushing_yards_per_game: { strength: "Ground threat", weakness: "Limited rush impact" },
  receiving_yards_per_game: { strength: "Big-play target", weakness: "Low yardage impact" },
  yards_per_target: { strength: "Efficient target", weakness: "Inefficient target" },
  yards_per_reception: { strength: "Chunk-play threat", weakness: "Short-area only" },
  catch_rate: { strength: "Reliable hands", weakness: "Drop risk" },
  tackles_per_game: { strength: "Active tackler", weakness: "Low tackle volume" },
  sacks_per_game: { strength: "Pass-rush threat", weakness: "Limited pass rush" },
  interceptions_per_game: { strength: "Ball hawk", weakness: "Low takeaway impact" },
  tackles_for_loss_per_game: { strength: "Backfield disruptor", weakness: "Limited backfield impact" },
  passes_defended_per_game: { strength: "Coverage disruptor", weakness: "Limited coverage impact" },
  forced_fumbles_per_game: { strength: "Turnover creator", weakness: "Low turnover impact" },
  qb_hits_per_game: { strength: "QB pressure", weakness: "Limited pressure" },
  sacks_allowed_per_game: { strength: "Solid pass protection", weakness: "Allows pressure" },
  pass_block_score: { strength: "Strong pass protection", weakness: "Leaky pass protection" },
  run_block_score: { strength: "Strong run blocking", weakness: "Poor run blocking" },
  line_score: { strength: "Line anchor", weakness: "Line liability" },
  punting_avg: { strength: "Booming leg", weakness: "Low hangtime" },
  punts_inside_20: { strength: "Pins opponents", weakness: "Poor field position" },
};

function normalizePosition(position) {
  if (!position) return "";
  const raw = String(position).toUpperCase();
  if (raw.includes("QUARTERBACK")) return "QB";
  if (raw.includes("RUNNING BACK")) return "RB";
  if (raw.includes("HALFBACK")) return "HB";
  if (raw.includes("FULLBACK")) return "FB";
  if (raw.includes("WIDE RECEIVER")) return "WR";
  if (raw.includes("TIGHT END")) return "TE";
  if (raw.includes("DEFENSIVE END")) return "DE";
  if (raw.includes("DEFENSIVE TACKLE")) return "DT";
  if (raw.includes("NOSE TACKLE")) return "NT";
  if (raw.includes("DEFENSIVE LINE")) return "DL";
  if (raw.includes("CENTER")) return "C";
  if (raw.includes("GUARD")) return "G";
  if (raw.includes("TACKLE")) return "T";
  if (raw.includes("OFFENSIVE LINE")) return "OL";
  if (raw.includes("LINEBACKER")) return "LB";
  if (raw.includes("CORNERBACK")) return "CB";
  if (raw.includes("DEFENSIVE BACK")) return "DB";
  if (raw.includes("FREE SAFETY")) return "FS";
  if (raw.includes("STRONG SAFETY")) return "SS";
  if (raw.includes("SAFETY")) return "S";
  if (raw.includes("EDGE")) return "EDGE";
  if (raw.includes("KICKER")) return "K";
  if (raw.includes("PUNTER")) return "P";
  if (raw.includes("LONG SNAPPER")) return "LS";
  if (raw.includes("KICK RETURNER")) return "KR";
  if (raw.includes("PUNT RETURNER")) return "PR";
  return raw.replace(/[0-9]/g, "");
}

function resolvePositionRole(player) {
  const sources = [
    player?.raw?.position_abbreviation,
    player?.raw?.depth_chart_position,
    player?.raw?.position,
    player?.position,
  ]
    .filter(Boolean)
    .map((val) => String(val).toUpperCase());
  const text = sources.join(" ");
  const match = (regex) => regex.test(text);

  if (match(/\bSLOT\b/)) return { base: "WR", role: "Slot" };
  if (match(/\bOUTSIDE\b/)) return { base: "WR", role: "Outside" };
  if (match(/\bNICKEL\b/)) return { base: "CB", role: "Nickel" };
  if (match(/\bDIME\b/)) return { base: "DB", role: "Dime" };
  if (match(/\bDT\b/) || match(/\bDEFENSIVE TACKLE\b/)) return { base: "DT", role: "DT" };
  if (match(/\bDE\b/) || match(/\bDEFENSIVE END\b/)) return { base: "DE", role: "DE" };
  if (match(/\bNT\b/) || match(/\bNOSE TACKLE\b/)) return { base: "NT", role: "NT" };
  if (match(/\bEDGE\b/)) return { base: "EDGE", role: "EDGE" };
  if (match(/\bDL\b/) || match(/\bDEFENSIVE LINE\b/)) return { base: "DL", role: "DL" };
  if (match(/\bMLB\b/) || match(/\bMIDDLE LINEBACKER\b/)) return { base: "LB", role: "MLB" };
  if (match(/\bOLB\b/) || match(/\bOUTSIDE LINEBACKER\b/)) return { base: "LB", role: "OLB" };
  if (match(/\bILB\b/) || match(/\bINSIDE LINEBACKER\b/)) return { base: "LB", role: "ILB" };
  if (match(/\bLT\b/) || match(/\bLEFT TACKLE\b/)) return { base: "T", role: "LT" };
  if (match(/\bRT\b/) || match(/\bRIGHT TACKLE\b/)) return { base: "T", role: "RT" };
  if (match(/\bLG\b/) || match(/\bLEFT GUARD\b/)) return { base: "G", role: "LG" };
  if (match(/\bRG\b/) || match(/\bRIGHT GUARD\b/)) return { base: "G", role: "RG" };
  if (match(/\bCENTER\b/)) return { base: "C", role: "C" };
  if (match(/\bFS\b/) || match(/\bFREE SAFETY\b/)) return { base: "S", role: "FS" };
  if (match(/\bSS\b/) || match(/\bSTRONG SAFETY\b/)) return { base: "S", role: "SS" };

  return { base: normalizePosition(player?.position), role: "" };
}

function getPositionBase(position) {
  const raw = String(position || "").replace(/[0-9]/g, "").toUpperCase();
  if (raw === "PK") return "K";
  if (["LT", "RT", "LG", "RG", "C", "T", "G", "OT", "OG", "OL"].includes(raw)) return "OL";
  if (["FS", "SS", "CB", "S", "DB"].includes(raw)) return "DB";
  if (["OLB", "ILB", "MLB", "LB"].includes(raw)) return "LB";
  if (["DE", "DT", "NT", "DL", "EDGE"].includes(raw)) return "DL";
  return raw;
}

function getPositionRankKey(position) {
  const raw = String(position || "").replace(/[0-9]/g, "").toUpperCase();
  if (raw === "PK") return "K";
  return raw;
}

function toPercent(value, max) {
  if (value == null || max == null || max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function rankToScore(rank, count) {
  if (!rank || !count) return 0;
  return Math.round(((count - rank + 1) / count) * 100);
}

function isLowerBetter(key) {
  return [
    "turnovers",
    "sacks_allowed",
    "points_allowed",
    "pass_yards_against",
    "rush_yards_against",
    "avg_pass_completion_against",
    "avg_rush_against",
  ].includes(key);
}

function clampNumber(value, min, max) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Math.max(min, Math.min(max, Number(value)));
}

function formatMetricValue(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const num = Number(value);
  if (Number.isInteger(num)) return `${num}`;
  return num.toFixed(1);
}

function computeQbrApprox(totals, passerRating) {
  if (!totals) return null;
  const passYds = totals.passing_yards || 0;
  const rushYds = totals.rushing_yards || 0;
  const passTds = totals.passing_tds || 0;
  const rushTds = totals.rushing_tds || 0;
  const ints = totals.interceptions || 0;
  const base = passerRating != null ? (passerRating / 158.3) * 100 : null;
  const volume =
    passYds / 25 + rushYds / 10 + (passTds + rushTds) * 2.5 - ints * 3;
  const blended = base != null ? base * 0.7 + volume * 0.3 : volume;
  return clampNumber(Math.round(blended), 0, 100);
}

function computePasserRating(stats) {
  if (!stats) return null;
  const attempts = stats.passing_attempts || 0;
  const completions = stats.passing_completions || 0;
  const passingYards = stats.passing_yards || 0;
  const passingTds = stats.passing_tds || 0;
  const interceptions = stats.interceptions || 0;
  if (!attempts) return null;
  const completionRatio = completions / attempts;
  const a = Math.min(Math.max(((completionRatio * 100) - 30) / 20, 0), 2.375);
  const b = Math.min(Math.max(((passingYards / attempts) - 3) / 4, 0), 2.375);
  const c = Math.min(Math.max(((passingTds / attempts) * 20), 0), 2.375);
  const d = Math.min(Math.max(2.375 - ((interceptions / attempts) * 25), 0), 2.375);
  return Number((((a + b + c + d) / 6) * 100).toFixed(1));
}
function buildAdvancedMetrics(
  totals,
  position,
  teamStats,
  teamRanks,
  teamRankCount,
  teamAbbr,
  positionRank,
  positionRankCount,
  weeklyCount
) {
  if (!totals) {
    return { title: "No stats available", metrics: [], rankSummary: null, strengths: [], weaknesses: [] };
  }
  const base = getPositionBase(position);
  let metrics = [];
  let title = "Advanced Metrics";
  const fallbackGames =
    totals.passing_yards ||
    totals.rushing_yards ||
    totals.receiving_yards ||
    totals.tackles ||
    totals.sacks ||
    totals.interceptions ||
    totals.tackles_for_loss ||
    totals.passes_defended ||
    totals.forced_fumbles
      ? 17
      : 0;
  const games = totals.games || weeklyCount || fallbackGames;
  const passAttempts = totals.passing_attempts || 0;
  const passCompletions = totals.passing_completions || 0;
  const rushAttempts = totals.rushing_attempts || 0;
  const recTargets = totals.receiving_targets || 0;
  const passerRating = computePasserRating(totals);
  const fgMade = totals.field_goals_made || 0;
  const fgMissedRaw = totals.field_goals_missed || 0;
  const fgAttemptsRaw = totals.field_goals_attempted || 0;
  const fgAttempts =
    fgAttemptsRaw ||
    (fgMade || fgMissedRaw ? fgMade + fgMissedRaw : 0);
  const fgMissed = Math.max(fgAttempts - fgMade, 0);

  const fgRangeAttempts =
    (totals.field_goals_attempted_0_19 || 0) +
    (totals.field_goals_attempted_20_29 || 0) +
    (totals.field_goals_attempted_30_39 || 0) +
    (totals.field_goals_attempted_40_49 || 0) +
    (totals.field_goals_attempted_50_59 || 0) +
    (totals.field_goals_attempted_60_plus || 0);
  const inferredLongFg = (() => {
    if (totals.field_goals_attempted_60_plus) return 60;
    if (totals.field_goals_attempted_50_59) return 59;
    if (totals.field_goals_attempted_40_49) return 49;
    if (totals.field_goals_attempted_30_39) return 39;
    if (totals.field_goals_attempted_20_29) return 29;
    if (totals.field_goals_attempted_0_19) return 19;
    return 0;
  })();

  const derived = {
    completion_pct: passAttempts ? (passCompletions / passAttempts) * 100 : 0,
    yards_per_attempt: passAttempts ? totals.passing_yards / passAttempts : 0,
    passing_yards_per_game: games ? totals.passing_yards / games : 0,
    rushing_yards_per_game: games ? totals.rushing_yards / games : 0,
    receiving_yards_per_game: games ? totals.receiving_yards / games : 0,
    yards_per_carry: rushAttempts ? totals.rushing_yards / rushAttempts : 0,
    yards_per_target: recTargets ? totals.receiving_yards / recTargets : 0,
    yards_per_reception: totals.receptions ? totals.receiving_yards / totals.receptions : 0,
    catch_rate: recTargets ? (totals.receptions / recTargets) * 100 : 0,
    tackles_per_game: games ? totals.tackles / games : 0,
    sacks_per_game: games ? totals.sacks / games : 0,
    interceptions_per_game: games ? totals.interceptions / games : 0,
    tackles_for_loss_per_game: games ? totals.tackles_for_loss / games : 0,
    passes_defended_per_game: games ? totals.passes_defended / games : 0,
    forced_fumbles_per_game: games ? totals.forced_fumbles / games : 0,
    qb_hits_per_game: games ? totals.qb_hits / games : 0,
    sacks_allowed_per_game: games ? totals.sacks_allowed / games : 0,
    qbr_approx: computeQbrApprox(totals, passerRating) || 0,
    passer_rating: passerRating || 0,
    punts: totals.punts || 0,
    punt_yards: totals.punt_yards || 0,
    punts_inside_20: totals.punts_inside_20 || 0,
    long_punt: totals.long_punt || 0,
    punting_avg: totals.punts ? totals.punt_yards / totals.punts : 0,
    field_goals_made: fgMade,
    field_goals_attempted: fgAttempts,
    field_goals_missed: fgMissed,
    field_goal_pct: fgAttempts ? (fgMade / fgAttempts) * 100 : 0,
    extra_points_made: totals.extra_points_made || 0,
    extra_points_attempted:
      totals.extra_points_attempted || totals.extra_points_made || 0,
    field_goals_long:
      totals.field_goals_long ||
      (fgRangeAttempts ? inferredLongFg : 0),
    field_goal_0_19_pct:
      totals.field_goals_attempted_0_19
        ? (totals.field_goals_made_0_19 / totals.field_goals_attempted_0_19) * 100
        : 0,
    field_goal_20_29_pct:
      totals.field_goals_attempted_20_29
        ? (totals.field_goals_made_20_29 / totals.field_goals_attempted_20_29) * 100
        : 0,
    field_goal_30_39_pct:
      totals.field_goals_attempted_30_39
        ? (totals.field_goals_made_30_39 / totals.field_goals_attempted_30_39) * 100
        : 0,
    field_goal_40_49_pct:
      totals.field_goals_attempted_40_49
        ? (totals.field_goals_made_40_49 / totals.field_goals_attempted_40_49) * 100
        : 0,
    field_goal_50_59_pct:
      totals.field_goals_attempted_50_59
        ? (totals.field_goals_made_50_59 / totals.field_goals_attempted_50_59) * 100
        : 0,
    field_goal_60_plus_pct:
      totals.field_goals_attempted_60_plus
        ? (totals.field_goals_made_60_plus / totals.field_goals_attempted_60_plus) * 100
        : 0,
  };

  if (base === "QB") {
    title = "QB Production";
    metrics = [
      { key: "completion_pct", label: "Completion %" },
      { key: "yards_per_attempt", label: "Yds/Att" },
      { key: "passing_yards_per_game", label: "Pass Yds/G" },
      { key: "passer_rating", label: "Passer Rating" },
      { key: "qbr_approx", label: "QBR (Approx)" },
      { key: "passing_attempts", label: "Pass Att" },
      { key: "rushing_attempts", label: "Rush Att" },
      { key: "yards_per_carry", label: "Rush Yds/Att" },
    ];
  } else if (base === "FB") {
    title = "Fullback Output";
    metrics = [
      { key: "rushing_attempts", label: "Rush Att" },
      { key: "rushing_yards_per_game", label: "Rush Yds/G" },
      { key: "receptions", label: "Receptions" },
      { key: "receiving_yards_per_game", label: "Rec Yds/G" },
      { key: "yards_per_carry", label: "Yds/Carry" },
      { key: "yards_per_reception", label: "Yds/Rec" },
    ];
  } else if (base === "RB" || base === "HB") {
    title = "RB Production";
    metrics = [
      { key: "rushing_attempts", label: "Rush Att" },
      { key: "yards_per_carry", label: "Yds/Carry" },
      { key: "rushing_yards_per_game", label: "Rush Yds/G" },
      { key: "receiving_targets", label: "Targets" },
      { key: "catch_rate", label: "Catch %" },
      { key: "receiving_yards_per_game", label: "Rec Yds/G" },
    ];
  } else if (base === "WR" || base === "TE") {
    title = "Receiving Impact";
    metrics = [
      { key: "receiving_targets", label: "Targets" },
      { key: "catch_rate", label: "Catch %" },
      { key: "yards_per_target", label: "Yds/Target" },
      { key: "yards_per_reception", label: "Yds/Rec" },
      { key: "receiving_yards_per_game", label: "Rec Yds/G" },
    ];
  } else if (["OL", "C", "G", "T", "OG", "OT"].includes(base)) {
    title = "Line Impact";
    metrics = [
      { key: "sacks_allowed_per_game", label: "Sacks Allowed/G" },
      { key: "qb_hits_per_game", label: "QB Hits/G" },
      { key: "pass_block_score", label: "Pass Block Score" },
      { key: "run_block_score", label: "Run Block Score" },
      { key: "line_score", label: "Line Score" },
    ];
    if (teamStats?.rushing_yards != null) {
      metrics.push({ key: "team_rush_ypg", label: "Team Rush Yds/G" });
    }
    if (teamStats?.passing_yards != null) {
      metrics.push({ key: "team_pass_ypg", label: "Team Pass Yds/G" });
    }
  } else if (["CB", "FS", "SS", "DB", "LB", "DE", "DT", "DL"].includes(base)) {
    title = "Defensive Production";
    metrics = [
      { key: "tackles_per_game", label: "Tackles/G" },
      { key: "sacks_per_game", label: "Sacks/G" },
      { key: "interceptions_per_game", label: "INT/G" },
      { key: "tackles_for_loss_per_game", label: "TFL/G" },
      { key: "passes_defended_per_game", label: "Pass Def/G" },
      { key: "forced_fumbles_per_game", label: "Forced Fum/G" },
    ];
  } else if (base === "K") {
    title = "Kicking Output";
    const showRangeSplits = fgRangeAttempts > 0;
    metrics = [
      { key: "field_goal_pct", label: "FG %" },
      { key: "field_goals_attempted", label: "FG Att" },
      { key: "field_goals_made", label: "FG Made" },
      { key: "field_goals_missed", label: "FG Missed" },
      { key: "field_goals_long", label: "Long FG" },
      { key: "extra_points_made", label: "XP Made" },
      { key: "extra_points_attempted", label: "XP Att" },
    ];
    if (showRangeSplits) {
      metrics.push(
        { key: "field_goal_0_19_pct", label: "FG % 0-19" },
        { key: "field_goal_20_29_pct", label: "FG % 20-29" },
        { key: "field_goal_30_39_pct", label: "FG % 30-39" },
        { key: "field_goal_40_49_pct", label: "FG % 40-49" },
        { key: "field_goal_50_59_pct", label: "FG % 50-59" },
        { key: "field_goal_60_plus_pct", label: "FG % 60+" }
      );
    }
  } else if (base === "P") {
    title = "Punting Output";
    metrics = [
      { key: "punting_avg", label: "Avg Punt" },
      { key: "punts", label: "Punts" },
      { key: "punt_yards", label: "Punt Yards" },
      { key: "punts_inside_20", label: "Inside 20" },
      { key: "long_punt", label: "Long Punt" },
    ];
  } else {
    title = "Position Benchmarks";
    metrics = [
      { key: "passing_yards", label: "Passing Yards" },
      { key: "rushing_yards", label: "Rushing Yards" },
      { key: "receiving_yards", label: "Receiving Yards" },
      { key: "tackles", label: "Tackles" },
    ];
  }

  const mapped = metrics.map((m) => {
    let value = totals[m.key];
    if (m.key === "team_rush_ypg") value = teamStats?.rushing_yards ?? 0;
    if (m.key === "team_pass_ypg") value = teamStats?.passing_yards ?? 0;
    if (derived[m.key] != null) value = derived[m.key];
    if (m.key === "pass_block_score") {
      const passRank = teamRanks?.passing_yards?.get(teamAbbr) || null;
      value = rankToScore(passRank, teamRankCount);
    }
    if (m.key === "run_block_score") {
      const rushRank = teamRanks?.rushing_yards?.get(teamAbbr) || null;
      value = rankToScore(rushRank, teamRankCount);
    }
    if (m.key === "line_score") {
      const passRank = teamRanks?.passing_yards?.get(teamAbbr) || null;
      const rushRank = teamRanks?.rushing_yards?.get(teamAbbr) || null;
      const passScore = rankToScore(passRank, teamRankCount);
      const rushScore = rankToScore(rushRank, teamRankCount);
      value = Math.round((passScore + rushScore) / 2);
    }
    if (value == null) value = 0;
    return {
      label: m.label,
      key: m.key,
      value: Number.isNaN(Number(value)) ? 0 : Number(value),
      percent: toPercent(value, STAT_MAX[m.key] || 100),
    };
  });

  const sortedByStrength = mapped.slice().sort((a, b) => (b.percent || 0) - (a.percent || 0));
  const sortedByWeakness = mapped.slice().sort((a, b) => (a.percent || 0) - (b.percent || 0));
  const strengthHints = [];
  const weaknessHints = [];
  if (base === "QB" && passAttempts > 0) {
    const intRate = totals.interceptions ? totals.interceptions / passAttempts : 0;
    const tdRate = totals.passing_tds ? totals.passing_tds / passAttempts : 0;
    if (intRate >= 0.03) weaknessHints.push("Turnover prone");
    if (intRate <= 0.02) strengthHints.push("Protects the ball");
    if (tdRate >= 0.05) strengthHints.push("High TD rate");
    if (tdRate <= 0.03) weaknessHints.push("Low TD rate");
  }
  sortedByStrength.forEach((m) => {
    const descriptor = METRIC_DESCRIPTORS[m.key];
    if (descriptor?.strength) strengthHints.push(descriptor.strength);
    else strengthHints.push(m.label);
  });
  sortedByWeakness.forEach((m) => {
    const descriptor = METRIC_DESCRIPTORS[m.key];
    if (descriptor?.weakness) weaknessHints.push(descriptor.weakness);
    else weaknessHints.push(m.label);
  });
  const strengths = Array.from(new Set(strengthHints)).slice(0, 2);
  const weaknesses = Array.from(new Set(weaknessHints)).slice(0, 2);
  const rankSummary =
    positionRank && positionRankCount
      ? `#${positionRank} of ${positionRankCount}`
      : null;

  return { title, metrics: mapped, rankSummary, strengths, weaknesses };
}



function buildPvpMetrics(position) {
  const base = getPositionBase(position);
  if (base === "QB") {
    return [
      { key: "passing_yards", label: "Passing Yards" },
      { key: "passing_tds", label: "Passing TDs" },
      { key: "interceptions", label: "INTs" },
      { key: "rushing_tds", label: "Rush TDs" },
      { key: "total_tds", label: "Total TDs" },
      { key: "turnovers", label: "Fumbles + INTs" },
      { key: "completion_pct", label: "Comp %" },
      { key: "passer_rating", label: "Passer Rating" },
      { key: "position_rank", label: "QB Rank (QB1-3)" },
    ];
  }
  if (base === "RB" || base === "HB" || base === "FB") {
    return [
      { key: "rushing_yards", label: "Rushing Yards" },
      { key: "rushing_tds", label: "Rushing TDs" },
      { key: "receptions", label: "Receptions" },
      { key: "position_rank", label: "Pos Rank" },
    ];
  }
  if (base === "P") {
    return [
      { key: "punting_avg", label: "Avg Punt" },
      { key: "punts", label: "Punts" },
      { key: "punts_inside_20", label: "Inside 20" },
      { key: "long_punt", label: "Long Punt" },
      { key: "position_rank", label: "Pos Rank" },
    ];
  }
  if (base === "WR" || base === "TE") {
    return [
      { key: "receiving_yards", label: "Receiving Yards" },
      { key: "receptions", label: "Receptions" },
      { key: "receiving_tds", label: "Receiving TDs" },
      { key: "position_rank", label: "Pos Rank" },
    ];
  }
  if (["OL", "C", "G", "T", "OG", "OT"].includes(base)) {
    return [
      { key: "pass_block_score", label: "Pass Block Score" },
      { key: "run_block_score", label: "Run Block Score" },
      { key: "line_score", label: "Line Score" },
      { key: "sacks_allowed", label: "Sacks Allowed" },
      { key: "qb_hits", label: "QB Hits" },
      { key: "team_pass_ypg", label: "Team Pass Yds/G" },
      { key: "team_rush_ypg", label: "Team Rush Yds/G" },
      { key: "position_rank", label: "Pos Rank" },
    ];
  }
  if (base === "K") {
    return [
      { key: "field_goal_pct", label: "FG %" },
      { key: "field_goals_attempted", label: "FG Att" },
      { key: "field_goals_made", label: "FG Made" },
      { key: "field_goals_long", label: "Long FG" },
      { key: "position_rank", label: "Pos Rank" },
    ];
  }
  return [
    { key: "tackles", label: "Tackles" },
    { key: "sacks", label: "Sacks" },
    { key: "interceptions", label: "INTs" },
    { key: "position_rank", label: "Pos Rank" },
  ];
}

function buildTeamComparisonRows(leftStats, rightStats, ranks, teamCount) {
  if (!leftStats || !rightStats) return [];
  return [
    {
      label: "Points per Game",
      key: "points",
      left: leftStats.points,
      right: rightStats.points,
      ranks,
      count: teamCount || null,
    },
    {
      label: "Passing Yards",
      key: "passing_yards",
      left: leftStats.passing_yards,
      right: rightStats.passing_yards,
      ranks,
      count: teamCount || null,
    },
    {
      label: "Rushing Yards",
      key: "rushing_yards",
      left: leftStats.rushing_yards,
      right: rightStats.rushing_yards,
      ranks,
      count: teamCount || null,
    },
    {
      label: "Total Yards",
      key: "total_yards",
      left: leftStats.total_yards,
      right: rightStats.total_yards,
      ranks,
      count: teamCount || null,
    },
  ];
}

function buildDefenseComparisonRows(leftDefense, rightDefense, ranks, teamCount) {
  if (!leftDefense || !rightDefense) return [];
  const leftStats = leftDefense.defense_per_game || {};
  const rightStats = rightDefense.defense_per_game || {};
  const leftTotals = leftDefense.defense_totals || {};
  const rightTotals = rightDefense.defense_totals || {};
  return [
    {
      label: "Points Allowed",
      key: "points_allowed",
      left: leftStats.points_allowed,
      right: rightStats.points_allowed,
      ranks,
      count: teamCount || null,
    },
    {
      label: "Pass Yards Against",
      key: "pass_yards_against",
      left: leftStats.pass_yards_against,
      right: rightStats.pass_yards_against,
      ranks,
      count: teamCount || null,
    },
    {
      label: "Rush Yards Against",
      key: "rush_yards_against",
      left: leftStats.rush_yards_against,
      right: rightStats.rush_yards_against,
      ranks,
      count: teamCount || null,
    },
    {
      label: "Total Yards Against",
      key: "total_yards_against",
      left: leftStats.total_yards_against,
      right: rightStats.total_yards_against,
      ranks,
      count: teamCount || null,
    },
    {
      label: "Avg Pass/Comp Against",
      key: "avg_pass_completion_against",
      left: leftStats.avg_pass_completion_against,
      right: rightStats.avg_pass_completion_against,
      ranks,
      count: teamCount || null,
    },
    {
      label: "Avg Rush Against",
      key: "avg_rush_against",
      left: leftStats.avg_rush_against,
      right: rightStats.avg_rush_against,
      ranks,
      count: teamCount || null,
    },
    {
      label: "Turnovers Forced",
      key: "turnovers_forced",
      left: leftStats.turnovers_forced,
      right: rightStats.turnovers_forced,
      ranks,
      count: teamCount || null,
    },
    {
      label: "Interceptions",
      key: "interceptions",
      left: leftTotals.interceptions,
      right: rightTotals.interceptions,
      ranks,
      count: teamCount || null,
    },
    {
      label: "Sacks",
      key: "sacks",
      left: leftStats.sacks,
      right: rightStats.sacks,
      ranks,
      count: teamCount || null,
    },
    {
      label: "Tackles for Loss",
      key: "tackles_for_loss",
      left: leftStats.tackles_for_loss,
      right: rightStats.tackles_for_loss,
      ranks,
      count: teamCount || null,
    },
    {
      label: "Passes Defended",
      key: "passes_defended",
      left: leftStats.passes_defended,
      right: rightStats.passes_defended,
      ranks,
      count: teamCount || null,
    },
    {
      label: "Forced Fumbles",
      key: "forced_fumbles",
      left: leftTotals.forced_fumbles,
      right: rightTotals.forced_fumbles,
      ranks,
      count: teamCount || null,
    },
    {
      label: "TDs Allowed",
      key: "touchdowns_allowed",
      left: leftStats.touchdowns_allowed,
      right: rightStats.touchdowns_allowed,
      ranks,
      count: teamCount || null,
    },
  ];
}

function pickTeamProfile(entries, maxItems, direction) {
  if (!entries.length) return [];
  const sorted = entries
    .filter((row) => row.rank != null)
    .slice()
    .sort((a, b) => (direction === "best" ? a.rank - b.rank : b.rank - a.rank));
  return sorted.slice(0, maxItems);
}

export default function DepthChartPage() {
  const [tab, setTab] = useState("OFF");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [detailTab, setDetailTab] = useState("overview");
  const [compareTargetId, setCompareTargetId] = useState(null);
  const [season, setSeason] = useState(getDefaultSeason());

  // Team abbreviation (default KC)
  const [teamAbbr, setTeamAbbr] = useState("KC");
  const [compareTeamAbbr, setCompareTeamAbbr] = useState("");
  // List of teams
  const [teams, setTeams] = useState([]);
  // Roster keyed by OFF/DEF/ST
  const [roster, setRoster] = useState({ OFF: [], DEF: [], ST: [] });
  const [rosterError, setRosterError] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [playerStats, setPlayerStats] = useState(null);
  const [playerWeekly, setPlayerWeekly] = useState([]);
  const [compareStats, setCompareStats] = useState(null);
  const [compareCandidates, setCompareCandidates] = useState([]);
  const [positionRanks, setPositionRanks] = useState(new Map());
  const [positionRankCount, setPositionRankCount] = useState(0);
  const [teamStats, setTeamStats] = useState(null);
  const [leagueStats, setLeagueStats] = useState(null);
  const [teamRanks, setTeamRanks] = useState({});
  const [teamRankCount, setTeamRankCount] = useState(0);
  const [teamSummaryList, setTeamSummaryList] = useState([]);
  const [defenseByTeam, setDefenseByTeam] = useState({});
  const [defenseRanks, setDefenseRanks] = useState({});
  const [defenseRankCount, setDefenseRankCount] = useState(0);
  const [starterRanks, setStarterRanks] = useState({});
  const [starterRankCount, setStarterRankCount] = useState(0);

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
      passing_attempts: 0,
      passing_completions: 0,
      rushing_yards: 0,
      rushing_tds: 0,
      rushing_attempts: 0,
      receiving_yards: 0,
      receiving_tds: 0,
      receptions: 0,
      receiving_targets: 0,
      tackles: 0,
      sacks: 0,
      sacks_allowed: 0,
      qb_hits: 0,
      tackles_for_loss: 0,
      passes_defended: 0,
      forced_fumbles: 0,
      fumbles_recovered: 0,
      points: 0,
      punts: 0,
      punt_yards: 0,
      punts_inside_20: 0,
      long_punt: 0,
      field_goals_made_0_19: 0,
      field_goals_attempted_0_19: 0,
      field_goals_made_20_29: 0,
      field_goals_attempted_20_29: 0,
      field_goals_made_30_39: 0,
      field_goals_attempted_30_39: 0,
      field_goals_made_40_49: 0,
      field_goals_attempted_40_49: 0,
      field_goals_made_50_59: 0,
      field_goals_attempted_50_59: 0,
      field_goals_made_60_plus: 0,
      field_goals_attempted_60_plus: 0,
      field_goals_made: 0,
      field_goals_attempted: 0,
      field_goals_long: 0,
      extra_points_made: 0,
      extra_points_attempted: 0,
      field_goals_made_0_19: 0,
      field_goals_attempted_0_19: 0,
      field_goals_made_20_29: 0,
      field_goals_attempted_20_29: 0,
      field_goals_made_30_39: 0,
      field_goals_attempted_30_39: 0,
      field_goals_made_40_49: 0,
      field_goals_attempted_40_49: 0,
      field_goals_made_50_59: 0,
      field_goals_attempted_50_59: 0,
      field_goals_made_60_plus: 0,
      field_goals_attempted_60_plus: 0,
      games: 0,
    };
    (weeklyRows || []).forEach((row) => {
      if (!row) return;
      Object.keys(totals).forEach((key) => {
        const val = row[key];
        if (val == null || Number.isNaN(Number(val))) return;
        totals[key] += Number(val);
      });
    });
    totals.games = Math.max(totals.games, (weeklyRows || []).length);
    return totals;
  }

  // Fetch list of teams
  useEffect(() => {
    async function loadTeams() {
      try {
        const teamList = await apiGet("/teams/db");
        setTeams(teamList || []);
      } catch (err) {
        console.warn("Failed to load teams", err);
      }
    }
    loadTeams();
  }, []);

  useEffect(() => {
    if (!teams.length) return;
    if (compareTeamAbbr && compareTeamAbbr !== teamAbbr) return;
    const next = teams.find((t) => t.abbreviation && t.abbreviation !== teamAbbr);
    if (next?.abbreviation) setCompareTeamAbbr(next.abbreviation);
  }, [teams, teamAbbr, compareTeamAbbr]);

  // Fetch roster on team change
  useEffect(() => {
    async function loadRoster() {
      if (!teamAbbr) return;
      try {
        setRosterLoading(true);
        setRosterError(null);
        const players = await apiGet(`/roster/${teamAbbr}`);
        // ... (this section is unchanged)
        const off = {};
        const def = {};
        const st = {};
        function pushTo(bucket, pos, player) {
          if (!bucket[pos]) bucket[pos] = [];
          bucket[pos].push(player);
        }

        (players || []).forEach((p) => {
          const name =
            p.full_name ||
            `${p.first_name || ""} ${p.last_name || ""}`.trim();
          const roleInfo = resolvePositionRole(p);
          const sourceText = [
            p.position,
            p.raw?.position,
            p.raw?.position_abbreviation,
            p.raw?.depth_chart_position,
          ]
            .filter(Boolean)
            .join(" ")
            .toUpperCase();
          let base = roleInfo.base || normalizePosition(p.position);
          if (["T", "G", "C", "OL", "OT", "OG"].includes(base)) {
            if (/\bDT\b|\bDE\b|\bDL\b|\bNT\b|\bEDGE\b|DEFENSIVE/.test(sourceText)) {
              base = "DL";
            }
          }
          if (["DL", "DE", "DT", "NT", "EDGE"].includes(base)) {
            if (/\bLT\b|\bRT\b|\bLG\b|\bRG\b|\bC\b|\bOL\b|OFFENSIVE/.test(sourceText)) {
              base = "OL";
            }
          }
          const rawId = p.PlayerID ?? p.bdlId;
          const playerId =
            rawId != null && !Number.isNaN(Number(rawId)) ? Number(rawId) : null;
          const entry = {
            position: "",
            name,
            number: p.raw?.jersey_number || p.jersey_number || "",
            team: teamAbbr,
            playerId,
            depthLabel: "",
            roleLabel: roleInfo.role || "",
          };
          if (
            [
              "QB",
              "RB",
              "HB",
              "WR",
              "TE",
              "FB",
              "C",
              "G",
              "T",
              "OL",
              "OG",
              "OT",
            ].includes(base)
          ) {
            pushTo(off, base, entry);
          } else if (
            [
              "DL",
              "DE",
              "DT",
              "NT",
              "EDGE",
              "LB",
              "OLB",
              "ILB",
              "MLB",
              "DB",
              "CB",
              "FS",
              "SS",
              "S",
            ].includes(base)
          ) {
            pushTo(def, base, entry);
          } else if (["K", "P", "LS", "KR", "PR"].includes(base)) {
            pushTo(st, base, entry);
          }
        });
        const offSlots = [];
        if (off.QB)
          off.QB.forEach((p, idx) =>
            offSlots.push({
              ...p,
              position: `QB${idx + 1}`,
              depthLabel: idx === 0 ? "Starter" : `QB${idx + 1}`,
            })
          );
        if (off.RB)
          off.RB.forEach((p, idx) =>
            offSlots.push({
              ...p,
              position: `RB${idx + 1}`,
              depthLabel:
                idx === 0
                  ? `Starter${p.roleLabel ? ` • ${p.roleLabel}` : ""}`
                  : `RB${idx + 1}${p.roleLabel ? ` • ${p.roleLabel}` : ""}`,
            })
          );
        if (off.HB && !off.RB)
          off.HB.forEach((p, idx) =>
            offSlots.push({
              ...p,
              position: `HB${idx + 1}`,
              depthLabel:
                idx === 0
                  ? `Starter${p.roleLabel ? ` • ${p.roleLabel}` : ""}`
                  : `HB${idx + 1}${p.roleLabel ? ` • ${p.roleLabel}` : ""}`,
            })
          );
        if (off.WR)
          off.WR.forEach((p, idx) =>
            offSlots.push({
              ...p,
              position: `WR${idx + 1}`,
              depthLabel:
                idx === 0
                  ? `Starter${p.roleLabel ? ` • ${p.roleLabel}` : ""}`
                  : `WR${idx + 1}${p.roleLabel ? ` • ${p.roleLabel}` : ""}`,
            })
          );
        if (off.TE)
          off.TE.forEach((p, idx) =>
            offSlots.push({
              ...p,
              position: `TE${idx + 1}`,
              depthLabel:
                idx === 0
                  ? `Starter${p.roleLabel ? ` • ${p.roleLabel}` : ""}`
                  : `TE${idx + 1}${p.roleLabel ? ` • ${p.roleLabel}` : ""}`,
            })
          );
        if (off.C)
          off.C.forEach((p) =>
            offSlots.push({ ...p, position: "C", depthLabel: "Starter" })
          );
        if (off.G)
          off.G.forEach((p, idx) =>
            offSlots.push({
              ...p,
              position: p.roleLabel || (idx === 0 ? "LG" : "RG"),
              depthLabel: "Starter",
            })
          );
        if (off.T)
          off.T.forEach((p, idx) =>
            offSlots.push({
              ...p,
              position: p.roleLabel || (idx === 0 ? "LT" : "RT"),
              depthLabel: "Starter",
            })
          );

        const defSlots = [];
        if (def.CB)
          def.CB.forEach((p, idx) =>
            defSlots.push({
              ...p,
              position: `CB${idx + 1}`,
              depthLabel:
                idx === 0
                  ? `Starter${p.roleLabel ? ` • ${p.roleLabel}` : ""}`
                  : `CB${idx + 1}${p.roleLabel ? ` • ${p.roleLabel}` : ""}`,
            })
          );
        if (def.FS)
          def.FS.forEach((p) =>
            defSlots.push({ ...p, position: "FS", depthLabel: "Starter" })
          );
        if (def.SS)
          def.SS.forEach((p) =>
            defSlots.push({ ...p, position: "SS", depthLabel: "Starter" })
          );
        const lbBuckets = [].concat(
          def.OLB || [],
          def.ILB || [],
          def.MLB || [],
          def.LB || []
        );
        lbBuckets.forEach((p, idx) =>
          defSlots.push({
            ...p,
            position: p.roleLabel || ["OLB", "ILB", "MLB", "LB"][idx] || "LB",
            depthLabel:
              idx === 0
                ? `Starter${p.roleLabel ? ` • ${p.roleLabel}` : ""}`
                : `LB${idx + 1}${p.roleLabel ? ` • ${p.roleLabel}` : ""}`,
          })
        );
        if (def.DL)
          def.DL.forEach((p, idx) =>
            defSlots.push({
              ...p,
              position: `DL${idx + 1}`,
              depthLabel:
                idx === 0
                  ? `Starter${p.roleLabel ? ` • ${p.roleLabel}` : ""}`
                  : `DL${idx + 1}${p.roleLabel ? ` • ${p.roleLabel}` : ""}`,
            })
          );
        if (def.DE)
          def.DE.forEach((p, idx) =>
            defSlots.push({
              ...p,
              position: `DE${idx + 1}`,
              depthLabel:
                idx === 0
                  ? `Starter${p.roleLabel ? ` • ${p.roleLabel}` : ""}`
                  : `DE${idx + 1}${p.roleLabel ? ` • ${p.roleLabel}` : ""}`,
            })
          );
        if (def.DT)
          def.DT.forEach((p, idx) =>
            defSlots.push({
              ...p,
              position: `DT${idx + 1}`,
              depthLabel:
                idx === 0
                  ? `Starter${p.roleLabel ? ` • ${p.roleLabel}` : ""}`
                  : `DT${idx + 1}${p.roleLabel ? ` • ${p.roleLabel}` : ""}`,
            })
          );

        const stSlots = [];
        if (st.K)
          st.K.forEach((p, idx) =>
            stSlots.push({
              ...p,
              position: "K",
              depthLabel: idx === 0 ? "Starter" : `K${idx + 1}`,
            })
          );
        if (st.P)
          st.P.forEach((p, idx) =>
            stSlots.push({
              ...p,
              position: "P",
              depthLabel: idx === 0 ? "Starter" : `P${idx + 1}`,
            })
          );
        if (st.LS)
          st.LS.forEach((p) =>
            stSlots.push({ ...p, position: "LS", depthLabel: "Starter" })
          );
        if (st.KR)
          st.KR.forEach((p) =>
            stSlots.push({ ...p, position: "KR", depthLabel: "Return" })
          );
        if (st.PR)
          st.PR.forEach((p) =>
            stSlots.push({ ...p, position: "PR", depthLabel: "Return" })
          );

        if (!players || players.length === 0) {
          setRosterError(`No roster data found for ${teamAbbr}.`);
          setRoster({ OFF: [], DEF: [], ST: [] });
        } else if (
          offSlots.length === 0 &&
          defSlots.length === 0 &&
          stSlots.length === 0
        ) {
          setRosterError(`Roster loaded for ${teamAbbr}, but no positions were mapped.`);
          setRoster({ OFF: [], DEF: [], ST: [] });
        } else {
          setRoster({ OFF: offSlots, DEF: defSlots, ST: stSlots });
        }
      } catch (err) {
        console.warn("Failed to load roster", err);
        setRosterError(`Failed to load roster for ${teamAbbr}.`);
        setRoster({ OFF: [], DEF: [], ST: [] });
      } finally {
        setRosterLoading(false);
      }
    }
    loadRoster();
  }, [teamAbbr]);

  useEffect(() => {
    async function loadTeamStats() {
      if (!teamAbbr) return;
      try {
        const data = await apiGet(`/stats/team/${teamAbbr}`, { season });
        setTeamStats(data?.per_game || null);
        setLeagueStats(data?.league_avg || null);
      } catch (err) {
        console.warn("Failed to load team stats", err);
        setTeamStats(null);
        setLeagueStats(null);
      }
    }
    loadTeamStats();
  }, [teamAbbr, season]);

  useEffect(() => {
    async function loadTeamRanks() {
      try {
        const data = await apiGet("/stats/teams/summary", { season });
        const list = Array.isArray(data?.results) ? data.results : [];
        setTeamSummaryList(list);
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
          points: buildRankMap("points"),
          passing_yards: buildRankMap("passing_yards"),
          rushing_yards: buildRankMap("rushing_yards"),
          total_yards: buildRankMap("total_yards"),
        });
        setTeamRankCount(list.length);
      } catch (err) {
        console.warn("Failed to load team ranks", err);
        setTeamRanks({});
        setTeamRankCount(0);
      }
    }
    loadTeamRanks();
  }, [season]);

  useEffect(() => {
    async function loadDefenseStats() {
      try {
        const data = await apiGet("/stats/teams/defense", { season });
        const list = Array.isArray(data?.results) ? data.results : [];
        const byTeam = {};
        list.forEach((row) => {
          if (row?.team_abbr) byTeam[row.team_abbr] = row;
        });
        const rankKeys = [
          "points_allowed",
          "pass_yards_against",
          "rush_yards_against",
          "total_yards_against",
          "avg_pass_completion_against",
          "avg_rush_against",
          "turnovers_forced",
          "interceptions",
          "sacks",
          "tackles_for_loss",
          "passes_defended",
          "forced_fumbles",
          "touchdowns_allowed",
        ];
        const maps = {};
        rankKeys.forEach((key) => {
          const map = new Map();
          list.forEach((row) => {
            const rank = row?.defense_ranks?.[key];
            if (row?.team_abbr && rank != null) map.set(row.team_abbr, rank);
          });
          maps[key] = map;
        });
        setDefenseByTeam(byTeam);
        setDefenseRanks(maps);
        setDefenseRankCount(list.length);
      } catch (err) {
        console.warn("Failed to load defense stats", err);
        setDefenseByTeam({});
        setDefenseRanks({});
        setDefenseRankCount(0);
      }
    }
    loadDefenseStats();
  }, [season]);

  useEffect(() => {
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
        if (teams.length) count = Math.max(count, teams.length);
        setStarterRanks(nextRanks);
        setStarterRankCount(count);
      } catch (err) {
        console.warn("Failed to load starter ranks", err);
        setStarterRanks({});
        setStarterRankCount(0);
      }
    }
    loadStarterRanks();
  }, [season, teams]);

  useEffect(() => {
    async function loadPlayerStats() {
      const playerId = selectedPlayer?.playerId;
      if (!playerId) {
        setPlayerStats(null);
        setPlayerWeekly([]);
        return;
      }
      try {
        const data = await apiGet(`/stats/player/${playerId}`, { season });
        const weekly = Array.isArray(data?.weekly) ? data.weekly : [];
        const derivedTotals = buildTotalsFromWeekly(weekly);
        const mergedTotals = mergeDerivedTotals(data?.totals || {}, derivedTotals);
        setPlayerStats(mergedTotals);
        setPlayerWeekly(weekly);
        if (data?.season && data.season !== season) {
          setSeason(data.season);
        }
      } catch (err) {
        console.warn("Failed to load player stats", err);
        setPlayerStats(null);
        setPlayerWeekly([]);
      }
    }
    loadPlayerStats();
  }, [selectedPlayer?.playerId, season]);

  useEffect(() => {
    async function loadCompareCandidates() {
      if (!selectedPlayer?.position) {
        setCompareCandidates([]);
        return;
      }
      const base = getPositionBase(selectedPlayer.position);
      const rankKey = getPositionRankKey(selectedPlayer.position);
      if (!rankKey) {
        setCompareCandidates([]);
        return;
      }
      const fetchList = async (positionKey) => {
        const data = await apiGet("/stats/players/position", {
          season,
          position: positionKey,
          all: 1,
          min_passing_yards: 500,
        });
        return Array.isArray(data?.results) ? data.results : [];
      };
      try {
        let results = await fetchList(rankKey);
        let usedPositionKey = rankKey;
        if (results.length < 2 && base && base !== rankKey) {
          const fallbackResults = await fetchList(base);
          if (fallbackResults.length > results.length) {
            results = fallbackResults;
            usedPositionKey = base;
          }
        }
        const rankMap = new Map();
        results.forEach((row) => {
          if (row?.player_id != null) {
            rankMap.set(Number(row.player_id), row.position_rank || null);
          }
        });
        setPositionRanks(rankMap);
        setPositionRankCount(results.length);
        const hasStats = (pos, totals) => {
          const keyBase = getPositionBase(pos);
          if (!totals) return false;
          if (keyBase === "QB") return (totals.passing_attempts || totals.passing_yards || totals.games || 0) > 0;
          if (["RB", "HB", "FB"].includes(keyBase)) {
            return (totals.rushing_attempts || totals.rushing_yards || totals.games || 0) > 0;
          }
          if (["WR", "TE"].includes(keyBase)) {
            return (totals.receiving_targets || totals.receiving_yards || totals.games || 0) > 0;
          }
          if (["CB", "FS", "SS", "S", "DB", "LB", "DE", "DT", "DL", "EDGE"].includes(keyBase)) {
            return (totals.tackles || totals.sacks || totals.games || 0) > 0;
          }
          return (totals.games || 0) > 0;
        };
        const mapped = results
          .filter((p) => p?.player_id)
          .map((p) => ({
            playerId: Number(p.player_id),
            name: p.name,
            team: p.team_abbr,
            number: p.jersey_number || "",
            position: usedPositionKey,
            depthLabel: base === "QB" && p.qb_depth ? `QB${p.qb_depth}` : "Starter",
            qbDepth: p.qb_depth || null,
            totals: p.totals || null,
            positionRank: p.position_rank || null,
          }))
          .filter((p) => p.playerId !== selectedPlayer?.playerId);
        const filtered = base === "QB" ? mapped.filter((p) => p.qbDepth) : mapped;
        const sorted = filtered.slice().sort((a, b) => {
          if (base === "QB") {
            const aRank = a.positionRank ?? Number.MAX_SAFE_INTEGER;
            const bRank = b.positionRank ?? Number.MAX_SAFE_INTEGER;
            if (aRank !== bRank) return aRank - bRank;
          }
          const aHas = hasStats(base, a.totals) ? 1 : 0;
          const bHas = hasStats(base, b.totals) ? 1 : 0;
          if (aHas !== bHas) return bHas - aHas;
          return (a.name || "").localeCompare(b.name || "");
        });
        setCompareCandidates(sorted);
      } catch (err) {
        console.warn("Failed to load comparison candidates", err);
        setCompareCandidates([]);
      }
    }
    loadCompareCandidates();
  }, [selectedPlayer?.position, selectedPlayer?.playerId, season]);

  const tabs = [
    { key: "OFF", label: "Offense" },
    { key: "DEF", label: "Defense" },
    { key: "ST", label: "Special Teams" },
  ];

  useEffect(() => {
    const first = roster[tab]?.[0];
    if (first) {
      setSelectedPlayer(first);
      setCompareTargetId(null);
      setDetailTab("overview");
    } else {
      setSelectedPlayer(null);
      setCompareTargetId(null);
    }
  }, [tab, roster]);

  useEffect(() => {
    setCompareTargetId(null);
  }, [selectedPlayer?.playerId]);

  const comparePool = useMemo(() => {
    if (!selectedPlayer) return [];
    return compareCandidates || [];
  }, [selectedPlayer, compareCandidates]);

  useEffect(() => {
    if (!selectedPlayer) return;
    if (comparePool.length === 0) {
      setCompareTargetId(null);
      return;
    }
    if (!comparePool.some((p) => p.playerId === compareTargetId)) {
      setCompareTargetId(comparePool[0]?.playerId || null);
    }
  }, [comparePool, selectedPlayer, compareTargetId]);

  const compareTarget = useMemo(() => {
    if (!compareTargetId) return null;
    return comparePool.find((p) => p.playerId === compareTargetId) || null;
  }, [compareTargetId, comparePool]);

  const teamStatsFor = useMemo(() => {
    const map = new Map();
    teamSummaryList.forEach((row) => {
      if (row?.team_abbr && row?.per_game) map.set(row.team_abbr, row.per_game);
    });
    return map;
  }, [teamSummaryList]);

  useEffect(() => {
    async function loadCompareStats() {
      const playerId = compareTarget?.playerId;
      if (!playerId) {
        setCompareStats(null);
        return;
      }
      try {
        const data = await apiGet(`/stats/player/${playerId}`, { season });
        const weekly = Array.isArray(data?.weekly) ? data.weekly : [];
        const derivedTotals = buildTotalsFromWeekly(weekly);
        const mergedTotals = mergeDerivedTotals(data?.totals || {}, derivedTotals);
        setCompareStats(mergedTotals);
        if (data?.season && data.season !== season) {
          setSeason(data.season);
        }
      } catch (err) {
        console.warn("Failed to load comparison stats", err);
        setCompareStats(null);
      }
    }
    loadCompareStats();
  }, [compareTarget?.playerId, season]);

  const advancedMetrics = useMemo(
    () =>
      buildAdvancedMetrics(
        playerStats,
        selectedPlayer?.position,
        teamStats,
        teamRanks,
        teamRankCount,
        teamAbbr,
        positionRanks.get(selectedPlayer?.playerId),
        positionRankCount,
        playerWeekly?.length || 0
      ),
    [
      playerStats,
      selectedPlayer?.position,
      teamStats,
      teamRanks,
      teamRankCount,
      teamAbbr,
      positionRanks,
      positionRankCount,
      selectedPlayer?.playerId,
      playerWeekly,
    ]
  );
  const teamSummaryMap = useMemo(() => {
    const map = new Map();
    (teamSummaryList || []).forEach((row) => {
      if (row?.team_abbr) map.set(row.team_abbr, row);
    });
    return map;
  }, [teamSummaryList]);

  const leftTeamSummary = teamSummaryMap.get(teamAbbr) || null;
  const rightTeamSummary = teamSummaryMap.get(compareTeamAbbr) || null;
  const leftDefense = defenseByTeam[teamAbbr] || null;
  const rightDefense = defenseByTeam[compareTeamAbbr] || null;

  const offenseComparison = useMemo(
    () =>
      buildTeamComparisonRows(
        leftTeamSummary?.per_game,
        rightTeamSummary?.per_game,
        teamRanks,
        teamRankCount
      ),
    [leftTeamSummary, rightTeamSummary, teamRanks, teamRankCount]
  );

  const defenseComparison = useMemo(
    () =>
      buildDefenseComparisonRows(
        leftDefense,
        rightDefense,
        defenseRanks,
        defenseRankCount
      ),
    [leftDefense, rightDefense, defenseRanks, defenseRankCount]
  );

  const teamProfiles = useMemo(() => {
    const offenseKeys = [
      { key: "points", label: "Points per Game" },
      { key: "passing_yards", label: "Pass Yards" },
      { key: "rushing_yards", label: "Rush Yards" },
      { key: "total_yards", label: "Total Yards" },
    ];
    const defenseKeys = [
      { key: "points_allowed", label: "Points Allowed" },
      { key: "pass_yards_against", label: "Pass Yds Against" },
      { key: "rush_yards_against", label: "Rush Yds Against" },
      { key: "total_yards_against", label: "Total Yds Against" },
      { key: "avg_pass_completion_against", label: "Avg Pass/Comp" },
      { key: "avg_rush_against", label: "Avg Rush" },
      { key: "turnovers_forced", label: "Turnovers Forced" },
      { key: "interceptions", label: "INTs" },
      { key: "sacks", label: "Sacks" },
      { key: "tackles_for_loss", label: "TFL" },
      { key: "passes_defended", label: "Passes Defended" },
      { key: "forced_fumbles", label: "Forced Fumbles" },
      { key: "touchdowns_allowed", label: "TDs Allowed" },
    ];
    const buildEntries = (team, keys, maps) =>
      keys.map((item) => ({
        label: item.label,
        rank: maps?.[item.key]?.get(team) || null,
      }));
    const offenseGroups = ["QB", "RB", "WR", "TE", "OL"];
    const defenseGroups = ["DL", "LB", "DB"];
    const groupEntries = (team, groups) =>
      groups.map((group) => ({
        label: group,
        rank: starterRanks?.[group]?.get(team) || null,
      }));

    const leftOffense = buildEntries(teamAbbr, offenseKeys, teamRanks);
    const rightOffense = buildEntries(compareTeamAbbr, offenseKeys, teamRanks);
    const leftDefenseRanks = buildEntries(teamAbbr, defenseKeys, defenseRanks);
    const rightDefenseRanks = buildEntries(compareTeamAbbr, defenseKeys, defenseRanks);
    const leftOffGroups = groupEntries(teamAbbr, offenseGroups);
    const rightOffGroups = groupEntries(compareTeamAbbr, offenseGroups);
    const leftDefGroups = groupEntries(teamAbbr, defenseGroups);
    const rightDefGroups = groupEntries(compareTeamAbbr, defenseGroups);
    const avgRank = (entries) => {
      const values = entries.map((e) => e.rank).filter((v) => v != null);
      if (!values.length) return null;
      return values.reduce((sum, v) => sum + v, 0) / values.length;
    };
    return {
      left: {
        offenseAvg: avgRank(leftOffense),
        defenseAvg: avgRank(leftDefenseRanks),
        offenseStrengths: pickTeamProfile(leftOffense, 2, "best"),
        offenseWeaknesses: pickTeamProfile(leftOffense, 2, "worst"),
        defenseStrengths: pickTeamProfile(leftDefenseRanks, 2, "best"),
        defenseWeaknesses: pickTeamProfile(leftDefenseRanks, 2, "worst"),
        offenseGroupStrengths: pickTeamProfile(leftOffGroups, 2, "best"),
        offenseGroupWeaknesses: pickTeamProfile(leftOffGroups, 2, "worst"),
        defenseGroupStrengths: pickTeamProfile(leftDefGroups, 2, "best"),
        defenseGroupWeaknesses: pickTeamProfile(leftDefGroups, 2, "worst"),
      },
      right: {
        offenseAvg: avgRank(rightOffense),
        defenseAvg: avgRank(rightDefenseRanks),
        offenseStrengths: pickTeamProfile(rightOffense, 2, "best"),
        offenseWeaknesses: pickTeamProfile(rightOffense, 2, "worst"),
        defenseStrengths: pickTeamProfile(rightDefenseRanks, 2, "best"),
        defenseWeaknesses: pickTeamProfile(rightDefenseRanks, 2, "worst"),
        offenseGroupStrengths: pickTeamProfile(rightOffGroups, 2, "best"),
        offenseGroupWeaknesses: pickTeamProfile(rightOffGroups, 2, "worst"),
        defenseGroupStrengths: pickTeamProfile(rightDefGroups, 2, "best"),
        defenseGroupWeaknesses: pickTeamProfile(rightDefGroups, 2, "worst"),
      },
    };
  }, [teamAbbr, compareTeamAbbr, teamRanks, defenseRanks, starterRanks]);

  const positionGroupRanks = useMemo(() => {
    const groups = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB"];
    return groups.map((group) => ({
      group,
      left: starterRanks?.[group]?.get(teamAbbr) || starterRankCount || null,
      right: starterRanks?.[group]?.get(compareTeamAbbr) || starterRankCount || null,
    }));
  }, [starterRanks, starterRankCount, teamAbbr, compareTeamAbbr]);
  const pvpMetrics = useMemo(
    () => buildPvpMetrics(selectedPlayer?.position),
    [selectedPlayer?.position]
  );
  const pvpRows = useMemo(() => {
    if (!selectedPlayer || !compareTarget) return [];
    const base = getPositionBase(selectedPlayer?.position);
    const passRank = teamRanks?.passing_yards;
    const rushRank = teamRanks?.rushing_yards;
    return pvpMetrics.map((metric) => {
      const buildValue = (stats, player) => {
        const teamPerGame = teamStatsFor.get(player?.team) || {};
        if (metric.key === "total_tds") {
          const pass = stats?.passing_tds || 0;
          const rush = stats?.rushing_tds || 0;
          const rec = stats?.receiving_tds || 0;
          return pass + rush + rec;
        }
        if (metric.key === "turnovers") {
          const ints = stats?.interceptions || 0;
          const fumbles = stats?.fumbles || stats?.fumbles_lost || 0;
          return ints + fumbles;
        }
        if (metric.key === "completion_pct") {
          const attempts = stats?.passing_attempts || 0;
          const completions = stats?.passing_completions || 0;
          if (attempts > 0) return (completions / attempts) * 100;
          return null;
        }
        if (metric.key === "passer_rating") {
          return stats?.passer_rating || stats?.qb_rating || computePasserRating(stats);
        }
        if (metric.key === "field_goal_pct") {
          const made = stats?.field_goals_made || 0;
          const missed = stats?.field_goals_missed || 0;
          let attempts = stats?.field_goals_attempted || 0;
          if (!attempts && (made || missed)) attempts = made + missed;
          if (!attempts) return null;
          return (made / attempts) * 100;
        }
        if (metric.key === "punting_avg") {
          const punts = stats?.punts || 0;
          const yards = stats?.punt_yards || 0;
          if (!punts) return null;
          return yards / punts;
        }
        if (metric.key === "position_rank") {
          return player?.positionRank || positionRanks.get(player?.playerId) || null;
        }
        if (metric.key === "team_pass_ypg") {
          return teamPerGame.passing_yards ?? null;
        }
        if (metric.key === "team_rush_ypg") {
          return teamPerGame.rushing_yards ?? null;
        }
        if (metric.key === "pass_block_score") {
          const rank = passRank?.get(player?.team) || null;
          return rankToScore(rank, teamRankCount);
        }
        if (metric.key === "run_block_score") {
          const rank = rushRank?.get(player?.team) || null;
          return rankToScore(rank, teamRankCount);
        }
        if (metric.key === "line_score") {
          const passScore = rankToScore(passRank?.get(player?.team) || null, teamRankCount);
          const rushScore = rankToScore(rushRank?.get(player?.team) || null, teamRankCount);
          return Math.round((passScore + rushScore) / 2);
        }
        return stats?.[metric.key] ?? null;
      };

      const leftVal = buildValue(playerStats, selectedPlayer);
      const rightVal = buildValue(compareStats, compareTarget);
      const maxVal = Math.max(leftVal || 0, rightVal || 0, 1);
      let winner = null;
      if (leftVal != null && rightVal != null && leftVal !== rightVal) {
        const lowerBetter =
          metric.key === "interceptions" && base === "QB"
            ? true
            : isLowerBetter(metric.key);
        winner = lowerBetter
          ? leftVal < rightVal
            ? "left"
            : "right"
          : leftVal > rightVal
          ? "left"
          : "right";
      }
      return {
        label: metric.label,
        leftVal,
        rightVal,
        leftPct: toPercent(leftVal, maxVal),
        rightPct: toPercent(rightVal, maxVal),
        winner,
      };
    });
  }, [
    pvpMetrics,
    playerStats,
    compareStats,
    selectedPlayer,
    compareTarget,
    positionRanks,
    teamRanks,
    teamRankCount,
    teamStatsFor,
  ]);
  const pvpPlayers = useMemo(() => {
    if (!selectedPlayer || !compareTarget) return [];
    return [
      {
        key: "left",
        player: selectedPlayer,
        valueKey: "leftVal",
        pctKey: "leftPct",
      },
      {
        key: "right",
        player: compareTarget,
        valueKey: "rightVal",
        pctKey: "rightPct",
      },
    ];
  }, [selectedPlayer, compareTarget]);

  return (
    <div className="dcPage">
      <div className="dcHeader">
        <h2 className="dcTitle">Depth Chart</h2>
        {/* Player name search (auto-set team and select) */}
        <div style={{ margin: "0.5rem 0" }}>
          <PlayerSearchInput
            onSelect={(player) => {
              const rawId = player.PlayerID ?? player.player_id ?? player.id;
              const playerId =
                rawId != null && !Number.isNaN(Number(rawId)) ? Number(rawId) : null;
              const base = normalizePosition(player.position);
              const inferredTab =
                ["QB", "RB", "HB", "FB", "WR", "TE", "C", "G", "T", "OL"].includes(base)
                  ? "OFF"
                  : ["DL", "DE", "DT", "NT", "EDGE", "LB", "CB", "S", "FS", "SS", "DB"].includes(base)
                  ? "DEF"
                  : ["K", "P", "LS", "KR", "PR"].includes(base)
                  ? "ST"
                  : tab;
              setTab(inferredTab);
              setTeamAbbr(player.team_abbr);
              setSelectedPlayer({
                name: player.full_name,
                team: player.team_abbr,
                number: player.jersey_number || "",
                position: base,
                playerId,
                depthLabel: "",
              });
            }}
          />
        </div>
        {/* Team selection dropdown */}
        <div className="teamSelect">
          <label htmlFor="team-select" style={{ marginRight: "0.5rem" }}>
            Team:
          </label>
          <select
            id="team-select"
            name="depthchart-team"
            value={teamAbbr}
            onChange={(e) => setTeamAbbr(e.target.value)}
            style={{ padding: "0.25rem 0.5rem", borderRadius: "4px" }}
          >
            {teams.map((t) => (
              <option key={t.abbreviation} value={t.abbreviation}>
                {t.abbreviation}
              </option>
            ))}
          </select>
        </div>
        <div className="dcTabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`dcTab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="dcLayout">
        <div className="dcLeft">
          <div className="dcGrid">
            {roster[tab].map((p) => (
              <SlotCard
                key={p.position}
                player={p}
                onSelect={setSelectedPlayer}
                active={selectedPlayer?.position === p.position}
              />
            ))}
            {rosterLoading ? (
              <div className="dcEmpty">Loading roster…</div>
            ) : rosterError ? (
              <div className="dcEmpty">{rosterError}</div>
            ) : null}
          </div>

        </div>

        {selectedPlayer ? (
          <aside className="dcInspector">
            <div className="inspectorTop">
              <div>
                <div className="pill">{selectedPlayer.team}</div>
                <h3 className="inspectorName">{selectedPlayer.name}</h3>
                <div className="inspectorMeta">
                  #{selectedPlayer.number} • {selectedPlayer.position}
                </div>
              </div>
              <div className="inspectorAvatar">
                <PlayerAvatar
                  seed={`${selectedPlayer.team}-${selectedPlayer.name}-hero`}
                  size={88}
                />
              </div>
            </div>

            <div className="detailTabs">
              <button
                className={detailTab === "overview" ? "active" : ""}
                onClick={() => setDetailTab("overview")}
                type="button"
              >
                Overview
              </button>
              <button
                className={detailTab === "advanced" ? "active" : ""}
                onClick={() => setDetailTab("advanced")}
                type="button"
              >
                Advanced Stats
              </button>
              <button
                className={detailTab === "pvp" ? "active" : ""}
                onClick={() => setDetailTab("pvp")}
                type="button"
              >
                Player vs Player
              </button>
              <button
                className={detailTab === "teams" ? "active" : ""}
                onClick={() => setDetailTab("teams")}
                type="button"
              >
                Team vs Team
              </button>
            </div>

            {detailTab === "overview" && (
              <div className="inspectorCard">
                <div className="inspectorNote">
                  Scroll for stats/graphs. Player tabs stay pinned above the
                  analytics stack.
                </div>
                <div className="inspectorGrid">
                  <div>
                    <div className="miniTitle">Depth Label</div>
                    <div className="miniBody">{selectedPlayer.depthLabel}</div>
                  </div>
                  <div>
                    <div className="miniTitle">Team</div>
                    <div className="miniBody">{selectedPlayer.team}</div>
                  </div>
                  <div>
                    <div className="miniTitle">Jersey</div>
                    <div className="miniBody">#{selectedPlayer.number}</div>
                  </div>
                </div>
              </div>
            )}

            {detailTab === "advanced" && (
              <div className="inspectorCard">
                <div className="inspectorCardHeader">
                  <div>
                    <div className="miniTitle">Advanced</div>
                    <div className="miniBody">
                      {advancedMetrics.title}
                    </div>
                  </div>
                  <div className="radialBadge">
                    <span className="radialValue">
                      {advancedMetrics.metrics.length
                        ? Math.round(
                            advancedMetrics.metrics.reduce(
                              (sum, m) => sum + m.percent,
                              0
                            ) / advancedMetrics.metrics.length
                          )
                        : "—"}
                    </span>
                    <span className="radialLabel">Index</span>
                  </div>
                </div>
                <div className="advancedGrid">
                  {advancedMetrics.metrics.map((m) => (
                    <div key={m.label} className="advancedRow">
                      <div className="advancedMeta">
                        <span>{m.label}</span>
                        <span>{formatMetricValue(m.value)}</span>
                      </div>
                      <div className="advancedBar">
                        <div
                          className="advancedFill"
                          style={{ width: `${m.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {!advancedMetrics.metrics.length ? (
                    <div className="miniBody">No stats found for this player.</div>
                  ) : null}
                </div>
                {advancedMetrics.rankSummary ? (
                  <div className="advancedInsight">
                    <span>{selectedPlayer?.name || "Player"} Rank</span>
                    <span>{advancedMetrics.rankSummary}</span>
                  </div>
                ) : null}
                {(advancedMetrics.strengths.length || advancedMetrics.weaknesses.length) ? (
                  <div className="advancedInsightGrid">
                    <div>
                      <div>Strengths</div>
                      <div>{advancedMetrics.strengths.join(", ") || "Balanced"}</div>
                    </div>
                    <div>
                      <div>Weaknesses</div>
                      <div>{advancedMetrics.weaknesses.join(", ") || "Balanced"}</div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {detailTab === "pvp" && (
              <div className="inspectorCard">
                <div className="inspectorCardHeader">
                  <div className="miniTitle">Player vs Player</div>
                  <div className="miniBody">Head-to-head for quick scouting</div>
                </div>
                <div className="pvpSelectRow">
                  <label>
                    Compare with
                    <select
                      name="depthchart-compare-target"
                      value={compareTargetId || ""}
                      size={Math.min(6, Math.max(4, comparePool.length))}
                      className="pvpSelect"
                      onChange={(e) => {
                        const val = e.target.value;
                        setCompareTargetId(val ? Number(val) : null);
                      }}
                    >
                      {comparePool.map((p) => (
                        <option key={p.playerId} value={p.playerId}>
                          {p.depthLabel !== "Starter" ? p.depthLabel : p.position} – {p.name} ({p.team})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {compareTarget ? (
                  <div className="pvpGrid">
                    {pvpPlayers.map((entry) => (
                      <div key={entry.key} className="pvpCard">
                        <div className="pvpHeader">
                          <span className="chip">{entry.player.position}</span>
                          <span className="chip">{entry.player.team}</span>
                        </div>
                        <div className="pvpName">{entry.player.name}</div>
                        <div className="pvpMeta">
                          #{entry.player.number} • {entry.player.depthLabel}
                        </div>
                        {pvpRows.map((row) => (
                          <div
                            key={`${entry.key}-${row.label}`}
                            className={`pvpStatRow ${row.winner === entry.key ? "winner" : ""}`}
                          >
                            <span>
                              {row.label} •{" "}
                              {row[entry.valueKey] != null
                                ? row.label.includes("%")
                                  ? `${Math.round(row[entry.valueKey] * 10) / 10}%`
                                  : Math.round(row[entry.valueKey] * 10) / 10
                                : "—"}
                            </span>
                            <div className="statBar">
                              <div
                                style={{
                                  width: `${row[entry.pctKey]}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {detailTab === "teams" && (
              <div className="inspectorCard">
                <div className="inspectorCardHeader">
                  <div className="miniTitle">Team vs Team</div>
                  <div className="miniBody">
                    Run defense vs pass blocking, rush vs coverage, and more.
                  </div>
                </div>
                <div className="teamSelectRow">
                  <label>
                    Team A
                    <select
                      name="team-compare-left"
                      value={teamAbbr}
                      size={Math.min(8, Math.max(6, teams.length))}
                      onChange={(e) => setTeamAbbr(e.target.value)}
                    >
                      {teams.map((t) => (
                        <option key={t.abbreviation} value={t.abbreviation}>
                          {t.abbreviation}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Team B
                    <select
                      name="team-compare-right"
                      value={compareTeamAbbr || ""}
                      size={Math.min(8, Math.max(6, teams.length))}
                      onChange={(e) => setCompareTeamAbbr(e.target.value)}
                    >
                      {teams.map((t) => (
                        <option key={t.abbreviation} value={t.abbreviation}>
                          {t.abbreviation}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="teamProfileGrid">
                  <div className="teamProfileCard">
                    <div className="teamProfileTitle">{teamAbbr} Profile</div>
                    <div className="teamProfileRow">
                      <span>Offense Avg Rank</span>
                      <span>
                        {teamProfiles.left.offenseAvg != null
                          ? Math.round(teamProfiles.left.offenseAvg * 10) / 10
                          : "—"}
                      </span>
                    </div>
                    <div className="teamProfileRow">
                      <span>Defense Avg Rank</span>
                      <span>
                        {teamProfiles.left.defenseAvg != null
                          ? Math.round(teamProfiles.left.defenseAvg * 10) / 10
                          : "—"}
                      </span>
                    </div>
                    <div className="teamProfileList">
                      <div>Offense Strengths</div>
                      <div>
                        {teamProfiles.left.offenseStrengths.length
                          ? teamProfiles.left.offenseStrengths
                              .map((row) => `${row.label} (#${row.rank})`)
                              .join(", ")
                          : "Balanced"}
                      </div>
                      <div>Offense Weaknesses</div>
                      <div>
                        {teamProfiles.left.offenseWeaknesses.length
                          ? teamProfiles.left.offenseWeaknesses
                              .map((row) => `${row.label} (#${row.rank})`)
                              .join(", ")
                          : "Balanced"}
                      </div>
                      <div>Defense Strengths</div>
                      <div>
                        {teamProfiles.left.defenseStrengths.length
                          ? teamProfiles.left.defenseStrengths
                              .map((row) => `${row.label} (#${row.rank})`)
                              .join(", ")
                          : "Balanced"}
                      </div>
                      <div>Defense Weaknesses</div>
                      <div>
                        {teamProfiles.left.defenseWeaknesses.length
                          ? teamProfiles.left.defenseWeaknesses
                              .map((row) => `${row.label} (#${row.rank})`)
                              .join(", ")
                          : "Balanced"}
                      </div>
                      <div>Offense Group Strengths</div>
                      <div>
                        {teamProfiles.left.offenseGroupStrengths.length
                          ? teamProfiles.left.offenseGroupStrengths
                              .map((row) => `${row.label} (#${row.rank})`)
                              .join(", ")
                          : "Balanced"}
                      </div>
                      <div>Offense Group Weaknesses</div>
                      <div>
                        {teamProfiles.left.offenseGroupWeaknesses.length
                          ? teamProfiles.left.offenseGroupWeaknesses
                              .map((row) => `${row.label} (#${row.rank})`)
                              .join(", ")
                          : "Balanced"}
                      </div>
                      <div>Defense Group Strengths</div>
                      <div>
                        {teamProfiles.left.defenseGroupStrengths.length
                          ? teamProfiles.left.defenseGroupStrengths
                              .map((row) => `${row.label} (#${row.rank})`)
                              .join(", ")
                          : "Balanced"}
                      </div>
                      <div>Defense Group Weaknesses</div>
                      <div>
                        {teamProfiles.left.defenseGroupWeaknesses.length
                          ? teamProfiles.left.defenseGroupWeaknesses
                              .map((row) => `${row.label} (#${row.rank})`)
                              .join(", ")
                          : "Balanced"}
                      </div>
                    </div>
                  </div>
                  <div className="teamProfileCard">
                    <div className="teamProfileTitle">{compareTeamAbbr || "—"} Profile</div>
                    <div className="teamProfileRow">
                      <span>Offense Avg Rank</span>
                      <span>
                        {teamProfiles.right.offenseAvg != null
                          ? Math.round(teamProfiles.right.offenseAvg * 10) / 10
                          : "—"}
                      </span>
                    </div>
                    <div className="teamProfileRow">
                      <span>Defense Avg Rank</span>
                      <span>
                        {teamProfiles.right.defenseAvg != null
                          ? Math.round(teamProfiles.right.defenseAvg * 10) / 10
                          : "—"}
                      </span>
                    </div>
                    <div className="teamProfileList">
                      <div>Offense Strengths</div>
                      <div>
                        {teamProfiles.right.offenseStrengths.length
                          ? teamProfiles.right.offenseStrengths
                              .map((row) => `${row.label} (#${row.rank})`)
                              .join(", ")
                          : "Balanced"}
                      </div>
                      <div>Offense Weaknesses</div>
                      <div>
                        {teamProfiles.right.offenseWeaknesses.length
                          ? teamProfiles.right.offenseWeaknesses
                              .map((row) => `${row.label} (#${row.rank})`)
                              .join(", ")
                          : "Balanced"}
                      </div>
                      <div>Defense Strengths</div>
                      <div>
                        {teamProfiles.right.defenseStrengths.length
                          ? teamProfiles.right.defenseStrengths
                              .map((row) => `${row.label} (#${row.rank})`)
                              .join(", ")
                          : "Balanced"}
                      </div>
                      <div>Defense Weaknesses</div>
                      <div>
                        {teamProfiles.right.defenseWeaknesses.length
                          ? teamProfiles.right.defenseWeaknesses
                              .map((row) => `${row.label} (#${row.rank})`)
                              .join(", ")
                          : "Balanced"}
                      </div>
                      <div>Offense Group Strengths</div>
                      <div>
                        {teamProfiles.right.offenseGroupStrengths.length
                          ? teamProfiles.right.offenseGroupStrengths
                              .map((row) => `${row.label} (#${row.rank})`)
                              .join(", ")
                          : "Balanced"}
                      </div>
                      <div>Offense Group Weaknesses</div>
                      <div>
                        {teamProfiles.right.offenseGroupWeaknesses.length
                          ? teamProfiles.right.offenseGroupWeaknesses
                              .map((row) => `${row.label} (#${row.rank})`)
                              .join(", ")
                          : "Balanced"}
                      </div>
                      <div>Defense Group Strengths</div>
                      <div>
                        {teamProfiles.right.defenseGroupStrengths.length
                          ? teamProfiles.right.defenseGroupStrengths
                              .map((row) => `${row.label} (#${row.rank})`)
                              .join(", ")
                          : "Balanced"}
                      </div>
                      <div>Defense Group Weaknesses</div>
                      <div>
                        {teamProfiles.right.defenseGroupWeaknesses.length
                          ? teamProfiles.right.defenseGroupWeaknesses
                              .map((row) => `${row.label} (#${row.rank})`)
                              .join(", ")
                          : "Balanced"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="teamCompareSection">
                  <div className="teamCompareTitle">Offense vs Offense</div>
                  <div className="teamCompare">
                    {offenseComparison.map((m) => {
                      const maxVal = Math.max(m.left || 0, m.right || 0, 1);
                      const leftPct = toPercent(m.left, maxVal);
                      const rightPct = toPercent(m.right, maxVal);
                      const leftRank = m.ranks?.[m.key]?.get(teamAbbr) || null;
                      const rightRank = m.ranks?.[m.key]?.get(compareTeamAbbr) || null;
                      const leftWins = m.left != null && m.right != null && m.left !== m.right ? m.left > m.right : null;
                      return (
                        <div key={m.label} className="teamCompareRow">
                          <div className="teamCompareLabel">{m.label}</div>
                          <div className="teamMeter">
                            <div
                              className="teamMeterFill left"
                              style={{ width: `${leftPct}%` }}
                            />
                            <div
                              className="teamMeterFill right"
                              style={{ width: `${rightPct}%` }}
                            />
                            <div className="teamMeterCenter" />
                          </div>
                          <div className="teamCompareValues">
                            <span className={leftWins ? "compareWinner" : ""}>
                              {teamAbbr}: {m.left != null ? Math.round(m.left * 10) / 10 : 0}
                              {leftRank && m.count ? ` • Rank ${leftRank}/${m.count}` : ""}
                            </span>
                            <span className={leftWins === false ? "compareWinner" : ""}>
                              {compareTeamAbbr || "—"}: {m.right != null ? Math.round(m.right * 10) / 10 : 0}
                              {rightRank && m.count ? ` • Rank ${rightRank}/${m.count}` : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {!offenseComparison.length ? (
                      <div className="miniBody">No offense stats available.</div>
                    ) : null}
                  </div>
                </div>
                <div className="teamCompareSection">
                  <div className="teamCompareTitle">Defense vs Defense</div>
                  <div className="teamCompare">
                    {defenseComparison.map((m) => {
                      const maxVal = Math.max(m.left || 0, m.right || 0, 1);
                      const leftPct = toPercent(m.left, maxVal);
                      const rightPct = toPercent(m.right, maxVal);
                      const leftRank = m.ranks?.[m.key]?.get(teamAbbr) || null;
                      const rightRank = m.ranks?.[m.key]?.get(compareTeamAbbr) || null;
                      let leftWins = null;
                      if (m.left != null && m.right != null && m.left !== m.right) {
                        const lowerBetter = isLowerBetter(m.key);
                        leftWins = lowerBetter ? m.left < m.right : m.left > m.right;
                      }
                      return (
                        <div key={m.label} className="teamCompareRow">
                          <div className="teamCompareLabel">{m.label}</div>
                          <div className="teamMeter">
                            <div
                              className="teamMeterFill left"
                              style={{ width: `${leftPct}%` }}
                            />
                            <div
                              className="teamMeterFill right"
                              style={{ width: `${rightPct}%` }}
                            />
                            <div className="teamMeterCenter" />
                          </div>
                          <div className="teamCompareValues">
                            <span className={leftWins ? "compareWinner" : ""}>
                              {teamAbbr}: {m.left != null ? Math.round(m.left * 10) / 10 : 0}
                              {leftRank && m.count ? ` • Rank ${leftRank}/${m.count}` : ""}
                            </span>
                            <span className={leftWins === false ? "compareWinner" : ""}>
                              {compareTeamAbbr || "—"}: {m.right != null ? Math.round(m.right * 10) / 10 : 0}
                              {rightRank && m.count ? ` • Rank ${rightRank}/${m.count}` : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {!defenseComparison.length ? (
                      <div className="miniBody">No defense stats available.</div>
                    ) : null}
                  </div>
                </div>
                <div className="teamCompareSection">
                  <div className="teamCompareTitle">Position Group Ranks</div>
                  <div className="teamGroupGrid">
                    {positionGroupRanks.map((row) => (
                      <div key={row.group} className="teamGroupRow">
                        <span>{row.group}</span>
                        <span>
                          {teamAbbr}: {row.left != null ? `#${row.left}` : "—"}
                          {starterRankCount ? `/${starterRankCount}` : ""}
                        </span>
                        <span>
                          {compareTeamAbbr || "—"}: {row.right != null ? `#${row.right}` : "—"}
                          {starterRankCount ? `/${starterRankCount}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
