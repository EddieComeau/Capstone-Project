const Player = require("../models/Player");
const SpecialTeamsMetrics = require("../models/SpecialTeamsMetrics");
const { getPlayerGameStatsByTeam } = require("./sportsdataService");

// Determine if a player's position qualifies for special teams (kicking, punting, returning)
function isSpecialTeamsPosition(pos) {
  const ST_POS = ["K", "P", "LS", "KR", "PR"];
  return ST_POS.includes((pos || "").toUpperCase());
}

// Map a BDL stat row to our special teams categories.
function mapSpecialTeamsStatsRow(row) {
  return {
    kicking: {
      fgMade: row.field_goals_made ?? 0,
      fgAttempted: row.field_goals_attempted ?? 0,
      xpMade: row.extra_points_made ?? 0,
      xpAttempted: row.extra_points_attempted ?? 0,
      longFg: row.field_goals_long ?? 0,
    },
    punting: {
      punts: row.punts ?? 0,
      avg: row.punting_yards_per_punt ?? 0,
      inside20: row.punts_inside_20 ?? 0,
      long: row.long_punt ?? 0,
    },
    returning: {
      kickReturns: row.kick_returns ?? 0,
      kickReturnYards: row.kick_return_yards ?? 0,
      puntReturns: row.punt_returns ?? 0,
      puntReturnYards: row.punt_return_yards ?? 0,
      tds: row.return_tds ?? 0,
    },
    snapping: {
      snaps: null,
      errors: null,
    },
    gunner: {
      tackles: null,
      forcedFumbles: null,
      stopsInside20: null,
    },
  };
}

/**
 * Compute and save special teams metrics for a team for a given season/week.
 */
async function computeAndSaveSpecialTeamsMetricsForTeam(season, week, teamAbbrev) {
  const team = String(teamAbbrev || "").toUpperCase();
  const [stats, players] = await Promise.all([
    getPlayerGameStatsByTeam(season, week, team),
    Player.find({ "team.abbreviation": team }),
  ]);
  const playerById = new Map();
  players.forEach((p) => {
    const id = p.PlayerID || p.bdlId;
    playerById.set(id, p);
  });
  const results = [];
  for (const row of stats) {
    const playerId = row.player?.id;
    const rowTeam = row.team?.abbreviation?.toUpperCase();
    if (!playerId || rowTeam !== team) continue;
    const p = playerById.get(playerId);
    if (!p || !isSpecialTeamsPosition(p.position)) continue;
    const mapped = mapSpecialTeamsStatsRow(row);
    const update = {
      player: p._id,
      PlayerID: playerId,
      Team: team,
      Position: (p.position || "").toUpperCase(),
      season,
      week,
      ...mapped,
    };
    const doc = await SpecialTeamsMetrics.findOneAndUpdate(
      { player: p._id, season, week },
      update,
      { new: true, upsert: true }
    );
    results.push(doc);
  }
  return results;
}

/**
 * Retrieve special teams cards for a team and format them.
 */
async function getSpecialTeamsCardsFromDb(season, week, teamAbbrev) {
  const team = String(teamAbbrev || "").toUpperCase();
  const metrics = await SpecialTeamsMetrics.find({ Team: team, season, week }).populate("player");
  return metrics.map((d) => {
    const p = d.player;
    const name =
      p?.full_name || `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim();
    const photo = p?.raw?.photoUrl || p?.raw?.headshot_url || null;
    return {
      cardType: "special-teams",
      playerId: p?._id,
      PlayerID: d.PlayerID,
      name,
      team: d.Team,
      position: d.Position,
      photo,
      kicking: d.kicking,
      punting: d.punting,
      returning: d.returning,
      snapping: d.snapping,
      gunner: d.gunner,
    };
  });
}

module.exports = {
  computeAndSaveSpecialTeamsMetricsForTeam,
  getSpecialTeamsCardsFromDb,
};
