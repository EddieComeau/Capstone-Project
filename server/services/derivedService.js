// server/services/derivedService.js
const ballDontLie = require('./ballDontLieService');
const { bdlList } = require('../utils/apiUtils');

const TeamSeasonStat = require('../models/TeamSeasonStat');
const TeamStat = require('../models/TeamStat');
const AdvancedMetric = require('../models/AdvancedMetric');
const Play = require('../models/Play');
const Odds = require('../models/Odds');
const PlayerProp = require('../models/PlayerProp');
const Injury = require('../models/Injury');

const BULK_BATCH_SIZE = Number(process.env.SYNC_BULK_BATCH_SIZE || 500);

/**
 * Generic upsert helper for an array of docs and a model.
 */
async function upsertBulkForModel(items, model, keyFn) {
  if (!Array.isArray(items) || items.length === 0) return { upserted: 0 };
  const ops = [];
  for (const it of items) {
    const { filter, update } = keyFn(it);
    ops.push({
      updateOne: {
        filter,
        update: { $set: update, $setOnInsert: { createdAt: new Date() } },
        upsert: true
      }
    });
    if (ops.length >= BULK_BATCH_SIZE) {
      await model.bulkWrite(ops.splice(0, ops.length), { ordered: false });
    }
  }
  if (ops.length) await model.bulkWrite(ops, { ordered: false });
  return { upserted: items.length };
}

/* ----------------- Standings ----------------- */
async function syncStandingsFromAPI({ season, per_page = 100 } = {}) {
  season = Number(season || new Date().getFullYear());
  let cursor = null;
  let page = 0;
  const rows = [];
  while (true) {
    const params = { season, per_page };
    if (cursor) params.cursor = cursor;
    const payload = await ballDontLie.listStandings(params);
    const data = payload && payload.data ? payload.data : [];
    const meta = payload && payload.meta ? payload.meta : {};
    if (!data || data.length === 0) break;
    // upsert per team standing into TeamSeasonStat or AdvancedMetric
    // We'll transform each item into TeamSeasonStat shape
    const toUpsert = data.map(d => ({
      teamId: d.team?.id || d.team_id,
      season,
      postseason: false,
      stats: d,
      raw: d
    }));
    await upsertBulkForModel(toUpsert, TeamSeasonStat, (it) => ({
      filter: { teamId: it.teamId, season: it.season },
      update: it
    }));
    rows.push(...toUpsert);
    cursor = meta.next_cursor || meta.nextCursor || null;
    page++;
    if (!cursor) break;
  }
  return { ok: true, pages: page, rowsCount: rows.length };
}

/* ----------------- Team season stats ----------------- */
async function syncTeamSeasonStats({ season, team_ids = [], per_page = 100 } = {}) {
  if (!season) throw new Error('season is required');
  let cursor = null;
  let page = 0;
  let total = 0;
  while (true) {
    const params = { season, per_page };
    if (team_ids && team_ids.length > 0) params.team_ids = team_ids;
    if (cursor) params.cursor = cursor;
    const payload = await ballDontLie.listTeamSeasonStats(params);
    const data = payload && payload.data ? payload.data : [];
    const meta = payload && payload.meta ? payload.meta : {};
    if (!data || data.length === 0) break;
    const toUpsert = data.map(d => ({
      teamId: d.team_id || (d.team && d.team.id),
      season,
      postseason: !!d.postseason,
      stats: d,
      raw: d
    }));
    await upsertBulkForModel(toUpsert, TeamSeasonStat, it => ({
      filter: { teamId: it.teamId, season: it.season, postseason: it.postseason },
      update: it
    }));
    total += toUpsert.length;
    cursor = meta.next_cursor || meta.nextCursor || null;
    page++;
    if (!cursor) break;
  }
  return { ok: true, pages: page, total };
}

