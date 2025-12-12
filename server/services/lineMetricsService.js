// server/services/lineMetricsService.js
const Player = require("../models/Player");
const LineMetrics = require("../models/LineMetrics");

/**
 * Identify offensive linemen by position code.
 */
function isOLinePosition(pos) {
  const OLINE_POSITIONS = ["C", "G", "OG", "OT", "T", "LT", "RT", "LG", "RG"];
  return OLINE_POSITIONS.includes((pos || "").toUpperCase());
}

/**
 * Very rough placeholder: one LineMetrics row per OL, mostly using snaps
 * & position to build a basic card. You can plug in real data when you
 * get line-specific stats.
 */
async function computeAndSaveLineMetricsForTeam(season, week, teamAbbrev) {
  const team = teamAbbrev.toUpperCase();

  const players = await Player.find({ Team: team });
  const ol = players.filter((p) => isOLinePosition(p.Position));

  const results = [];

  for (const p of ol) {
    const update = {
      player: p._id,
      PlayerID: p.PlayerID,
      Team: team,
      Position: p.Position,
      season,
      week,
      lineGrade: {
        passGrade: null,
        runGrade: null,
        overall: null,
      },
      snaps: {
        total: null,
        run: null,
        pass: null,
      },
    };

    const doc = await LineMetrics.findOneAndUpdate(
      { player: p._id, season, week },
      update,
      { new: true, upsert: true }
    );

    results.push(doc);
  }

  return results;
}

/**
 * Cards for OL line (basic).
 */
async function getOffensiveLineCardsFromDb(season, week, teamAbbrev) {
  const team = teamAbbrev.toUpperCase();

  const metrics = await LineMetrics.find({ Team: team, season, week }).populate(
    "player"
  );

  return metrics.map((m) => ({
    cardType: "oline-basic",
    playerId: m.player?._id,
    PlayerID: m.PlayerID,
    name: m.player?.FullName,
    team: m.Team,
    position: m.Position,
    season: m.season,
    week: m.week,
    photo: m.player?.PhotoUrl,
    lineGrade: m.lineGrade,
    snaps: m.snaps,
  }));
}

module.exports = {
  computeAndSaveLineMetricsForTeam,
  getOffensiveLineCardsFromDb,
};
