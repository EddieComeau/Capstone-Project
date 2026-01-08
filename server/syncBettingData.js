/**
 * server/syncBettingData.js
 *
 * Sync Betting Odds + Player Props from the Ball Don't Lie NFL API into MongoDB.
 *
 * Why a separate script?
 * - Odds + Props are "volatile" (live-ish), and they can legitimately return 0 for many games.
 * - Keeping them out of your core sync avoids breaking the stable pipeline when sportsbooks data is empty.
 *
 * Notes from Ball Don't Lie docs:
 * - Betting odds: GET /nfl/v1/odds requires either (season + week) OR game_ids (array). Pagination supported.
 * - Odds availability: only from 2025 season, week 8 onwards (historical odds limited).
 * - Player props: GET /nfl/v1/odds/player_props requires game_id, returns all props in one response (no pagination).
 * - Player props are live and historical data is not stored; props may disappear near/after game completion.
 *
 * Usage (recommended):
 *   SEASON=2025 WEEK=8 node syncBettingData.js
 *
 * Usage (props for specific games):
 *   GAME_IDS=424150,424151 node syncBettingData.js --props-only
 *
 * Usage (odds for specific games):
 *   GAME_IDS=424150,424151 node syncBettingData.js --odds-only
 *
 * Optional env:
 *   PER_PAGE=100
 *   MAX_GAMES=50               # caps how many games we fetch props for
 *   PROPS_VENDORS=draftkings,betway   # optional vendors filter for props (array)
 *   PROPS_PLAYER_ID=490        # optional filter by player_id
 *   PROPS_PROP_TYPE=rushing_yards  # optional filter by prop_type
 *   DRY_RUN=true               # fetch but do not write to Mongo
 */

'use strict';

// 🔒 Load root .env no matter where script is run from
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('./db');
const Game = require('./models/Game');
const bdl = require('./services/ballDontLieService');

function parseBool(v, defaultVal = false) {
  if (v == null) return defaultVal;
  const s = String(v).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(s)) return true;
  if (['0', 'false', 'no', 'n'].includes(s)) return false;
  return defaultVal;
}

function parseNum(v, defaultVal = null) {
  if (v == null || v === '') return defaultVal;
  const n = Number(v);
  return Number.isFinite(n) ? n : defaultVal;
}

