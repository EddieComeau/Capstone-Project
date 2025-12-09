// services/specialTeamsService.js
const Player = require("../models/Player");
const SpecialTeamsMetrics = require("../models/SpecialTeamsMetrics");
const { getPlayerGameStatsByTeam } = require("./sportsdataService");

/**
 * Heuristic position groups for special teams.
 */
const KICKER_POSITIONS = ["K"];
const PUNTER_POSITIONS = ["P"];
const RETURNER_POSITIONS = ["WR", "RB", "CB", "DB"]; // many returners
const LONG_SNAPPER_POSITIONS = ["LS"];
const GUNNER_POSITIONS = ["WR", "CB", "DB", "S"];

function isKicker(position) {
  return KICKER_POSITIONS.includes(position);
}
function isPunter(position) {
  return PUNTER_POSITIONS.includes(position);
}
function isLongSnapper(position) {
  return LONG_SNAPPER_POSITIONS.includes(position);
}

/**
 * Map a raw SportsDataIO player game stat object to special teams metrics.
 * NOTE: field names here are *examples*; tweak based on your data dictionary.
 */
function buildSpecialTeamsMetricsFromStat(stat) {
  return {
    kicking: {
      fgMade: stat.FieldGoalsMade ?? 0,
      fgAttempted: stat.FieldGoalsAttempted ?? 0,
      fgLong: stat.FieldGoalsLongestMade ?? 0,
      xpMade: stat.ExtraPointsMade ?? 0,
      xpAttempted: stat.ExtraPointsAttempted ?? 0,
    },
    punting: {
      punts: stat.Punts ?? 0,
      yards: stat.PuntYards ?? 0,
      netYards: stat.PuntNetYards ?? 0,
      inside20: stat.PuntsInside20 ?? 0,
      long: stat.PuntLongest ?? 0,
      touchbacks: stat.PuntTouchbacks ?? 0,
    },
    returning: {
      kickReturns: stat.KickReturns ?? 0,
      kickReturnYards: stat.KickReturnYards ?? 0,
      puntReturns: stat.PuntReturns ?? 0,
      puntReturnYards: stat.PuntReturnYards ?? 0,
      longKick: stat.KickReturnLongest ?? 0,
      longPunt: stat.PuntReturnLongest ?? 0,
      touchdowns: stat.KickReturnTouchdowns + stat.PuntReturnTouchdowns || 0,
    },
    snapping: {
      snaps: null,
      errors: null,
    },
    gunner: {
      tackles: stat.SpecialTeamsSoloTackles ?? 0,
      forcedFumbles: stat.SpecialTeamsForcedFumbles ?? 0,
      stopsInside20: null,
    },
  };
}

/**
 * Compute & save special teams metrics for all special teamers on a team.
 */
async function computeAndSaveSpecialTeamsForTeam(season, week, team) {
  const stats = await getPlayerGameStatsByTeam(season, week, team);
  if (!stats || !stats.length) {
    return { updated: 0 };
  }

  // Map by PlayerID for quick join to Player
  const statMap = new Map(stats.map((s) => [s.PlayerID, s]));

  const players = await Player.find({ Team: team });
  const ops = [];

  for (const player of players) {
    const stat = statMap.get(player.PlayerID);
    if (!stat) continue;

    const position = player.Position;

    const isST =
      isKicker(position) ||
      isPunter(position) ||
      isLongSnapper(position) ||
      stat.Punts > 0 ||
      stat.FieldGoalsAttempted > 0 ||
      stat.KickReturns > 0 ||
      stat.PuntReturns > 0 ||
      stat.SpecialTeamsSoloTackles > 0;

    if (!isST) continue;

    const stMetrics = buildSpecialTeamsMetricsFromStat(stat);

    ops.push(
      SpecialTeamsMetrics.findOneAndUpdate(
        {
          PlayerID: player.PlayerID,
          season,
          week,
        },
        {
          player: player._id,
          PlayerID: player.PlayerID,
          Team: player.Team,
          Position: player.Position,
          season,
          week,
          ...stMetrics,
        },
        { upsert: true, new: true }
      )
    );
  }

  const results = await Promise.all(ops);
  return { updated: results.length };
}

/**
 * Get card-ready special teams metrics from DB for a team/week.
 */
async function getSpecialTeamsCardsFromDb(season, week, team) {
  const docs = await SpecialTeamsMetrics.find({
    Team: team,
    season,
    week,
  }).populate("player");

  return docs.map((d) => ({
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
  computeAndSaveSpecialTeamsForTeam,
  getSpecialTeamsCardsFromDb,
};
