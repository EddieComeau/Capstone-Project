// services/lineMetricsService.js
const Player = require("../models/Player");
const LineMetrics = require("../models/LineMetrics");
const {
  getTeamGameStats,
  getPlayerSnapCountsByTeam,
} = require("./sportsdataService");

// Simple scaler for 0–100
function scaleTo100(value, min, max) {
  if (max === min) return 50;
  return Math.round(((value - min) / (max - min)) * 100);
}

// Compute line grade for a single player’s raw stats
function computeLineGrade(rawStats) {
  const {
    passBlockWinRate,
    runBlockWinRate,
    pressuresAllowed,
    sacksAllowed,
    penalties,
    snaps,
  } = rawStats;

  // Example weighting logic (these can be tuned)
  const pbwrScore = scaleTo100(passBlockWinRate, 0, 1);
  const rbwrScore = scaleTo100(runBlockWinRate, 0, 1);

  // Negative events normalized by snaps
  const pressuresPerSnap = snaps > 0 ? pressuresAllowed / snaps : 0;
  const sacksPerSnap = snaps > 0 ? sacksAllowed / snaps : 0;
  const penaltiesPerSnap = snaps > 0 ? penalties / snaps : 0;

  const pressureScore = scaleTo100(1 - pressuresPerSnap, 0, 0.1);
  const sackScore = scaleTo100(1 - sacksPerSnap, 0, 0.05);
  const penaltyScore = scaleTo100(1 - penaltiesPerSnap, 0, 0.05);

  // Combine with weights
  const lineGrade =
    0.25 * pbwrScore +
    0.25 * rbwrScore +
    0.2 * pressureScore +
    0.2 * sackScore +
    0.1 * penaltyScore;

  return Math.round(lineGrade);
}

// Fetch raw OL stats for a given team/week from SportsData.io, then merge snaps
async function getRawLineStatsForTeam(season, week, team) {
  // Get team game stats from SportsData.io
  const teamGameStats = await getTeamGameStats(season, week, team);
  // Get snap counts by team (players & snaps)
  const snapCounts = await getPlayerSnapCountsByTeam(season, week, team);

  // This is a placeholder merge – you’d map from SportsData.io’s schema
  // to the rawStats structure used in computeLineGrade.
  const rawStatsByPlayerId = {};

  for (const snap of snapCounts) {
    const playerId = snap.PlayerID;
    if (!rawStatsByPlayerId[playerId]) {
      rawStatsByPlayerId[playerId] = {
        PlayerID: playerId,
        Team: snap.Team,
        Position: snap.Position,
        snaps: 0,
        passBlockWinRate: 0,
        runBlockWinRate: 0,
        pressuresAllowed: 0,
        sacksAllowed: 0,
        penalties: 0,
      };
    }

    rawStatsByPlayerId[playerId].snaps += snap.OffensiveSnaps || 0;

    // Any additional per–player events from teamGameStats could be merged here.
    // For now we assume we have them already or this is extended later.
  }

  // You’d normally also use teamGameStats here to fill in pressures/sacks/penalties
  // for each OL; omitted for brevity in this scaffold.

  return Object.values(rawStatsByPlayerId);
}

// Compute metrics and persist LineMetrics docs for a given team/week
async function computeAndSaveLineMetricsForTeam(season, week, team) {
  const rawStats = await getRawLineStatsForTeam(season, week, team);

  // Load players so we can link player docs
  const playerIds = rawStats.map((s) => s.PlayerID);
  const players = await Player.find({ PlayerID: { $in: playerIds } });
  const playerById = new Map(players.map((p) => [p.PlayerID, p]));

  const metricsDocs = [];

  for (const s of rawStats) {
    const playerDoc = playerById.get(s.PlayerID);
    if (!playerDoc) continue;

    const lineGrade = computeLineGrade(s);

    const doc = await LineMetrics.findOneAndUpdate(
      {
        PlayerID: s.PlayerID,
        season,
        week,
      },
      {
        PlayerID: s.PlayerID,
        player: playerDoc._id,
        Team: s.Team,
        Position: s.Position,
        season,
        week,
        snaps: s.snaps,
        lineGrade,
      },
      { new: true, upsert: true }
    );

    metricsDocs.push(doc);
  }

  return metricsDocs;
}

/**
 * Fetch offensive line “basic” cards for a team/season/week from Mongo.
 * These are what the frontend “OLineCard” uses.
 */
async function getOffensiveLineCardsFromDb(season, week, team) {
  const metrics = await LineMetrics.find({
    Team: team,
    season,
    week,
  }).populate("player");

  return metrics.map((m) => ({
    cardType: "oline-basic",
    playerId: m.player?._id,
    PlayerID: m.PlayerID,
    name: m.player?.FullName,
    team: m.Team,
    position: m.Position,
    photo: m.player?.PhotoUrl,
    snaps: m.snaps,
    lineGrade: m.lineGrade,
  }));
}

module.exports = {
  computeAndSaveLineMetricsForTeam,
  getOffensiveLineCardsFromDb,
};
