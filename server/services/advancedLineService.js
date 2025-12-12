// server/services/advancedLineService.js
const Player = require("../models/Player");
const AdvancedLineMetrics = require("../models/AdvancedLineMetrics");
const LineMetrics = require("../models/LineMetrics");
const {
  getPlayerGameStatsByTeam,
  getPlayerSnapCountsByTeam,
} = require("./sportsdataService");

/**
 * Heuristic: distribute team-level pressures/sacks across OL based on snap share.
 * Refine this once you have better line-level data.
 */
function deriveAdvancedFromTeamStats(lineDocs, playerSnaps, teamStatsRows) {
  const olByPlayerId = new Map(
    lineDocs.map((doc) => [doc.PlayerID, doc])
  );

  const snapByPlayerId = new Map();
  playerSnaps.forEach((s) => {
    if (!s.player_id) return;
    snapByPlayerId.set(
      s.player_id,
      (snapByPlayerId.get(s.player_id) || 0) + (s.snaps || 0)
    );
  });

  const totalSnaps = Array.from(snapByPlayerId.values()).reduce(
    (a, b) => a + b,
    0
  );

  // rough team totals from basic stats; tweak once you know exact fields.
  const totalPressures = teamStatsRows.reduce(
    (sum, row) => sum + (row.pressures_allowed || 0),
    0
  );
  const totalSacks = teamStatsRows.reduce(
    (sum, row) => sum + (row.sacks_allowed || 0),
    0
  );

  const results = [];

  for (const [playerId, snaps] of snapByPlayerId.entries()) {
    const lineDoc = olByPlayerId.get(playerId);
    if (!lineDoc) continue;

    const share = totalSnaps ? snaps / totalSnaps : 0;

    results.push({
      PlayerID: playerId,
      player: lineDoc.player,
      Team: lineDoc.Team,
      Position: lineDoc.Position,
      pressuresAllowed: Math.round(totalPressures * share),
      sacksAllowed: Math.round(totalSacks * share),
      hitsAllowed: null,
      hurriesAllowed: null,
      runBlockWinRate: null,
      passBlockWinRate: null,
      efficiency: {
        pass: null,
        run: null,
        total: null,
      },
    });
  }

  return results;
}

async function computeAndSaveAdvancedLineMetricsForTeam(
  season,
  week,
  teamAbbrev
) {
  const team = teamAbbrev.toUpperCase();

  // ensure base line metrics exist
  const lineDocs = await LineMetrics.find({ Team: team, season, week });
  const snaps = await getPlayerSnapCountsByTeam(season, week, team);
  const stats = await getPlayerGameStatsByTeam(season, week, team);

  const derived = deriveAdvancedFromTeamStats(lineDocs, snaps, stats);

  const results = [];

  for (const d of derived) {
    const doc = await AdvancedLineMetrics.findOneAndUpdate(
      { player: d.player, season, week },
      {
        ...d,
        season,
        week,
      },
      { new: true, upsert: true }
    );
    results.push(doc);
  }

  return results;
}

async function getAdvancedOlineCardsFromDb(season, week, teamAbbrev) {
  const team = teamAbbrev.toUpperCase();
  const metrics = await AdvancedLineMetrics.find({
    Team: team,
    season,
    week,
  }).populate("player");

  return metrics.map((d) => ({
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
