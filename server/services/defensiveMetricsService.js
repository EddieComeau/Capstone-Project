// server/services/defensiveMetricsService.js
const Player = require("../models/Player");
const DefensiveMetrics = require("../models/DefensiveMetrics");
const {
  getPlayerGameStatsByTeam,
  getPlayerSnapCountsByTeam,
} = require("./sportsdataService");

/**
 * Basic heuristic to identify mainly-defensive players.
 */
function isDefensivePosition(pos) {
  const DEF_POSITIONS = [
    "S",
    "FS",
    "SS",
    "CB",
    "DB",
    "LB",
    "ILB",
    "OLB",
    "MLB",
    "EDGE",
    "DE",
    "DT",
    "NT",
  ];
  return DEF_POSITIONS.includes((pos || "").toUpperCase());
}

/**
 * Map BALLDONTLIE stat row to simple defensive metrics.
 * Adjust field names to match docs once you inspect NFL stats schema.
 */
function mapDefensiveStatsRow(row) {
  return {
    tackles: {
      solo: row.def_tackles_solo ?? row.tackles_solo ?? 0,
      assisted: row.def_tackles_assist ?? row.tackles_assist ?? 0,
      missed: row.missed_tackles ?? 0,
      stops: row.stops ?? 0,
    },
    passRush: {
      sacks: row.sacks ?? row.def_sacks ?? 0,
      pressures: row.pressures ?? 0,
      hits: row.qb_hits ?? 0,
    },
    coverage: {
      targets: row.targets ?? 0,
      receptionsAllowed: row.receptions_allowed ?? 0,
      yardsAllowed: row.yards_allowed ?? 0,
      tdsAllowed: row.tds_allowed ?? 0,
      interceptions: row.interceptions ?? 0,
      passBreakups: row.pass_breakups ?? 0,
    },
  };
}

async function computeAndSaveDefensiveMetricsForTeam(
  season,
  week,
  teamAbbrev
) {
  const team = teamAbbrev.toUpperCase();

  const [stats, snaps, players] = await Promise.all([
    getPlayerGameStatsByTeam(season, week, team),
    getPlayerSnapCountsByTeam(season, week, team),
    Player.find({ Team: team }),
  ]);

  const playerById = new Map();
  players.forEach((p) => playerById.set(p.PlayerID, p));

  const snapsByPlayerId = new Map();
  snaps.forEach((s) => {
    if (!s.player_id) return;
    snapsByPlayerId.set(s.player_id, s.snaps || null);
  });

  const results = [];

  for (const row of stats) {
    const playerId = row.player?.id;
    const teamAbbr = row.team?.abbreviation?.toUpperCase();
    if (!playerId || teamAbbr !== team) continue;

    const playerDoc = playerById.get(playerId);
    if (!playerDoc || !isDefensivePosition(playerDoc.Position)) continue;

    const mapped = mapDefensiveStatsRow(row);

    const update = {
      player: playerDoc._id,
      PlayerID: playerId,
      Team: team,
      Position: playerDoc.Position,
      season,
      week,
      snaps: {
        total: snapsByPlayerId.get(playerId) || null,
        run: null,
        pass: null,
      },
      coverage: mapped.coverage,
      tackling: mapped.tackles,
      passRush: mapped.passRush,
    };

    const doc = await DefensiveMetrics.findOneAndUpdate(
      { player: playerDoc._id, season, week },
      update,
      { new: true, upsert: true }
    );
    results.push(doc);
  }

  return results;
}

async function getDefensiveCardsFromDb(season, week, teamAbbrev) {
  const team = teamAbbrev.toUpperCase();
  const metrics = await DefensiveMetrics.find({
    Team: team,
    season,
    week,
  }).populate("player");

  return metrics.map((d) => ({
    cardType: "defense",
    playerId: d.player?._id,
    PlayerID: d.PlayerID,
    name: d.player?.FullName,
    team: d.Team,
    position: d.Position,
    photo: d.player?.PhotoUrl,
    snaps: d.snaps,
    coverage: d.coverage,
    tackling: d.tackling,
    passRush: d.passRush,
  }));
}

module.exports = {
  computeAndSaveDefensiveMetricsForTeam,
  getDefensiveCardsFromDb,
};
