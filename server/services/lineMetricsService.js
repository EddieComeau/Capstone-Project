const Player = require("../models/Player");
const LineMetrics = require("../models/LineMetrics");

/**
 * Check if a position code belongs to an offensive line position.
 */
function isOLinePosition(pos) {
  const OLINE_POSITIONS = ["C", "G", "OG", "OT", "T", "LT", "RT", "LG", "RG"];
  return OLINE_POSITIONS.includes((pos || "").toUpperCase());
}

/**
 * Compute basic line metrics for a team for a given season/week.
 * Ensures players are queried using the nested team.abbreviation and lowercase position
 * from the Player model.
 */
async function computeAndSaveLineMetricsForTeam(season, week, teamAbbrev) {
  const team = String(teamAbbrev || "").toUpperCase();

  // Find players on the specified team (using nested field)
  const players = await Player.find({ "team.abbreviation": team });
  const linemen = players.filter((p) => isOLinePosition(p.position));

  const results = [];
  for (const p of linemen) {
    const update = {
      player: p._id,
      PlayerID: p.PlayerID || p.bdlId,
      Team: team,
      Position: (p.position || "").toUpperCase(),
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
 * Retrieve offensive line cards from the database and format them for the frontend.
 */
async function getOffensiveLineCardsFromDb(season, week, teamAbbrev) {
  const team = String(teamAbbrev || "").toUpperCase();
  const metrics = await LineMetrics.find({ Team: team, season, week }).populate("player");
  return metrics.map((m) => {
    const p = m.player;
    const name =
      p?.full_name || `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim();
    const photo = p?.raw?.photoUrl || p?.raw?.headshot_url || null;
    return {
      cardType: "oline-basic",
      playerId: p?._id,
      PlayerID: m.PlayerID,
      name,
      team: m.Team,
      position: m.Position,
      season: m.season,
      week: m.week,
      photo,
      lineGrade: m.lineGrade,
      snaps: m.snaps,
    };
  });
}

module.exports = {
  computeAndSaveLineMetricsForTeam,
  getOffensiveLineCardsFromDb,
};