/* ----------------- Team stats (per game) ----------------- */
async function syncTeamStats({ per_page = 100, seasons = [], team_ids = [] } = {}) {
  let cursor = null;
  let page = 0;
  let total = 0;
  while (true) {
    const params = { per_page };
    if (seasons && seasons.length) params.seasons = seasons;
    if (team_ids && team_ids.length) params.team_ids = team_ids;
    if (cursor) params.cursor = cursor;
    const payload = await ballDontLie.listTeamStats(params);
    const data = payload && payload.data ? payload.data : [];
    const meta = payload && payload.meta ? payload.meta : {};
    if (!data || data.length === 0) break;
    const toUpsert = data.map(d => ({
      teamId: d.team?.id || d.team_id,
      gameId: d.game_id || (d.game && d.game.id),
      season: d.season,
      week: d.week,
      stats: d,
      raw: d
    }));
    await upsertBulkForModel(toUpsert, TeamStat, it => ({
      filter: { teamId: it.teamId, gameId: it.gameId },
      update: it
    }));
    total += toUpsert.length;
    cursor = meta.next_cursor || meta.nextCursor || null;
    page++;
    if (!cursor) break;
  }
  return { ok: true, pages: page, total };
}

/* ----------------- Advanced stats endpoints ----------------- */
async function syncAdvancedStatsEndpoint(type = 'rushing', options = {}) {
  // type: 'rushing'|'passing'|'receiving'
  const fnMap = {
    rushing: ballDontLie.listAdvancedRushing,
    passing: ballDontLie.listAdvancedPassing,
    receiving: ballDontLie.listAdvancedReceiving
  };
  const fn = fnMap[type];
  if (!fn) throw new Error('Unsupported advanced stat type: ' + type);
  let cursor = null;
  let page = 0;
  let total = 0;
  const per_page = Number(options.per_page || 100);
  const season = options.season || null;

  while (true) {
    const params = { per_page };
    if (season) params.season = season;
    if (cursor) params.cursor = cursor;
    const payload = await fn(params);
    const data = payload && payload.data ? payload.data : [];
    const meta = payload && payload.meta ? payload.meta : {};
    if (!data || data.length === 0) break;
    // transform into AdvancedMetric documents
    const toUpsert = data.map(d => {
      const entityType = d.player ? 'player' : 'team';
      const entityId = (d.player && d.player.id) || (d.team && d.team.id) || null;
      const key = `advanced:${type}:season:${season || 'all'}:${entityType}:${entityId}`;
      return {
        key,
        entityType,
        entityId,
        season,
        scope: 'season',
        metrics: d,
        sources: { bdl: d },
        raw: d
      };
    });
    await upsertBulkForModel(toUpsert, AdvancedMetric, it => ({
      filter: { key: it.key },
      update: it
    }));
    total += toUpsert.length;
    cursor = meta.next_cursor || meta.nextCursor || null;
    page++;
    if (!cursor) break;
  }
  return { ok: true, pages: page, total };
}

/* ----------------- Plays ----------------- */
async function syncPlays({ game_id, per_page = 100 } = {}) {
  if (!game_id) throw new Error('game_id is required for plays sync');
  let cursor = null;
  let page = 0;
  let total = 0;
  while (true) {
    const params = { per_page, game_id };
    if (cursor) params.cursor = cursor;
    const payload = await ballDontLie.listPlays(params);
    const data = payload && payload.data ? payload.data : [];
    const meta = payload && payload.meta ? payload.meta : {};
    if (!data || data.length === 0) break;
    const toUpsert = data.map((d, idx) => ({
      playId: d.id || `${game_id}_${idx}`,
      gameId: game_id,
      sequence: d.sequence || idx,
      raw: d
    }));
    await upsertBulkForModel(toUpsert, Play, it => ({
      filter: { playId: it.playId },
      update: it
    }));
    total += toUpsert.length;
    cursor = meta.next_cursor || meta.nextCursor || null;
    page++;
    if (!cursor) break;
  }
  return { ok: true, pages: page, total };
}

/* ----------------- Odds ----------------- */
async function syncOdds({ season, week, per_page = 100, game_ids } = {}) {
  let cursor = null;
  let page = 0;
  let total = 0;
  while (true) {
    const params = { per_page };
    if (season !== undefined) params.season = season;
    if (week !== undefined) params.week = week;
    if (game_ids && game_ids.length) params.game_ids = game_ids;
    if (cursor) params.cursor = cursor;
    const payload = await ballDontLie.listOdds(params);
    const data = payload && payload.data ? payload.data : [];
    const meta = payload && payload.meta ? payload.meta : {};
    if (!data || data.length === 0) break;
    // each item may contain vendor-specific odds per game
    const toUpsert = [];
    for (const d of data) {
      const gameId = d.game_id || (d.game && d.game.id);
      const vendor = d.vendor || null;
      const id = `${gameId}_${vendor || 'v'}`;
      toUpsert.push({
        oddsId: id,
        gameId,
        vendor,
        payload: d,
        raw: d
      });
    }
    await upsertBulkForModel(toUpsert, Odds, it => ({ filter: { oddsId: it.oddsId }, update: it }));
    total += toUpsert.length;
    cursor = meta.next_cursor || meta.nextCursor || null;
    page++;
    if (!cursor) break;
  }
  return { ok: true, pages: page, total };
}