function parseCsv(v) {
  if (!v) return [];
  return String(v)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function parseGameIds(v) {
  return parseCsv(v).map(x => Number(x)).filter(n => Number.isFinite(n));
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function getArgFlag(name) {
  return process.argv.includes(name);
}

async function getGameIdsFromDB({ season, week, maxGames }) {
  const q = {};
  if (season != null) q.season = season;
  if (week != null) q.week = week;

  // Keep selection lean and predictable.
  const games = await Game.find(q).select('gameId season week').lean().limit(maxGames || 1000);
  return games
    .map(g => ({ gameId: g.gameId, season: g.season, week: g.week }))
    .filter(g => g.gameId != null);
}

async function upsertMany({ collectionName, docs, idField = 'id', batchSize = 250, dryRun = false }) {
  if (!docs.length) return { upserted: 0, modified: 0, matched: 0 };

  if (dryRun) {
    console.log(`🧪 DRY_RUN: would upsert ${docs.length} docs into "${collectionName}"`);
    return { upserted: 0, modified: 0, matched: 0 };
  }

  const col = mongoose.connection.collection(collectionName);
  let upserted = 0, modified = 0, matched = 0;

  for (const batch of chunk(docs, batchSize)) {
    const ops = batch.map(doc => {
      const key = doc[idField];
      return {
        updateOne: {
          filter: { [idField]: key },
          update: {
            $set: { ...doc, synced_at: new Date() },
            $setOnInsert: { created_at: new Date() },
          },
          upsert: true,
        },
      };
    });

    const res = await col.bulkWrite(ops, { ordered: false });
    upserted += res.upsertedCount || 0;
    modified += res.modifiedCount || 0;
    matched += res.matchedCount || 0;
  }

  return { upserted, modified, matched };
}

async function syncOdds({ season, week, gameIds, perPage = 100, dryRun = false }) {
  console.log('🎲 syncOdds starting...');
  const paramsBase = { per_page: perPage };

  if (season != null && week != null) {
    paramsBase.season = season;
    paramsBase.week = week;
    console.log(`🎲 Odds mode: season=${season} week=${week}`);
  } else if (gameIds.length) {
    paramsBase.game_ids = gameIds;
    console.log(`🎲 Odds mode: game_ids=[${gameIds.length}]`);
  } else {
    console.log('⚠️  Skipping odds: provide (SEASON + WEEK) OR GAME_IDS.');
    return;
  }

  let cursor = null;
  let fetched = 0;
  let page = 0;

  while (true) {
    page += 1;
    const params = { ...paramsBase };
    if (cursor) params.cursor = cursor;

    try {
      const res = await bdl.listOdds(params);
      const rows = Array.isArray(res?.data) ? res.data : [];
      const meta = res?.meta || {};
      fetched += rows.length;

      console.log(`📄 Odds page ${page}: received ${rows.length} rows (total=${fetched})`);

      // Store raw odds rows; include season/week if known for easy querying downstream.
      const docs = rows.map(o => ({
        ...o,
        season: season ?? null,
        week: week ?? null,
      }));

      await upsertMany({ collectionName: 'odds', docs, idField: 'id', dryRun });

      cursor = meta?.next_cursor || null;
      if (!cursor) break;
    } catch (err) {
      const status = err?.response?.status;
      console.error(`❌ Odds fetch failed on page ${page} (status=${status || 'n/a'}):`, err?.message || err);
      // If odds fails (e.g., out-of-coverage week), don't crash the whole script.
      break;
    }
  }

  console.log('✅ syncOdds complete');
}

async function syncPlayerProps({
  gameEntries,
  maxGames = 50,
  vendors = [],
  playerId = null,
  propType = null,
  dryRun = false,
}) {
  console.log('🎯 syncPlayerProps starting...');
  const entries = gameEntries.slice(0, maxGames);

  if (!entries.length) {
    console.log('⚠️  No games available for props. Skipping.');
    return;
  }

  let totalGames = 0;
  let totalProps = 0;

  for (const { gameId, season, week } of entries) {
    totalGames += 1;
    console.log(`🔁 props: game ${gameId}`);

    try {
      const params = { game_id: gameId };
      if (vendors.length) params.vendors = vendors;
      if (playerId != null) params.player_id = playerId;
      if (propType) params.prop_type = propType;

      const res = await bdl.listOddsPlayerProps(params);
      const rows = Array.isArray(res?.data) ? res.data : [];

      // Player props returns all props in one response. 0 is a valid result.
      console.log(`   received props: ${rows.length}`);

      totalProps += rows.length;

      const docs = rows.map(p => ({
        ...p,
        season: season ?? null,
        week: week ?? null,
      }));

      await upsertMany({ collectionName: 'playerprops', docs, idField: 'id', dryRun });
    } catch (err) {
      const status = err?.response?.status;
      console.error(`⚠️ props failed for game ${gameId} (status=${status || 'n/a'}):`, err?.message || err);
      // Continue with other games.
      continue;
    }
  }

  console.log(`✅ syncPlayerProps complete — games=${totalGames}, props=${totalProps}`);
}

async function main() {
  const dryRun = parseBool(process.env.DRY_RUN, getArgFlag('--dry-run'));
  const perPage = parseNum(process.env.PER_PAGE, 100);
  const maxGames = parseNum(process.env.MAX_GAMES, 50);

  const season = parseNum(process.env.SEASON ?? process.env.BET_SEASON, null);
  const week = parseNum(process.env.WEEK ?? process.env.BET_WEEK, null);

  const gameIdsFromEnv = parseGameIds(process.env.GAME_IDS ?? process.env.BET_GAME_IDS);

  const oddsOnly = getArgFlag('--odds-only');
  const propsOnly = getArgFlag('--props-only');
  const doOdds = oddsOnly ? true : propsOnly ? false : true;
  const doProps = propsOnly ? true : oddsOnly ? false : true;

  const propsVendors = parseCsv(process.env.PROPS_VENDORS ?? process.env.BET_PROPS_VENDORS);
  const propsPlayerId = parseNum(process.env.PROPS_PLAYER_ID, null);
  const propsPropType = process.env.PROPS_PROP_TYPE ?? null;

  await connectDB();

  // Build game list for props
  let gameEntries = [];

  if (gameIdsFromEnv.length) {
    // If the user passed GAME_IDS, we can still try to enrich season/week from DB,
    // but it is optional.
    const found = await Game.find({ gameId: { $in: gameIdsFromEnv } })
      .select('gameId season week')
      .lean();
    const map = new Map(found.map(g => [g.gameId, g]));
    gameEntries = gameIdsFromEnv.map(id => ({
      gameId: id,
      season: map.get(id)?.season ?? null,
      week: map.get(id)?.week ?? null,
    }));
  } else if (season != null && week != null) {
    gameEntries = await getGameIdsFromDB({ season, week, maxGames: 1000 });
  }

  const gameIds = gameEntries.map(g => g.gameId);

  console.log('==============================');
  console.log('syncBettingData config:');
  console.log({ season, week, perPage, maxGames, dryRun, doOdds, doProps, gameIdsCount: gameIds.length });
  console.log('==============================');

  try {
    if (doOdds) {
      await syncOdds({ season, week, gameIds, perPage, dryRun });
    }
    if (doProps) {
      await syncPlayerProps({
        gameEntries,
        maxGames,
        vendors: propsVendors,
        playerId: propsPlayerId,
        propType: propsPropType,
        dryRun,
      });
    }
  } finally {
    await mongoose.connection.close();
  }
}

main().catch(err => {
  console.error('❌ syncBettingData fatal error:', err);
  process.exit(1);
});