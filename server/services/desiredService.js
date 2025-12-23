// server/services/derivedService.js
const Game = require("../models/Game");
const Stat = require("../models/Stat");
const Standing = require("../models/Standing");
const AdvancedMetric = require("../models/AdvancedMetric");
const Matchup = require("../models/Matchup");
const Injury = require("../models/Injury");
const mongoose = require("mongoose");

/**
 * Compute Standings from Game documents:
 * For each season found in games, compute per-team W/L/T, PF, PA, winPct and upsert to Standing.
 */
async function computeStandings(options = {}) {
  console.log("🔧 computeStandings: starting...");

  // get distinct seasons
  const seasons = await Game.distinct("season");
  for (const season of seasons) {
    console.log(`  → Computing standings for season ${season}`);
    const games = await Game.find({ season }).lean();

    const byTeam = {}; // key: teamId -> { wins, losses, ties, PF, PA }

    for (const g of games) {
      // ensure scores exist
      const homeScore = g.score?.home;
      const visitorScore = g.score?.visitor;
      if (homeScore == null || visitorScore == null) continue;

      const homeId = g.home_team?.id;
      const visitorId = g.visitor_team?.id;
      if (!homeId || !visitorId) continue;

      if (!byTeam[homeId]) byTeam[homeId] = { wins:0, losses:0, ties:0, PF:0, PA:0, games:0 };
      if (!byTeam[visitorId]) byTeam[visitorId] = { wins:0, losses:0, ties:0, PF:0, PA:0, games:0 };

      byTeam[homeId].PF += Number(homeScore);
      byTeam[homeId].PA += Number(visitorScore);
      byTeam[homeId].games++;

      byTeam[visitorId].PF += Number(visitorScore);
      byTeam[visitorId].PA += Number(homeScore);
      byTeam[visitorId].games++;

      if (homeScore > visitorScore) {
        byTeam[homeId].wins++;
        byTeam[visitorId].losses++;
      } else if (homeScore < visitorScore) {
        byTeam[visitorId].wins++;
        byTeam[homeId].losses++;
      } else {
        byTeam[homeId].ties++;
        byTeam[visitorId].ties++;
      }
    }

    // Upsert standings
    for (const [teamIdStr, data] of Object.entries(byTeam)) {
      const teamId = Number(teamIdStr);
      const wins = data.wins || 0;
      const losses = data.losses || 0;
      const ties = data.ties || 0;
      const PF = data.PF || 0;
      const PA = data.PA || 0;
      const totalPlayed = wins + losses + ties;
      const winPct = totalPlayed > 0 ? Number((wins + ties * 0.5) / totalPlayed) : 0;

      await Standing.updateOne(
        { teamId, season },
        {
          $set: {
            teamId,
            season,
            wins,
            losses,
            ties,
            pointsFor: PF,
            pointsAgainst: PA,
            winPct,
            raw: data,
            updatedAt: new Date(),
          }
        },
        { upsert: true }
      );
    }

    console.log(`  → Standings computed for season ${season} (${Object.keys(byTeam).length} teams)`);
  }

  console.log("🔧 computeStandings: done.");
}

/**
 * Compute Advanced metrics for players/teams:
 * - Summation and per-game averages of numeric keys in Stat.stats
 * This is intentionally generic: it sums numeric fields and divides by games count.
 */
async function computeAdvancedStats(options = {}) {
  console.log("🔧 computeAdvancedStats: starting...");

  // Get distinct player+season combos from Stat records
  const cursor = Stat.aggregate([
    {
      $group: {
        _id: { playerId: "$playerId", season: "$season" },
        count: { $sum: 1 },
        statsList: { $push: "$stats" },
      }
    }
  ]).cursor({ batchSize: 200 }).exec();

  for await (const grouping of cursor) {
    const playerId = grouping._id.playerId;
    const season = grouping._id.season;
    const count = grouping.count;
    const statsList = grouping.statsList || [];

    // sum numeric keys
    const sums = {};
    for (const s of statsList) {
      if (!s || typeof s !== "object") continue;
      for (const [k,v] of Object.entries(s)) {
        const num = (typeof v === "number") ? v : (typeof v === "string" && !isNaN(Number(v)) ? Number(v) : null);
        if (num == null) continue;
        sums[k] = (sums[k] || 0) + num;
      }
    }

    // compute per-game averages
    const averages = {};
    for (const [k,v] of Object.entries(sums)) {
      averages[k] = v / Math.max(1, count);
    }

    // Upsert advanced metric
    await AdvancedMetric.updateOne(
      { entityType: "player", entityId: playerId, season, scope: "season" },
      { $set: { entityType: "player", entityId: playerId, season, scope: "season", gameCount: count, metrics: { sums, averages }, raw: { sums, averages } } },
      { upsert: true }
    );
  }

  console.log("🔧 computeAdvancedStats: player-season metrics computed.");

  // Team-level advanced metrics (aggregate all player stats per team-season)
  // We will aggregate stats by teamId in Stat collection if teamId is available
  const teamCursor = Stat.aggregate([
    { $group: { _id: { teamId: "$teamId", season: "$season" }, count: { $sum: 1 }, statsList: { $push: "$stats" } } }
  ]).cursor({ batchSize: 200 }).exec();

  for await (const grouping of teamCursor) {
    const teamId = grouping._id.teamId;
    const season = grouping._id.season;
    const count = grouping.count;
    const statsList = grouping.statsList || [];

    const sums = {};
    for (const s of statsList) {
      if (!s || typeof s !== "object") continue;
      for (const [k,v] of Object.entries(s)) {
        const num = (typeof v === "number") ? v : (typeof v === "string" && !isNaN(Number(v)) ? Number(v) : null);
        if (num == null) continue;
        sums[k] = (sums[k] || 0) + num;
      }
    }

    const averages = {};
    for (const [k,v] of Object.entries(sums)) {
      averages[k] = v / Math.max(1, count);
    }

    await AdvancedMetric.updateOne(
      { entityType: "team", entityId: teamId, season, scope: "season" },
      { $set: { entityType: "team", entityId: teamId, season, scope: "season", gameCount: count, metrics: { sums, averages }, raw: { sums, averages } } },
      { upsert: true }
    );
  }

  console.log("🔧 computeAdvancedStats: team-season metrics computed.");
}

