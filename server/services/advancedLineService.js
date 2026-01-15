const Player = require("../models/Player");
const AdvancedLineMetrics = require("../models/AdvancedLineMetrics");
const LineMetrics = require("../models/LineMetrics");
const {
  getPlayerGameStatsByTeam,
  getPlayerSnapCountsByTeam,
} = require("./sportsdataService");

/**
 * Derive per-player advanced line metrics based on team-level stats and snap shares.
 * This heuristic spreads team pressures/sacks across linemen by snap share.
 */
function deriveAdvancedFromTeamStats(lineDocs, playerSnaps, teamStatsRows) {
  const olByPlayerId = new Map(lineDocs.map((doc) => [doc.PlayerID, doc]));
  const snapByPlayerId = new Map();
  playerSnaps.forEach((s) => {
    if (!s.player_id) return;
    snapByPlayerId.set(
      s.player_id,
      (snapByPlayerId.get(s.player_id) || 0) + (s.snaps || 0)
    );
  });
  const totalSnaps = Array.from(snapByPlayerId.values()).reduce((a, b) => a + b, 0);
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

/**
 * Compute and save advanced offensive line metrics for a team/season/week.
 */
async function computeAndSaveAdvancedLineMetricsForTeam(season, week, teamAbbrev) {
  const team = String(teamAbbrev || "").toUpperCase();
  const lineDocs = await LineMetrics.find({ Team: team, season, week });
  const snaps = await getPlayerSnapCountsByTeam(season, week, team);
  const stats = await getPlayerGameStatsByTeam(season, week, team);
  const derived = deriveAdvancedFromTeamStats(lineDocs, snaps, stats);
  const results = [];
  for (const d of derived) {
    const doc = await AdvancedLineMetrics.findOneAndUpdate(
      { player: d.player, season, week },
      { ...d, season, week },
      { new: true, upsert: true }
    );
    results.push(doc);
  }
  return results;
}

/**
 * Retrieve advanced offensive line cards from the DB and map them to the frontend format.
 */
async function getAdvancedOlineCardsFromDb(season, week, teamAbbrev) {
  const team = String(teamAbbrev || "").toUpperCase();
  const metrics = await AdvancedLineMetrics.find({ Team: team, season, week }).populate(
    "player"
  );
  return metrics.map((d) => {
    const p = d.player;
    const name =
      p?.full_name || `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim();
    const photo = p?.raw?.photoUrl || p?.raw?.headshot_url || null;
    return {
      cardType: "oline-advanced",
      playerId: p?._id,
      PlayerID: d.PlayerID,
      name,
      team: d.Team,
      position: d.Position,
      photo,
      pressuresAllowed: d.pressuresAllowed,
      sacksAllowed: d.sacksAllowed,
      runBlockWinRate: d.runBlockWinRate,
      passBlockWinRate: d.passBlockWinRate,
      efficiency: d.efficiency,
    };
  });
}

module.exports = {
  computeAndSaveAdvancedLineMetricsForTeam,
  getAdvancedOlineCardsFromDb,
};
