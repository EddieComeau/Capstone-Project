const Player = require("../models/Player");
const DefensiveMetrics = require("../models/DefensiveMetrics");
const {
  getPlayerGameStatsByTeam,
  getPlayerSnapCountsByTeam,
} = require("./sportsdataService");

// Determine if a player's position is defensive
function isDefensivePosition(pos) {
  const DEF_POS = [
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
  return DEF_POS.includes((pos || "").toUpperCase());
}

// Map a BDL stats row to our defensive metrics structure
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

/**
 * Compute and save defensive metrics for a team/season/week.
 */
async function computeAndSaveDefensiveMetricsForTeam(season, week, teamAbbrev) {
  const team = String(teamAbbrev || "").toUpperCase();
  const [stats, snaps, players] = await Promise.all([
    getPlayerGameStatsByTeam(season, week, team),
    getPlayerSnapCountsByTeam(season, week, team),
    Player.find({ "team.abbreviation": team }),
  ]);
  const playerById = new Map();
  players.forEach((p) => {
    const id = p.PlayerID || p.bdlId;
    playerById.set(id, p);
  });
  const snapsByPlayerId = new Map();
  snaps.forEach((s) => {
    if (!s.player_id) return;
    snapsByPlayerId.set(s.player_id, s.snaps || null);
  });
  const results = [];
  for (const row of stats) {
    const playerId = row.player?.id;
    const rowTeam = row.team?.abbreviation?.toUpperCase();
    if (!playerId || rowTeam !== team) continue;
    const p = playerById.get(playerId);
    if (!p || !isDefensivePosition(p.position)) continue;
    const mapped = mapDefensiveStatsRow(row);
    const update = {
      player: p._id,
      PlayerID: playerId,
      Team: team,
      Position: (p.position || "").toUpperCase(),
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
      { player: p._id, season, week },
      update,
      { new: true, upsert: true }
    );
    results.push(doc);
  }
  return results;
}

/**
 * Retrieve defensive cards for a team and format them.
 */
async function getDefensiveCardsFromDb(season, week, teamAbbrev) {
  const team = String(teamAbbrev || "").toUpperCase();
  const metrics = await DefensiveMetrics.find({ Team: team, season, week }).populate(
    "player"
  );
  return metrics.map((d) => {
    const p = d.player;
    const name =
      p?.full_name || `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim();
    const photo = p?.raw?.photoUrl || p?.raw?.headshot_url || null;
    return {
      cardType: "defense",
      playerId: p?._id,
      PlayerID: d.PlayerID,
      name,
      team: d.Team,
      position: d.Position,
      photo,
      snaps: d.snaps,
      coverage: d.coverage,
      tackling: d.tackling,
      passRush: d.passRush,
    };
  });
}

module.exports = {
  computeAndSaveDefensiveMetricsForTeam,
  getDefensiveCardsFromDb,
};