/**
 * Compute Matchups:
 * For each Game, compute a matchup document using team AdvancedMetric for that season.
 * If a matchup already exists, it will be overwritten (idempotent).
 */
async function computeMatchups(options = {}) {
  console.log("🔧 computeMatchups: starting...");

  // find all games
  const games = await Game.find({}).lean();
  for (const g of games) {
    const gameId = g.gameId || g.id || g._id;
    const season = g.season;
    const week = g.week;
    const homeTeamId = g.home_team?.id;
    const visitorTeamId = g.visitor_team?.id;

    // fetch advanced metrics for the season
    const homeMetric = homeTeamId ? await AdvancedMetric.findOne({ entityType: "team", entityId: homeTeamId, season, scope: "season" }).lean() : null;
    const visitorMetric = visitorTeamId ? await AdvancedMetric.findOne({ entityType: "team", entityId: visitorTeamId, season, scope: "season" }).lean() : null;

    // produce a simple comparison: difference of a few key averages if available
    const comparison = {};
    const keysToCompare = ["rushing_yards", "receiving_yards", "passing_yards", "points", "turnovers"];
    const homeMetricsObj = (homeMetric && homeMetric.metrics && homeMetric.metrics.averages) ? homeMetric.metrics.averages : {};
    const visitorMetricsObj = (visitorMetric && visitorMetric.metrics && visitorMetric.metrics.averages) ? visitorMetric.metrics.averages : {};

    for (const key of keysToCompare) {
      const h = Number(homeMetricsObj[key] || 0);
      const v = Number(visitorMetricsObj[key] || 0);
      comparison[key] = { home: h, visitor: v, diff: Number((h - v).toFixed(3)) };
    }

    await Matchup.updateOne(
      { gameId },
      {
        $set: {
          gameId,
          season,
          week,
          homeTeamId,
          visitorTeamId,
          homeMetrics: homeMetricsObj,
          visitorMetrics: visitorMetricsObj,
          comparison,
          raw: g,
          updatedAt: new Date(),
        }
      },
      { upsert: true }
    );
  }

  console.log("🔧 computeMatchups: done.");
}

/**
 * Sync injuries from a JSON feed or record list.
 * - Accepts an array of injury objects with at minimum: playerId, teamId, status, reportedAt
 * - Upserts into Injury collection
 *
 * Example usage:
 *   await syncInjuriesFromArray([{playerId: 123, teamId: 10, status:"Questionable", description:"Hamstring", reportedAt: "2025-08-01", source: "feedXYZ"}]);
 */
async function syncInjuriesFromArray(injuriesArray = [], options = {}) {
  console.log(`🔧 syncInjuriesFromArray: ingesting ${injuriesArray.length} records...`);
  for (const rec of injuriesArray) {
    const playerId = rec.playerId || rec.player_id || (rec.player && rec.player.id);
    const teamId = rec.teamId || rec.team_id || (rec.team && rec.team.id);
    if (!playerId && !teamId) {
      console.warn("Skipping injury record with no playerId/teamId:", rec);
      continue;
    }
    const filter = {};
    if (playerId) filter.playerId = playerId;
    if (teamId) filter.teamId = teamId;
    if (rec.reportedAt) filter.reportedAt = new Date(rec.reportedAt);

    const updateDoc = {
      $set: {
        playerId: playerId || null,
        teamId: teamId || null,
        status: rec.status || rec.injury_status || "Unknown",
        description: rec.description || rec.notes || "",
        source: rec.source || "manual",
        reportedAt: rec.reportedAt ? new Date(rec.reportedAt) : new Date(),
        raw: rec,
        updatedAt: new Date(),
      }
    };

    // Upsert: if there is a matching player+team+reportedAt use that; else use playerId+teamId+status
    const upsertFilter = (filter.reportedAt) ? filter : { playerId: filter.playerId, teamId: filter.teamId, status: updateDoc.$set.status };
    await Injury.updateOne(upsertFilter, updateDoc, { upsert: true });
  }

  console.log("🔧 syncInjuriesFromArray: done.");
}

module.exports = {
  computeStandings,
  computeAdvancedStats,
  computeMatchups,
  syncInjuriesFromArray,
};
