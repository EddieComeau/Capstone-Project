// server/services/desiredService.js
//
// This service contains functions for syncing advanced player/team
// metrics from the Ball Don’t Lie API, computing derived statistics
// from your existing Stat documents, and aggregating those results
// into a unified AdvancedMetric collection.  It also includes
// helpers for computing league standings, matchups and syncing
// injuries from the API.
//
// NOTE: This file mirrors the upstream `derivedService.js` from
// EddieComeau/Capstone‑Project.  It is added here as
// `desiredService.js` so that `fullSyncService.js` can import it
// without throwing a module resolution error.

const AdvancedMetric = require('../models/AdvancedMetric');
const Game = require('../models/Game');
const Stat = require('../models/Stat');
const Standing = require('../models/Standing');
const Matchup = require('../models/Matchup');
const Injury = require('../models/Injury');
const SyncState = require('../models/SyncState');

const ballDontLieService = require('./ballDontLieService');

const BULK_BATCH_SIZE = Number(process.env.SYNC_BULK_BATCH_SIZE || 500);

/* ---------------------- SyncState helpers (cursor persistence) ---------------------- */
async function getSyncCursor(key) {
  if (!key) return null;
  const doc = await SyncState.findOne({ key }).lean();
  return doc ? doc.cursor : null;
}

