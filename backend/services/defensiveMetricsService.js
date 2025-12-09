// services/defensiveMetricsService.js
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
  const DEF_POSITIONS = ["S", "FS", "SS", "CB", "DB", "LB", "ILB", "OLB", "MLB", "EDGE"];
  return DEF_POSITIONS.includes(pos);
}

/**
 * Compute & save defensive metrics for all defensive players on a team.
 * Uses player game stats + snap counts, with some assumptions.
 */
async function computeAndSaveDefensiveMetricsForTeam(season, week, team) {
  const [stats, snapCounts] = await Promise.all([
    getPlayerGameStatsByTeam(season, week, team),
    getPlayerSnapCountsByTeam(season, week, team),
  ]);

  const statMap = new Map((stats || []).map((s) => [s.PlayerID, s]));
  const snapMap = new Map((snapCounts || []).map((s) => [s.PlayerID, s]));

  const players = await Player.find({ Team: team });
  const ops = [];

  for (const player of players) {
    if (!isDefensivePosition(player.Position)) continue;

    const stat = statMap.get(player.PlayerID) || {};
    const snap = snapMap.get(player.PlayerID) || {};

    const snaps = {
      total: snap.Snaps || 0,
      box: snap.BoxSnaps || 0,
      slot: snap.SlotSnaps || 0,
      wide: snap.WideSnaps || 0,
      deep: snap.DeepSnaps || 0,
    };

    const coverage = {
      targets: stat.PassTargets ?? null,
      receptionsAllowed: stat.ReceptionsAllowed ?? null,
      yardsAllowed: stat.ReceivingYardsAllowed ?? null,
      touchdownsAllowed: stat.TouchdownsAllowed ?? null,
      interceptions: stat.Interceptions ?? 0,
      passBreakups: stat.PassesDefended ?? 0,
      qbRatingAllowed: stat.QBRatingAllowed ?? null,
    };

    const tackling = {
      tackles: stat.SoloTackles ?? 0,
      assisted: stat.AssistedTackles ?? 0,
      missed: stat.MissedTackles ?? null,
      stops: stat.Stops ?? null,
    };

    const passRush = {
      sacks: stat.Sacks ?? 0,
      pressures: stat.QuarterbackHits ?? null,
      hits: stat.QuarterbackHits ?? null,
    };

    ops.push(
      DefensiveMetrics.findOneAndUpdate(
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
          snaps,
          coverage,
          tackling,
          passRush,
        },
        { upsert: true, new: true }
      )
    );
  }

  const results = await Promise.all(ops);
  return { updated: results.length };
}

/**
 * Get defensive specialty cards from DB for a team/week.
 */
async function getDefensiveCardsFromDb(season, week, team) {
  const docs = await DefensiveMetrics.find({
    Team: team,
    season,
    week,
  }).populate("player");

  return docs.map((d) => ({
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
