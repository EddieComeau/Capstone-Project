// services/syncService.js
const Player = require("../models/Player");
const PlayerAdvancedMetrics = require("../models/PlayerAdvancedMetrics");

const {
  getAdvancedPlayerGameMetricsByWeek,
  getTeamPlayers,
} = require("./sportsdataService");

const {
  computeAndSaveLineMetricsForTeam,
} = require("./lineMetricsService");
const {
  computeAndSaveAdvancedLineMetricsForTeam,
} = require("./advancedLineService");
const {
  computeAndSaveSpecialTeamsForTeam,
} = require("./specialTeamsService");
const {
  computeAndSaveDefensiveMetricsForTeam,
} = require("./defensiveMetricsService");

/**
 * Sync roster for a team into Player collection.
 */
async function syncTeamPlayers(team) {
  const apiPlayers = await getTeamPlayers(team);
  if (!apiPlayers || !apiPlayers.length) return 0;

  const ops = apiPlayers.map((p) =>
    Player.findOneAndUpdate(
      { PlayerID: p.PlayerID },
      {
        PlayerID: p.PlayerID,
        FullName: p.Name,
        FirstName: p.FirstName,
        LastName: p.LastName,
        Team: p.Team,
        Position: p.Position,
        Status: p.Status,
        DepthChartPosition: p.DepthChartPosition,
        DepthChartOrder: p.DepthChartOrder,
        Jersey: p.JerseyNumber,
        Height: p.Height,
        Weight: p.Weight,
        BirthDate: p.BirthDate,
        College: p.College,
        Experience: p.Experience,
        PhotoUrl: p.PhotoUrl,
        FanDuelName: p.FanDuelName,
        DraftKingsName: p.DraftKingsName,
        SportsDataID: p.PlayerID,
      },
      { upsert: true, new: true }
    )
  );

  await Promise.all(ops);
  return apiPlayers.length;
}

/**
 * Sync advanced skill-position metrics for all players for a given week.
 * (Caches raw API metrics in PlayerAdvancedMetrics.)
 */
async function syncAdvancedMetricsWeek(season, week) {
  const metrics = await getAdvancedPlayerGameMetricsByWeek(season, week);
  if (!metrics || !metrics.length) return 0;

  // Preload all Players by PlayerID to map quickly
  const ids = metrics.map((m) => m.PlayerID);
  const players = await Player.find({ PlayerID: { $in: ids } });
  const playerMap = new Map(players.map((p) => [p.PlayerID, p]));

  const ops = metrics.map((m) => {
    const player = playerMap.get(m.PlayerID);
    if (!player) return null;

    return PlayerAdvancedMetrics.findOneAndUpdate(
      {
        PlayerID: m.PlayerID,
        season,
        week,
      },
      {
        player: player._id,
        PlayerID: m.PlayerID,
        Team: m.Team,
        Position: m.Position,
        season,
        week,
        metrics: m,
      },
      { upsert: true, new: true }
    );
  }).filter(Boolean);

  const res = await Promise.all(ops);
  return res.length;
}

/**
 * Sync all metric types for a given team/week.
 */
async function syncWeeklyForTeam(season, week, team) {
  const [rosterCount, advCount] = await Promise.all([
    syncTeamPlayers(team),
    syncAdvancedMetricsWeek(season, week),
  ]);

  const [lineBasic, lineAdv, st, def] = await Promise.all([
    computeAndSaveLineMetricsForTeam(season, week, team),
    computeAndSaveAdvancedLineMetricsForTeam(season, week, team),
    computeAndSaveSpecialTeamsForTeam(season, week, team),
    computeAndSaveDefensiveMetricsForTeam(season, week, team),
  ]);

  return {
    team,
    rosterSynced: rosterCount,
    advancedMetricsSynced: advCount,
    lineBasic,
    lineAdv,
    specialTeams: st,
    defense: def,
  };
}

module.exports = {
  syncTeamPlayers,
  syncAdvancedMetricsWeek,
  syncWeeklyForTeam,
};