async function setSyncCursor(key, cursor, meta = null) {
  if (!key) return;
  await SyncState.updateOne(
    { key },
    {
      $set: {
        key,
        cursor: cursor || null,
        meta: meta || null,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  return cursor;
}

/* ---------------------- Utilities ---------------------------------------------- */
function buildMergedMetrics(bdl = null, computed = null) {
  // bdl preferred. If bdl contains nested metrics, try bdl.metrics
  const b = bdl && bdl.metrics ? bdl.metrics : bdl || {};
  const c = computed && computed.metrics ? computed.metrics : computed || {};
  const merged = {};
  // copy all computed values first (fallback)
  for (const [k, v] of Object.entries(c)) merged[k] = v;
  // overwrite with bdl values where present
  for (const [k, v] of Object.entries(b)) merged[k] = v;
  return merged;
}

/* ---------------------- BDL advanced stats sync (with persistence) -------------- */
/**
 * Sync advanced stats from BDL for a given type.
 * type: 'rushing'|'passing'|'receiving'
 * options: { season, per_page, maxPages, resume=true, persist=true, scope='season' }
 */
async function syncAdvancedStatsEndpoint(type, options = {}) {
  if (!['rushing', 'passing', 'receiving'].includes(type)) throw new Error('Invalid advanced stats type');
  if (!options.season) throw new Error('season is required');

  const per_page = Number(options.per_page || 100);
  const maxPages = Number(options.maxPages || 1000);
  const resume = options.resume !== false; // default true
  const persist = options.persist !== false; // default true
  const scope = options.scope || 'season';
  const key = `advanced_${type}_season_${options.season}_scope_${scope}`;

  let cursor = null;
  if (resume) cursor = (await getSyncCursor(key)) || options.cursor || null;
  let pageCount = 0;
  let fetched = 0;
  let upsertCount = 0;

  while (pageCount < maxPages) {
    pageCount++;
    const params = { per_page, season: options.season };
    if (cursor) params.cursor = cursor;
    if (options.player_id) params.player_id = options.player_id;
    if ('postseason' in options) params.postseason = options.postseason;
    if ('week' in options) params.week = options.week;

    console.log(`📄 Fetching advanced_stats/${type} page ${pageCount} params:`, JSON.stringify(params));

    let res;
    if (type === 'rushing') res = await ballDontLieService.listAdvancedRushing(params);
    else if (type === 'passing') res = await ballDontLieService.listAdvancedPassing(params);
    else res = await ballDontLieService.listAdvancedReceiving(params);

    const items = res && res.data ? res.data : [];
    const meta = res && res.meta ? res.meta : {};
    fetched += items.length;

    if (!items || items.length === 0) {
      const nextCursor = meta.next_cursor || meta.nextCursor || null;
      if (persist) await setSyncCursor(key, nextCursor, meta);
      break;
    }

    // Upsert each player advanced record into AdvancedMetric.sources.bdl
    const ops = [];
    for (const rec of items) {
      const playerId = rec.player_id || (rec.player && rec.player.id);
      if (!playerId) continue;
      const season = rec.season || options.season;
      const filter = { entityType: 'player', entityId: playerId, season, scope };
      const update = {
        $set: {
          entityType: 'player',
          entityId: playerId,
          season,
          scope,
          'sources.bdl': rec,
          raw: { bdl: rec },
          updatedAt: new Date(),
        },
      };
      ops.push({ updateOne: { filter, update, upsert: true } });
      if (ops.length >= BULK_BATCH_SIZE) {
        const { result } = await AdvancedMetric.bulkWrite(ops.splice(0, ops.length), { ordered: false });
        upsertCount += result && result.nUpserted ? result.nUpserted : 0;
      }
    }
    if (ops.length > 0) {
      const { result } = await AdvancedMetric.bulkWrite(ops, { ordered: false });
      upsertCount += result && result.nUpserted ? result.nUpserted : 0;
    }

    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    if (persist) await setSyncCursor(key, nextCursor, meta);
    if (!nextCursor) {
      cursor = nextCursor;
      break;
    }
    cursor = nextCursor;
  }

  // After BDL ingestion, run merge for players we updated (for this season + scope)
  await mergeAdvancedSourcesForSeason('player', options.season, scope);

  return { upsertCount, fetched, pages: pageCount, next_cursor: await getSyncCursor(key) };
}

/* -------------------- Compute generic advanced stats from Stat docs -------------- */
/**
 * computeAdvancedStats: compute sums & averages from Stat docs and write to
 * sources.computed, then compute specific metrics and merge.
 */
async function computeAdvancedStats() {
  console.log('🔧 computeAdvancedStats: starting computed stats...');
  // Player-season aggregation (sums & averages)
  const playerAgg = Stat.aggregate([
    { $match: { playerId: { $ne: null } } },
    {
      $group: {
        _id: { playerId: '$playerId', season: '$season' },
        count: { $sum: 1 },
        statsList: { $push: '$stats' },
      },
    },
  ])
    .cursor({ batchSize: 200 });

  for await (const g of playerAgg) {
    const playerId = g._id.playerId;
    const season = g._id.season;
    const count = g.count || 0;
    const list = g.statsList || [];
    // sum numeric fields
    const sums = {};
    for (const s of list) {
      if (!s || typeof s !== 'object') continue;
      for (const [k, v] of Object.entries(s)) {
        const num = typeof v === 'number' ? v : typeof v === 'string' && !isNaN(Number(v)) ? Number(v) : null;
        if (num == null) continue;
        sums[k] = (sums[k] || 0) + num;
      }
    }
    // averages
    const averages = {};
    for (const [k, v] of Object.entries(sums)) averages[k] = v / Math.max(1, count);
    const scope = 'season';
    const filter = { entityType: 'player', entityId: playerId, season, scope };
    const computedObj = { gameCount: count, sums, averages };
    await AdvancedMetric.updateOne(
      filter,
      {
        $set: {
          'sources.computed': computedObj,
          raw: { computed: computedObj },
          updatedAt: new Date(),
        },
        $setOnInsert: { entityType: 'player', entityId: playerId, season, scope },
      },
      { upsert: true }
    );
    // compute specific advanced metrics (QB passer rating etc) for this player-season
    await computeSpecificMetricsForPlayerSeason(playerId, season, scope);
    // merge sources into metrics
    await mergeAdvancedSources('player', playerId, season, scope);
  }
  // Team-season computed aggregation
  const teamAgg = Stat.aggregate([
    { $match: { teamId: { $ne: null } } },
    {
      $group: {
        _id: { teamId: '$teamId', season: '$season' },
        count: { $sum: 1 },
        statsList: { $push: '$stats' },
      },
    },
  ])
    .cursor({ batchSize: 200 });
  for await (const g of teamAgg) {
    const teamId = g._id.teamId;
    const season = g._id.season;
    const count = g.count || 0;
    const list = g.statsList || [];
    const sums = {};
    for (const s of list) {
      if (!s || typeof s !== 'object') continue;
      for (const [k, v] of Object.entries(s)) {
        const num = typeof v === 'number' ? v : typeof v === 'string' && !isNaN(Number(v)) ? Number(v) : null;
        if (num == null) continue;
        sums[k] = (sums[k] || 0) + num;
      }
    }
    const averages = {};
    for (const [k, v] of Object.entries(sums)) averages[k] = v / Math.max(1, count);
    const scope = 'season';
    const filter = { entityType: 'team', entityId: teamId, season, scope };
    const computedObj = { gameCount: count, sums, averages };
    await AdvancedMetric.updateOne(
      filter,
      {
        $set: {
          'sources.computed': computedObj,
          raw: { computed: computedObj },
          updatedAt: new Date(),
        },
        $setOnInsert: { entityType: 'team', entityId: teamId, season, scope },
      },
      { upsert: true }
    );
    // compute specific team metrics if needed
    await computeSpecificMetricsForTeamSeason(teamId, season, scope);
    await mergeAdvancedSources('team', teamId, season, scope);
  }
  console.log('🔧 computeAdvancedStats: done (computed + merged).');
}

/* -------------------- Compute specific metrics (QB passer rating etc) ----- */
async function computeSpecificMetricsForPlayerSeason(playerId, season, scope = 'season') {
  const filter = { entityType: 'player', entityId: playerId, season, scope };
  const doc = await AdvancedMetric.findOne(filter).lean();
  if (!doc) return null;
  const computed = doc.sources && doc.sources.computed ? doc.sources.computed : null;
  if (!computed) return null;
  const sums = computed.sums || {};
  const averages = computed.averages || {};
  const gameCount = computed.gameCount || 0;
  // helper resolver for multiple possible keys
  const pickNum = (keys) => {
    for (const k of keys) {
      if (sums[k] !== undefined && sums[k] !== null) return Number(sums[k]);
      if (averages[k] !== undefined && averages[k] !== null) return Number(averages[k]) * Math.max(1, gameCount);
    }
    return 0;
  };
  const attempts = pickNum(['passing_attempts', 'pass_attempts', 'attempts', 'pass_att']);
  const completions = pickNum(['passing_completions', 'completions', 'pass_comp']);
  const passing_yards = pickNum(['passing_yards', 'pass_yards', 'passing_yards_total']);
  const passing_tds = pickNum(['passing_tds', 'pass_tds', 'passing_touchdowns']);
  const interceptions = pickNum(['interceptions', 'ints', 'passing_ints']);
  // Avoid division by zero
  const completion_pct = attempts > 0 ? completions / attempts : 0;
  const yards_per_attempt = attempts > 0 ? passing_yards / attempts : 0;
  // NFL passer rating components
  let passer_rating = null;
  if (attempts > 0) {
    const a = Math.min(Math.max(((completion_pct * 100) - 30) / 20, 0), 2.375);
    const b = Math.min(Math.max((yards_per_attempt - 3) / 4, 0), 2.375);
    const c = Math.min(Math.max((passing_tds / attempts) * 20, 0), 2.375);
    const d = Math.min(Math.max(2.375 - ((interceptions / attempts) * 25), 0), 2.375);
    passer_rating = ((a + b + c + d) / 6) * 100;
    passer_rating = Number(passer_rating.toFixed(1));
  }
  // receiving / targets
  const receptions = pickNum(['receptions', 'rec', 'receiving_receptions']);
  const targets = pickNum(['targets', 'receiving_targets', 'target']);
  const receiving_yards = pickNum(['receiving_yards', 'rec_yards']);
  const catch_rate = targets > 0 ? receptions / targets : 0;
  const yards_per_target = targets > 0 ? receiving_yards / targets : 0;
  // rushing
  const rush_attempts = pickNum(['rush_attempts', 'rushing_attempts', 'rush_att']);
  const rush_yards = pickNum(['rush_yards', 'rushing_yards']);
  const yards_per_carry = rush_attempts > 0 ? rush_yards / rush_attempts : 0;
  const specific = {
    passer_rating,
    completion_pct: Number((completion_pct * 100).toFixed(1)), // percent
    yards_per_attempt: Number(yards_per_attempt.toFixed(2)),
    yards_per_carry: Number(yards_per_carry.toFixed(2)),
    catch_rate: Number((catch_rate * 100).toFixed(1)),
    yards_per_target: Number(yards_per_target.toFixed(2)),
  };
  // write into sources.computed.specific and keep merged
  await AdvancedMetric.updateOne(filter, { $set: { 'sources.computed.specific': specific, updatedAt: new Date() } }, { upsert: true });
  return specific;
}

async function computeSpecificMetricsForTeamSeason(teamId, season, scope = 'season') {
  const filter = { entityType: 'team', entityId: teamId, season, scope };
  const doc = await AdvancedMetric.findOne(filter).lean();
  if (!doc) return null;
  const computed = doc.sources && doc.sources.computed ? doc.sources.computed : null;
  if (!computed) return null;
  const sums = computed.sums || {};
  const gameCount = computed.gameCount || 0;
  const pickNum = (keys) => {
    for (const k of keys) {
      if (sums[k] !== undefined && sums[k] !== null) return Number(sums[k]);
    }
    return 0;
  };
  const passing_yards = pickNum(['passing_yards', 'pass_yards']);
  const rushing_yards = pickNum(['rushing_yards', 'rush_yards']);
  const scoring = pickNum(['points', 'scoring', 'points_for']);
  const metrics = {
    passing_yards_per_game: gameCount > 0 ? Number((passing_yards / gameCount).toFixed(2)) : 0,
    rushing_yards_per_game: gameCount > 0 ? Number((rushing_yards / gameCount).toFixed(2)) : 0,
    points_per_game: gameCount > 0 ? Number((scoring / gameCount).toFixed(2)) : 0,
  };
  await AdvancedMetric.updateOne(filter, { $set: { 'sources.computed.specific': metrics, updatedAt: new Date() } }, { upsert: true });
  return metrics;
}

/* -------------------- Merge function for single entity -------------------- */
async function mergeAdvancedSources(entityType, entityId, season, scope = 'season') {
  const filter = { entityType, entityId, season, scope };
  const doc = await AdvancedMetric.findOne(filter).lean();
  if (!doc) return null;
  const bdl = doc.sources && doc.sources.bdl ? doc.sources.bdl : null;
  const computed = doc.sources && doc.sources.computed ? doc.sources.computed : null;
  const bdlMetrics = bdl && bdl.metrics ? bdl.metrics : bdl || {};
  const computedMetrics = computed && computed.metrics ? computed.metrics : computed && computed.averages ? computed.averages : computed || {};
  const merged = buildMergedMetrics(bdlMetrics, computedMetrics);
  if (computed && computed.specific) {
    for (const [k, v] of Object.entries(computed.specific)) {
      if (merged[k] === undefined || merged[k] === null) merged[k] = v;
    }
  }
  const gameCount = (computed && computed.gameCount) || doc.gameCount || (bdl && (bdl.games || bdl.gameCount)) || 0;
  await AdvancedMetric.updateOne(filter, { $set: { metrics: merged, gameCount, updatedAt: new Date() } });
  return merged;
}

/* Helper to merge all players/teams for a season/scope */
async function mergeAdvancedSourcesForSeason(entityType, season, scope = 'season') {
  const docs = await AdvancedMetric.find({ entityType, season, scope }).lean();
  for (const d of docs) {
    await mergeAdvancedSources(entityType, d.entityId, season, scope);
  }
}

/* -------------------- computeStandings & computeMatchups (kept) ---------- */
async function computeStandings() {
  const seasons = await Game.distinct('season');
  for (const season of seasons) {
    const games = await Game.find({ season }).lean();
    const byTeam = {};
    for (const g of games) {
      const homeScore = g.score && g.score.home;
      const visitorScore = g.score && g.score.visitor;
      if (homeScore == null || visitorScore == null) continue;
      const homeId = g.home_team && g.home_team.id;
      const visitorId = g.visitor_team && g.visitor_team.id;
      if (!homeId || !visitorId) continue;
      if (!byTeam[homeId]) byTeam[homeId] = { wins: 0, losses: 0, ties: 0, PF: 0, PA: 0, games: 0 };
      if (!byTeam[visitorId]) byTeam[visitorId] = { wins: 0, losses: 0, ties: 0, PF: 0, PA: 0, games: 0 };
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
    const ops = [];
    for (const [teamIdStr, data] of Object.entries(byTeam)) {
      const teamId = Number(teamIdStr);
      const wins = data.wins || 0;
      const losses = data.losses || 0;
      const ties = data.ties || 0;
      const PF = data.PF || 0;
      const PA = data.PA || 0;
      const total = wins + losses + ties;
      const winPct = total > 0 ? Number(((wins + ties * 0.5) / total).toFixed(3)) : 0;
      ops.push({
        updateOne: {
          filter: { teamId, season },
          update: {
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
            },
          },
          upsert: true,
        },
      });
      if (ops.length >= BULK_BATCH_SIZE) {
        await Standing.bulkWrite(ops.splice(0, ops.length), { ordered: false });
      }
    }
    if (ops.length) await Standing.bulkWrite(ops, { ordered: false });
    console.log(`Standings computed for season ${season}`);
  }
}

async function computeMatchups() {
  const gamesCursor = Game.find({}).cursor();
  for await (const g of gamesCursor) {
    // Determine BallDon'tLie game identifier; fallback to id or _id if needed
    const bdlGameId = g.gameId || g.id || g._id;
    const season = g.season;
    const week = g.week;
    const homeTeamId = g.home_team && g.home_team.id;
    const visitorTeamId = g.visitor_team && g.visitor_team.id;
    const homeMetric = homeTeamId
      ? await AdvancedMetric.findOne({ entityType: 'team', entityId: homeTeamId, season, scope: 'season' }).lean()
      : null;
    const visitorMetric = visitorTeamId
      ? await AdvancedMetric.findOne({ entityType: 'team', entityId: visitorTeamId, season, scope: 'season' }).lean()
      : null;
    const keysToCompare = ['rushing_yards', 'receiving_yards', 'passing_yards', 'points', 'turnovers'];
    const homeMetricsObj = homeMetric && homeMetric.metrics ? homeMetric.metrics : {};
    const visitorMetricsObj = visitorMetric && visitorMetric.metrics ? visitorMetric.metrics : {};
    const comparison = {};
    for (const key of keysToCompare) {
      const h = Number(homeMetricsObj[key] || 0);
      const v = Number(visitorMetricsObj[key] || 0);
      comparison[key] = { home: h, visitor: v, diff: Number((h - v).toFixed(3)) };
    }
    // Use ballDontLieGameId as unique identifier; set both ballDontLieGameId and gameId for compatibility
    await Matchup.updateOne(
      { ballDontLieGameId: bdlGameId },
      {
        $set: {
          ballDontLieGameId: bdlGameId,
          gameId: bdlGameId,
          season,
          week,
          homeTeamId,
          visitorTeamId,
          homeMetrics: homeMetricsObj,
          visitorMetrics: visitorMetricsObj,
          comparison,
          raw: g,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }
}

/* -------------------- Injuries: same as earlier -------------------- */
async function syncInjuriesFromAPI(options = {}) {
  const per_page = Number(options.per_page || 100);
  const maxPages = Number(options.maxPages || 1000);
  const persist = options.persist !== false;
  const resume = options.resume !== false;
  const key = 'player_injuries';
  let cursor = resume ? await getSyncCursor(key) : options.cursor || null;
  let pageCount = 0,
    fetched = 0,
    upsertCount = 0,
    previousCursor = null;
  while (pageCount < maxPages) {
    pageCount++;
    const params = { per_page };
    if (cursor) params.cursor = cursor;
    if (options.team_ids) params.team_ids = options.team_ids;
    if (options.player_ids) params.player_ids = options.player_ids;
    console.log(`📄 Fetching injuries page ${pageCount} params:`, JSON.stringify(params));
    const response = await ballDontLieService.listPlayerInjuries(params);
    const items = response && response.data ? response.data : [];
    const meta = response && response.meta ? response.meta : {};
    fetched += items.length;
    if (cursor && cursor === previousCursor) {
      console.warn('Cursor did not advance; stopping');
      break;
    }
    for (const rec of items) {
      if (!rec || !rec.player) continue;
      const player = rec.player;
      const team = player.team || {};
      const playerId = player.id || null;
      const teamId = team.id || null;
      const status = rec.status || 'Unknown';
      const description = rec.comment || '';
      const reportedAt = rec.date ? new Date(rec.date) : new Date();
      const filter = {};
      if (playerId != null) filter.playerId = playerId;
      if (teamId != null) filter.teamId = teamId;
      if (reportedAt) filter.reportedAt = reportedAt;
      const upsertFilter = filter.reportedAt
        ? filter
        : { playerId: filter.playerId, teamId: filter.teamId, status };
      const updateDoc = {
        playerId,
        teamId,
        status,
        description,
        source: 'balldontlie',
        reportedAt,
        raw: rec,
        updatedAt: new Date(),
      };
      try {
        await Injury.updateOne(upsertFilter, { $set: updateDoc }, { upsert: true });
        upsertCount++;
      } catch (err) {
        console.warn('Failed injury upsert', err && err.message ? err.message : err);
      }
    }
    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    if (persist) await setSyncCursor(key, nextCursor, meta);
    if (!nextCursor || items.length === 0) {
      cursor = nextCursor;
      break;
    }
    previousCursor = cursor;
    cursor = nextCursor;
  }
  console.log(`Injuries sync done — fetched ${fetched}, upserted ${upsertCount}, pages ${pageCount}`);
  return { upsertCount, fetched, pages: pageCount, next_cursor: await getSyncCursor('player_injuries') };
}

/* -------------------- Export -------------------- */
module.exports = {
  // BDL advanced & season sync
  syncAdvancedStatsEndpoint,
  // computed
  computeAdvancedStats,
  computeSpecificMetricsForPlayerSeason,
  computeSpecificMetricsForTeamSeason,
  mergeAdvancedSources,
  mergeAdvancedSourcesForSeason,
  // other derived
  computeStandings,
  computeMatchups,
  // injuries
  syncInjuriesFromAPI,
};