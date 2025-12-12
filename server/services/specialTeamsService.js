// server/services/specialTeamsService.js
const Player = require("../models/Player");
const SpecialTeamsMetrics = require("../models/SpecialTeamsMetrics");
const { getPlayerGameStatsByTeam } = require("./sportsdataService");

/**
 * Identify likely special teamers by position.
 */
function isSpecialTeamsPosition(pos) {
  const ST_POS = ["K", "P", "LS", "KR", "PR"];
  return ST_POS.includes((pos || "").toUpperCase());
}

/**
 * Map BALLDONTLIE stat row to rough ST categories.
 * TODO: adjust field names once you inspect the stats schema.
 */
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

async function computeAndSaveSpecialTeamsMetricsForTeam(
  season,
  week,
  teamAbbrev
) {
  const team = teamAbbrev.toUpperCase();

  const [stats, players] = await Promise.all([
    getPlayerGameStatsByTeam(season, week, team),
    Player.find({ Team: team }),
  ]);

  const playerById = new Map();
  players.forEach((p) => playerById.set(p.PlayerID, p));

  const results = [];

  for (const row of stats) {
    const playerId = row.player?.id;
    const teamAbbr = row.team?.abbreviation?.toUpperCase();
    if (!playerId || teamAbbr !== team) continue;

    const playerDoc = playerById.get(playerId);
    if (!playerDoc || !isSpecialTeamsPosition(playerDoc.Position)) continue;

    const mapped = mapSpecialTeamsStatsRow(row);

    const update = {
      player: playerDoc._id,
      PlayerID: playerId,
      Team: team,
      Position: playerDoc.Position,
      season,
      week,
      ...mapped,
    };

    const doc = await SpecialTeamsMetrics.findOneAndUpdate(
      { player: playerDoc._id, season, week },
      update,
      { new: true, upsert: true }
    );
    results.push(doc);
  }

  return results;
}

async function getSpecialTeamsCardsFromDb(season, week, teamAbbrev) {
  const team = teamAbbrev.toUpperCase();
  const metrics = await SpecialTeamsMetrics.find({
    Team: team,
    season,
    week,
  }).populate("player");

  return metrics.map((d) => ({
    cardType: "special-teams",
    playerId: d.player?._id,
    PlayerID: d.PlayerID,
    name: d.player?.FullName,
    team: d.Team,
    position: d.Position,
    photo: d.player?.PhotoUrl,
    kicking: d.kicking,
    punting: d.punting,
    returning: d.returning,
    snapping: d.snapping,
    gunner: d.gunner,
  }));
}

module.exports = {
  computeAndSaveSpecialTeamsMetricsForTeam,
  getSpecialTeamsCardsFromDb,
};