/* ----------------- Player props (single-game no pagination supported) ----------------- */
async function syncPlayerProps({ game_id, vendor, player_id, prop_type } = {}) {
  if (!game_id) throw new Error('game_id required for player props');
  const params = { game_id };
  if (player_id) params.player_id = player_id;
  if (vendor) params.vendors = Array.isArray(vendor) ? vendor : [vendor];

  // According to docs this returns entire payload in one response
  const payload = await ballDontLie.listOddsPlayerProps(params);
  const data = payload && payload.data ? payload.data : payload;

  // data is array of props
  const rows = Array.isArray(data) ? data : (data.data || []);
  const toUpsert = rows.map(r => ({
    gameId: game_id,
    playerId: r.player_id || (r.player && r.player.id),
    vendor: r.vendor || vendor,
    prop_type: r.prop_type,
    value: r.value || null,
    payload: r
  }));
  await upsertBulkForModel(toUpsert, PlayerProp, it => ({ filter: { gameId: it.gameId, playerId: it.playerId, vendor: it.vendor, prop_type: it.prop_type }, update: it }));
  return { ok: true, total: toUpsert.length };
}

/* ----------------- Injuries ----------------- */
async function syncInjuriesFromAPI({ per_page = 100, team_ids = [], player_ids = [] } = {}) {
  let cursor = null;
  let page = 0;
  let total = 0;
  while (true) {
    const params = { per_page };
    if (team_ids && team_ids.length) params.team_ids = team_ids;
    if (player_ids && player_ids.length) params.player_ids = player_ids;
    if (cursor) params.cursor = cursor;
    const payload = await ballDontLie.listPlayerInjuries(params);
    const data = payload && payload.data ? payload.data : [];
    const meta = payload && payload.meta ? payload.meta : {};
    if (!data || data.length === 0) break;
    const toUpsert = data.map(d => ({
      player: d.player,
      status: d.status,
      comment: d.comment,
      date: d.date ? new Date(d.date) : null,
      bdlId: d.player && d.player.id ? d.player.id : null,
      raw: d
    }));
    await upsertBulkForModel(toUpsert, Injury, it => ({ filter: { bdlId: it.bdlId, date: it.date }, update: it }));
    total += toUpsert.length;
    cursor = meta.next_cursor || meta.nextCursor || null;
    page++;
    if (!cursor) break;
  }
  return { ok: true, pages: page, total };
}

/* ----------------- Compute / orchestration ----------------- */
async function computeAllDerived(options = {}) {
  // High-level orchestrator: call advanced stats syncs and team season / standings / plays / odds / injuries as needed
  const res = {};
  if (options.syncStandings !== false) res.standings = await syncStandingsFromAPI({ season: options.season });
  if (options.syncTeamSeason !== false) res.teamSeason = await syncTeamSeasonStats({ season: options.season });
  if (options.syncAdvanced !== false) {
    res.adv_rushing = await syncAdvancedStatsEndpoint('rushing', { season: options.season });
    res.adv_passing = await syncAdvancedStatsEndpoint('passing', { season: options.season });
    res.adv_receiving = await syncAdvancedStatsEndpoint('receiving', { season: options.season });
  }
  if (options.syncInjuries !== false) res.injuries = await syncInjuriesFromAPI({ per_page: options.per_page || 100 });
  return res;
}

module.exports = {
  syncStandingsFromAPI,
  syncTeamSeasonStats,
  syncTeamStats,
  syncAdvancedStatsEndpoint,
  syncPlays,
  syncOdds,
  syncPlayerProps,
  syncInjuriesFromAPI,
  computeAllDerived
};
