// services/advancedLineService.js
const Player = require("../models/Player");
const AdvancedLineMetrics = require("../models/AdvancedLineMetrics");
const LineMetrics = require("../models/LineMetrics");
const {
  getPlayerGameStatsByTeam,
  getPlayerSnapCountsByTeam,
} = require("./sportsdataService");

/**
 * Extremely rough placeholder using existing stats.
 * Later, replace with real per-OL sacks/pressures from PFF or another feed.
 */
function deriveAdvancedFromTeamStats(lineMetrics, playerSnaps) {
  // Distribute sacks/pressures based on pass snaps share as a rough estimate
  const totalPassSnaps = playerSnaps.reduce(
    (sum, s) => sum + (s.passSnaps || 0),
    0
  );

  return playerSnaps.map((p) => {
    const share =
      totalPassSnaps > 0 ? (p.passSnaps || 0) / totalPassSnaps : 0;

    // You can later replace these with actual API fields
    const estimatedPressures = Math.round(share * 10); // placeholder
    const estimatedSacks = Math.round(share * 3); // placeholder

    const efficiencyPass =
      lineMetrics.lineGrade.passGrade != null
        ? lineMetrics.lineGrade.passGrade
        : null;
    const efficiencyRun =
      lineMetrics.lineGrade.runGrade != null
        ? lineMetrics.lineGrade.runGrade
        : null;
    const efficiencyTotal =
      lineMetrics.lineGrade.overall != null
        ? lineMetrics.lineGrade.overall
        : null;

    return {
      PlayerID: p.PlayerID,
      pressuresAllowed: estimatedPressures,
      sacksAllowed: estimatedSacks,
      hitsAllowed: null,
      hurriesAllowed: null,
      runBlockWinRate: null,
      passBlockWinRate: null,
      efficiency: {
        pass: efficiencyPass,
        run: efficiencyRun,
        total: efficiencyTotal,
      },
    };
  });
}

/**
 * Compute & save AdvancedLineMetrics for a team's OL.
 * This is a scaffold – replace internals when you have real line data.
 */
async function computeAndSaveAdvancedLineMetricsForTeam(season, week, team) {
  const [snapCounts, lineMetricsDocs] = await Promise.all([
    getPlayerSnapCountsByTeam(season, week, team),
    LineMetrics.find({ Team: team, season, week }),
  ]);

  if (!lineMetricsDocs.length) {
    return { updated: 0, reason: "No LineMetrics yet. Sync basic OL first." };
  }

  const olPositions = ["C", "G", "OG", "OT", "T", "OL"];
  const players = await Player.find({
    Team: team,
    Position: { $in: olPositions },
  });

  const snapMap = new Map(
    (snapCounts || []).map((s) => [s.PlayerID, s])
  );

  const playerSnapObjs = players.map((p) => {
    const s = snapMap.get(p.PlayerID) || {};
    return {
      PlayerID: p.PlayerID,
      passSnaps: s.PassSnaps || 0,
      runSnaps: s.RunSnaps || 0,
      totalSnaps: s.Snaps || 0,
    };
  });

  const teamLineMetrics = lineMetricsDocs[0]; // shared grade for line
  const derived = deriveAdvancedFromTeamStats(
    teamLineMetrics,
    playerSnapObjs
  );

  const ops = derived.map(async (d) => {
    const player = players.find((p) => p.PlayerID === d.PlayerID);
    if (!player) return;

    await AdvancedLineMetrics.findOneAndUpdate(
      {
        PlayerID: d.PlayerID,
        season,
        week,
      },
      {
        player: player._id,
        PlayerID: d.PlayerID,
        Team: player.Team,
        Position: player.Position,
        season,
        week,
        pressuresAllowed: d.pressuresAllowed,
        sacksAllowed: d.sacksAllowed,
        hitsAllowed: d.hitsAllowed,
        hurriesAllowed: d.hurriesAllowed,
        runBlockWinRate: d.runBlockWinRate,
        passBlockWinRate: d.passBlockWinRate,
        efficiency: d.efficiency,
      },
      { upsert: true, new: true }
    );
  });

  await Promise.all(ops);
  return { updated: derived.length };
}

/**
 * Get advanced OL cards from DB.
 */
async function getAdvancedOlineCardsFromDb(season, week, team) {
  const docs = await AdvancedLineMetrics.find({
    Team: team,
    season,
    week,
  }).populate("player");

  return docs.map((d) => ({
    cardType: "oline-advanced",
    playerId: d.player?._id,
    PlayerID: d.PlayerID,
    name: d.player?.FullName,
    team: d.Team,
    position: d.Position,
    photo: d.player?.PhotoUrl,
    pressuresAllowed: d.pressuresAllowed,
    sacksAllowed: d.sacksAllowed,
    runBlockWinRate: d.runBlockWinRate,
    passBlockWinRate: d.passBlockWinRate,
    efficiency: d.efficiency,
  }));
}

module.exports = {
  computeAndSaveAdvancedLineMetricsForTeam,
  getAdvancedOlineCardsFromDb,
};
