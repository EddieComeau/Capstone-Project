// server/services/syncService.js
// Centralized sync logic for players, teams, games, stats and betting data.

const Injury = require('../models/Injury');
const Game = require('../models/Game');
const Player = require('../models/Player');
const PlayerProp = require('../models/PlayerProp');
const Play = require('../models/Play');
const Stat = require('../models/Stat');

// Import Team model.  The Team schema maps the Ball Don’t Lie team
// identifier (id) to the local `ballDontLieTeamId` field and stores
// additional attributes like name, abbreviation, conference, division,
// city and fullName.  We use this model when syncing teams from the API.
const Team = require('../models/Team');

const sportsdata = require('../services/sportsdataService');
const { bdlList } = require('../utils/apiUtils');
const { ensureTeam } = require('../utils/teamUtils');

// Batch size for bulk writes; tune via env var SYNC_BULK_BATCH_SIZE
const BULK_BATCH_SIZE = Number(process.env.SYNC_BULK_BATCH_SIZE || 500);

/**
 * Helper to flush queued bulk operations against a specific Mongoose model.
 *
 * We accept an array of operations (updateOne) and execute them using
 * `Model.bulkWrite`.  When an error occurs, the error is logged but not
 * rethrown.  The caller is responsible for interpreting the result.
 *
 * @param {Array} bulkOpsArr - Array of bulkWrite operations
 * @param {mongoose.Model} Model - The Mongoose model to execute against
 * @returns {Promise<{executed:number, result:any}>}
 */
async function flushBulkOpsForModel(bulkOpsArr, Model) {
  if (!bulkOpsArr || bulkOpsArr.length === 0) {
    return { executed: 0, result: null };
  }
  const ops = bulkOpsArr.splice(0, bulkOpsArr.length);
  try {
    const res = await Model.bulkWrite(ops, { ordered: false });
    return { executed: ops.length, result: res };
  } catch (err) {
    console.error(`❌ bulkWrite failed for model ${Model.modelName}:`, err && err.message ? err.message : err);
    return { executed: ops.length, result: err };
  }
}

/* -------------------------------------------------------------------------- */
/*                                Injuries                                     */
/* -------------------------------------------------------------------------- */

/**
 * Sync player injuries for a given season/week.  Data is pulled from
 * sportsdataService.getPlayerInjuries which wraps the BDL `/injuries` endpoint.
 * Records are upserted into the Injury collection keyed by `externalId`.
 *
 * @param {number} season - Season year (e.g., 2025)
 * @param {number} week - Week number (1–18)
 * @returns {Promise<number>} Total number of injury records synced
 */
async function syncInjuries(season, week) {
  const perPage = parseInt(process.env.SYNC_INJURIES_PER_PAGE || 100, 10);
  let cursor = null;
  let totalSynced = 0;

  while (true) {
    const injuries = await sportsdata.getPlayerInjuries({ season, week, per_page: perPage, cursor });
    if (!injuries || !injuries.data || injuries.data.length === 0) {
      break;
    }
    const data = injuries.data;
    const meta = injuries.meta || {};
    const ops = data.map((injury) => ({
      updateOne: {
        filter: { externalId: injury.id },
        update: { $set: injury },
        upsert: true,
      },
    }));
    await Injury.bulkWrite(ops);
    totalSynced += data.length;
    cursor = meta.next_cursor || meta.nextCursor || null;
    if (!cursor) break;
  }
  return totalSynced;
}

/* -------------------------------------------------------------------------- */
/*                              Advanced Stats                                 */
/* -------------------------------------------------------------------------- */

/**
 * Bulk write helper for advanced stat records.  Accepts an array of stat
 * objects and upserts them into the Stat collection keyed by `externalId`.
 *
 * @param {Array} stats - Array of stat objects from the BDL advanced endpoints
 * @returns {Promise<number>} Number of records inserted/updated
 */
async function bulkWriteStats(stats) {
  if (!stats || stats.length === 0) return 0;
  const ops = stats.map((stat) => ({
    updateOne: {
      filter: { externalId: stat.id },
      update: { $set: stat },
      upsert: true,
    },
  }));
  const result = await Stat.bulkWrite(ops);
  return result.upsertedCount + result.modifiedCount;
}

async function syncAdvancedRushing(season) {
  const payload = await bdlList('/advanced_stats/rushing', { season });
  const stats = payload && payload.data ? payload.data : [];
  return bulkWriteStats(stats);
}

async function syncAdvancedPassing(season) {
  const payload = await bdlList('/advanced_stats/passing', { season });
  const stats = payload && payload.data ? payload.data : [];
  return bulkWriteStats(stats);
}

async function syncAdvancedReceiving(season) {
  const payload = await bdlList('/advanced_stats/receiving', { season });
  const stats = payload && payload.data ? payload.data : [];
  return bulkWriteStats(stats);
}

/**
 * Synchronize NFL teams from the Ball Don’t Lie API.  This function
 * paginates through the `/teams` endpoint and upserts each team into
 * the Team collection keyed by `ballDontLieTeamId`.  The BDL API
 * returns fields such as id, name, abbreviation, conference, division,
 * location and full_name.  We map these fields to our schema.  A
 * cursor parameter is supported for resuming long-running syncs.
 *
 * Options:
 *  - per_page: number of teams per request (default 100, max 100)
 *  - cursor: starting cursor (useful for resuming)
 *  - maxPages: maximum number of pages to fetch (default 1000)
 *
 * @param {Object} options
 * @returns {Promise<{upsertCount:number, fetched:number, pages:number, next_cursor:string|null}>}
 */
async function syncTeams(options = {}) {
  const per_page = Number(options.per_page || 100);
  let cursor = options.cursor || null;
  let fetched = 0;
  let upsertCount = 0;
  const maxPages = Number(options.maxPages || 1000);
  let pageCount = 0;
  let previousCursor = null;
  console.log('🔁 syncTeams starting...');
  while (pageCount < maxPages) {
    pageCount++;
    const params = { per_page };
    if (cursor) params.cursor = cursor;
    const payload = await bdlList('/teams', params);
    const teams = payload && payload.data ? payload.data : [];
    const meta = payload && payload.meta ? payload.meta : {};
    fetched += teams.length;
    const bulkOps = [];
    for (const t of teams) {
      if (!t || t.id == null) continue;
      // Map Ball Don’t Lie fields to our Team schema.  Some fields may be
      // undefined on the API; default to null or empty strings as appropriate.
      const update = {
        ballDontLieTeamId: t.id,
        name: t.name || '',
        abbreviation: t.abbreviation || '',
        conference: t.conference || null,
        division: t.division || null,
        city: t.location || t.city || null,
        fullName: t.full_name || null,
        logoUrl: t.logo || t.logo_url || null,
        updatedAt: new Date(),
      };
      bulkOps.push({
        updateOne: {
          filter: { ballDontLieTeamId: t.id },
          update: { $set: update, $setOnInsert: { createdAt: new Date() } },
          upsert: true,
        },
      });
      // Flush bulk operations if we hit the batch size
      if (bulkOps.length >= BULK_BATCH_SIZE) {
        const { executed } = await flushBulkOpsForModel(bulkOps, Team);
        upsertCount += executed;
      }
    }
    // Flush any remaining operations
    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOpsForModel(bulkOps, Team);
      upsertCount += executed;
    }
    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    if (!nextCursor || teams.length === 0) {
      cursor = nextCursor;
      break;
    }
    // If the cursor did not advance, abort to prevent infinite loop
    if (cursor && cursor === previousCursor) {
      console.warn('⚠️ syncTeams cursor did not advance; aborting.');
      break;
    }
    previousCursor = cursor;
    cursor = nextCursor;
  }
  console.log(`✅ syncTeams complete — fetched: ${fetched}, upserted: ${upsertCount}, pages: ${pageCount}`);
  return { upsertCount, fetched, pages: pageCount, next_cursor: cursor };
}

/* -------------------------------------------------------------------------- */
/*                         Players, Teams, Games & Stats                       */
/* -------------------------------------------------------------------------- */

/**
 * Synchronize all players from the Ball Don’t Lie API.  This function uses
 * cursor-based pagination to iterate through the `/players` endpoint and
 * upserts records into the Player collection.  It writes in batches to
 * minimize MongoDB overhead.
 *
 * Options:
 *  - per_page: number of players per request (default 100, max 100)
 *  - cursor: starting cursor (useful for resuming)
 *  - maxPages: maximum number of pages to fetch (default 1000)
 *
 * @param {Object} options
 * @returns {Promise<{upsertCount:number, fetched:number, pages:number, next_cursor:string|null}>}
 */
async function syncPlayers(options = {}) {
  const per_page = Number(options.per_page || 100);
  let cursor = options.cursor || null;
  let fetched = 0;
  let upsertCount = 0;
  const maxPages = Number(options.maxPages || 1000);
  let pageCount = 0;
  let previousCursor = null;

  console.log('🔁 syncPlayers starting...');

  while (pageCount < maxPages) {
    pageCount++;
    const params = { per_page };
    if (cursor) params.cursor = cursor;
    const payload = await bdlList('/players', params);
    const players = payload && payload.data ? payload.data : [];
    const meta = payload && payload.meta ? payload.meta : {};
    fetched += players.length;
    const bulkOps = [];
    for (const p of players) {
      if (!p || !p.id) continue;
      const update = {
        PlayerID: p.id,
        bdlId: p.id,
        first_name: p.first_name || 'Unknown',
        last_name: p.last_name || 'Unknown',
        full_name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        position: p.position || '',
        team: p.team || null,
        raw: p,
        updatedAt: new Date(),
      };
      bulkOps.push({
        updateOne: {
          filter: { bdlId: p.id },
          update: { $set: update, $setOnInsert: { createdAt: new Date() } },
          upsert: true,
        },
      });
      if (bulkOps.length >= BULK_BATCH_SIZE) {
        const { executed } = await flushBulkOpsForModel(bulkOps, Player);
        upsertCount += executed;
      }
    }
    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOpsForModel(bulkOps, Player);
      upsertCount += executed;
    }
    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    if (!nextCursor || players.length === 0) {
      cursor = nextCursor;
      break;
    }
    if (cursor && cursor === previousCursor) {
      console.warn('⚠️ Cursor did not advance; aborting.');
      break;
    }
    previousCursor = cursor;
    cursor = nextCursor;
  }
  console.log(`✅ syncPlayers complete — fetched: ${fetched}, upserted: ${upsertCount}, pages: ${pageCount}`);
  return { upsertCount, fetched, pages: pageCount, next_cursor: cursor };
}

/**
 * Synchronize players for a single team.  Uses `ensureTeam` to ensure the
 * database contains the team record, then filters players by team id on
 * subsequent requests.
 *
 * @param {string} teamAbbrev - Team abbreviation (e.g. 'KC')
 * @returns {Promise<{upsertCount:number, next_cursor:string|null}>}
 */
async function syncTeamPlayers(teamAbbrev) {
  console.log(`🔁 syncTeamPlayers starting for ${teamAbbrev}...`);
  const { raw } = await ensureTeam(teamAbbrev);
  const teamId = raw && raw.id ? raw.id : null;
  if (!teamId) throw new Error(`Cannot determine BallDontLie team id for ${teamAbbrev}`);
  let upsertCount = 0;
  let cursor = null;
  let pageCount = 0;
  const maxPages = Number(process.env.SYNC_MAX_PAGES || 1000);
  let previousCursor = null;
  while (pageCount < maxPages) {
    pageCount++;
    const params = { per_page: 100, team_ids: [teamId] };
    if (cursor) params.cursor = cursor;
    const payload = await bdlList('/players', params);
    const players = payload && payload.data ? payload.data : [];
    const meta = payload && payload.meta ? payload.meta : {};
    const bulkOps = [];
    for (const p of players) {
      if (!p || !p.id) continue;
      const update = {
        PlayerID: p.id,
        bdlId: p.id,
        first_name: p.first_name || 'Unknown',
        last_name: p.last_name || 'Unknown',
        full_name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        position: p.position || '',
        team: p.team || null,
        raw: p,
        updatedAt: new Date(),
      };
      bulkOps.push({
        updateOne: {
          filter: { bdlId: p.id },
          update: { $set: update, $setOnInsert: { createdAt: new Date() } },
          upsert: true,
        },
      });
      if (bulkOps.length >= BULK_BATCH_SIZE) {
        const { executed } = await flushBulkOpsForModel(bulkOps, Player);
        upsertCount += executed;
      }
    }
    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOpsForModel(bulkOps, Player);
      upsertCount += executed;
    }
    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    if (!nextCursor || players.length === 0) {
      cursor = nextCursor;
      break;
    }
    if (cursor && cursor === previousCursor) {
      console.warn('⚠️ Cursor did not advance; aborting.');
      break;
    }
    previousCursor = cursor;
    cursor = nextCursor;
  }
  console.log(`✅ syncTeamPlayers complete for ${teamAbbrev} — upserted (approx): ${upsertCount}, pages: ${pageCount}`);
  return { upsertCount, next_cursor: cursor };
}

/**
 * Synchronize all games.  Iterates through the `/games` endpoint using
 * cursor-based pagination and upserts into the Game collection keyed by
 * `gameId`.  The BDL API returns `home_team_score` and `visitor_team_score`
 * which we map to `home_score` and `visitor_score` fields on our model.
 *
 * @param {Object} options - { per_page, cursor, maxPages }
 * @returns {Promise<{upsertCount:number, fetched:number, pages:number, next_cursor:string|null}>}
 */
async function syncGames(options = {}) {
  const per_page = Number(options.per_page || 100);
  let cursor = options.cursor || null;
  let fetched = 0;
  let upsertCount = 0;
  const maxPages = Number(options.maxPages || 1000);
  let pageCount = 0;
  let previousCursor = null;
  console.log('🔁 syncGames starting...');
  while (pageCount < maxPages) {
    pageCount++;
    const params = { per_page };
    if (cursor) params.cursor = cursor;
    const response = await bdlList('/games', params);
    const games = response && response.data ? response.data : [];
    const meta = response && response.meta ? response.meta : {};
    fetched += games.length;
    const bulkOps = [];
    for (const g of games) {
      if (!g || !g.id) continue;
      const update = {
        gameId: g.id,
        date: g.date ? new Date(g.date) : null,
        season: g.season || null,
        week: g.week || null,
        status: g.status || null,
        home_team: g.home_team || null,
        visitor_team: g.visitor_team || null,
        home_score: g.home_team_score != null ? g.home_team_score : g.home_score,
        visitor_score: g.visitor_team_score != null ? g.visitor_team_score : g.visitor_score,
        raw: g,
        updatedAt: new Date(),
      };
      bulkOps.push({
        updateOne: {
          filter: { gameId: g.id },
          update: { $set: update, $setOnInsert: { createdAt: new Date() } },
          upsert: true,
        },
      });
      if (bulkOps.length >= BULK_BATCH_SIZE) {
        const { executed } = await flushBulkOpsForModel(bulkOps, Game);
        upsertCount += executed;
      }
    }
    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOpsForModel(bulkOps, Game);
      upsertCount += executed;
    }
    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    if (!nextCursor || games.length === 0) {
      cursor = nextCursor;
      break;
    }
    if (cursor && cursor === previousCursor) {
      console.warn('⚠️ Cursor did not advance; aborting.');
      break;
    }
    previousCursor = cursor;
    cursor = nextCursor;
  }
  console.log(`✅ syncGames complete — fetched: ${fetched}, upserted: ${upsertCount}, pages: ${pageCount}`);
  return { upsertCount, fetched, pages: pageCount, next_cursor: cursor };
}

/**
 * Synchronize stats.  Fetches data from the `/stats` endpoint and upserts
 * records into the Stat collection.  Each stat record is keyed by either
 * `statId` (preferred) or the composite of `gameId` and `playerId` when
 * `statId` is absent.
 *
 * @param {Object} options - { per_page, cursor, maxPages }
 * @returns {Promise<{upsertCount:number, fetched:number, pages:number, next_cursor:string|null}>}
 */
async function syncStats(options = {}) {
  const per_page = Number(options.per_page || 100);
  let cursor = options.cursor || null;
  let fetched = 0;
  let upsertCount = 0;
  const maxPages = Number(options.maxPages || 1000);
  let pageCount = 0;
  let previousCursor = null;
  console.log('🔁 syncStats starting...');
  while (pageCount < maxPages) {
    pageCount++;
    const params = { per_page };
    if (cursor) params.cursor = cursor;
    const response = await bdlList('/stats', params);
    const stats = response && response.data ? response.data : [];
    const meta = response && response.meta ? response.meta : {};
    fetched += stats.length;
    const bulkOps = [];
    for (const s of stats) {
      if (!s) continue;
      const statId = s.id || null;
      const gameId = s.game_id || (s.game && s.game.id) || null;
      const playerId = s.player_id || (s.player && s.player.id) || null;
      const teamId = s.team_id || (s.team && s.team.id) || null;
      const update = {
        statId,
        gameId,
        playerId,
        teamId,
        season: s.season || null,
        week: s.week || null,
        stats: s.stats || s || {},
        raw: s,
        updatedAt: new Date(),
      };
      let filter;
      if (statId) filter = { statId };
      else if (gameId && playerId) filter = { gameId, playerId };
      else {
        console.warn('⚠️ Skipping stat record without statId or (gameId+playerId):', s);
        continue;
      }
      bulkOps.push({
        updateOne: {
          filter,
          update: { $set: update, $setOnInsert: { createdAt: new Date() } },
          upsert: true,
        },
      });
      if (bulkOps.length >= BULK_BATCH_SIZE) {
        const { executed } = await flushBulkOpsForModel(bulkOps, Stat);
        upsertCount += executed;
      }
    }
    if (bulkOps.length > 0) {
      const { executed } = await flushBulkOpsForModel(bulkOps, Stat);
      upsertCount += executed;
    }
    const nextCursor = meta.next_cursor || meta.nextCursor || null;
    if (!nextCursor || stats.length === 0) {
      cursor = nextCursor;
      break;
    }
    if (cursor && cursor === previousCursor) {
      console.warn('⚠️ Cursor did not advance; aborting.');
      break;
    }
    previousCursor = cursor;
    cursor = nextCursor;
  }
  console.log(`✅ syncStats complete — fetched: ${fetched}, upserted: ${upsertCount}, pages: ${pageCount}`);
  return { upsertCount, fetched, pages: pageCount, next_cursor: cursor };
}

/**
 * Synchronize weekly data for a single team.  Currently delegates to
 * syncTeamPlayers; returns the next_cursor for potential subsequent syncs.
 *
 * @param {number} season
 * @param {number} week
 * @param {string} teamAbbrev
 */
async function syncWeeklyForTeam(season, week, teamAbbrev) {
  console.log(`🔁 syncWeeklyForTeam: ${teamAbbrev} season ${season} week ${week}`);
  const res = await syncTeamPlayers(teamAbbrev);
  return { season, week, teamAbbrev, syncedPlayers: res.upsertCount, next_cursor: res.next_cursor };
}

/**
 * Synchronize players for all NFL teams for a given week.  Runs in batches
 * defined by the `concurrency` option.
 *
 * @param {number} season
 * @param {number} week
 * @param {Object} options
 * @param {number} [options.concurrency=2]
 * @returns {Promise<Object>} Summary of results
 */
async function syncAllTeamsForWeek(season, week, options = {}) {
  console.log(`🔁 syncAllTeamsForWeek: season ${season} week ${week}`);
  const concurrency = options.concurrency || 2;
  const teams = [
    'ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE',
    'DAL','DEN','DET','GB','HOU','IND','JAX','KC',
    'LAC','LAR','LV','MIA','MIN','NE','NO','NYG',
    'NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS'
  ];
  const results = [];
  for (let i = 0; i < teams.length; i += concurrency) {
    const batch = teams.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((teamAbbrev) =>
        syncWeeklyForTeam(season, week, teamAbbrev).catch((err) => {
          console.error(`❌ Error syncing team ${teamAbbrev}:`, err && err.message ? err.message : err);
          return { season, week, teamAbbrev, error: err && err.message ? err.message : String(err) };
        })
      )
    );
    results.push(...batchResults);
  }
  const successCount = results.filter((r) => !r.error).length;
  const errorCount = results.filter((r) => r.error).length;
  console.log(`✅ syncAllTeamsForWeek complete: ${successCount} success, ${errorCount} errors`);
  return { season, week, results, successCount, errorCount };
}

/* -------------------------------------------------------------------------- */
/*                         Odds, Player Props and Plays                        */
/* -------------------------------------------------------------------------- */

/**
 * Synchronize betting odds and player props for a given season/week.  For each
 * game in the specified week, we fetch odds and props from the sportsdata
 * service (which wraps Ball Don't Lie endpoints) and upsert them into the
 * appropriate collections.  Odds are stored directly on the Game document.
 * Player props are stored in the PlayerProp collection keyed by
 * (gameId, playerId, sportsbook, propType).
 *
 * @param {number} season
 * @param {number} week
 * @returns {Promise<{odds:number, props:number}>} Count of odds and prop records inserted
 */
async function syncOddsAndPropsForWeek(season, week) {
  const games = await Game.find({ season, week });
  let totalOdds = 0;
  let totalProps = 0;
  for (const game of games) {
    // Use the gameId (BDL ID) rather than an undefined externalId field
    const gameId = game.gameId;
    if (!gameId) continue;
    // Fetch odds and props for this game
    const oddsData = await sportsdata.getOddsForGame(gameId);
    const propsData = await sportsdata.getPropsForGame(gameId);
    // Odds: store the raw response on the game document
    if (oddsData && typeof oddsData === 'object') {
      await Game.updateOne({ _id: game._id }, { $set: { odds: oddsData } });
      totalOdds++;
    }
    // Player props: upsert each record into PlayerProp
    if (propsData && propsData.data && Array.isArray(propsData.data)) {
      const props = propsData.data;
      const propOps = props.map((prop) => {
        const gId = prop.game_id || gameId;
        const pId = prop.player_id || prop.playerId || null;
        const sportsbook = prop.vendor || prop.sportsbook || 'unknown';
        const propType = prop.prop_type || prop.type || 'unknown';
        const line = prop.line_value != null ? parseFloat(prop.line_value) : (prop.line || null);
        // Determine odds based on market type.  Milestone markets have a single odds value.
        let overOdds = null;
        let underOdds = null;
        if (prop.market && typeof prop.market === 'object') {
          if (prop.market.type === 'over_under') {
            overOdds = prop.market.over_odds;
            underOdds = prop.market.under_odds;
          } else if (prop.market.odds != null) {
            overOdds = prop.market.odds;
          }
        }
        const timestamp = prop.updated_at ? new Date(prop.updated_at) : (prop.timestamp ? new Date(prop.timestamp) : new Date());
        const update = {
          gameId: gId,
          playerId: pId,
          sportsbook,
          propType,
          line,
          overOdds,
          underOdds,
          timestamp,
          extra: prop,
        };
        return {
          updateOne: {
            filter: { gameId: gId, playerId: pId, sportsbook, propType },
            update: { $set: update },
            upsert: true,
          },
        };
      });
      if (propOps.length > 0) {
        await PlayerProp.bulkWrite(propOps);
        totalProps += props.length;
      }
    }
  }
  return { odds: totalOdds, props: totalProps };
}

/**
 * Synchronize remaining plays for games that have not yet fetched play data.
 * We look for Game documents where `playsFetched` is not true and fetch
 * play‑by‑play from the sportsdata service.  Each play is upserted into
 * the Play collection keyed by external play id, and the Game document is
 * marked as having fetched plays.
 */
async function syncRemainingPlays() {
  const games = await Game.find({ playsFetched: { $ne: true } });
  if (!games.length) {
    console.log('✅ No games missing plays');
    return;
  }
  console.log(`🔍 Found ${games.length} games missing plays`);
  for (const game of games) {
    const gameId = game.gameId;
    if (!gameId) continue;
    try {
      const response = await sportsdata.getPlays({ game_id: gameId, per_page: 100 });
      const plays = response && response.data ? response.data : [];
      if (!Array.isArray(plays) || plays.length === 0) {
        console.warn(`⚠️ No plays returned for game ${game._id}`);
        continue;
      }
      const ops = plays.map((play) => {
        // Prepare an update document.  We cast the play id to a string for consistency
        // since the Ball Don’t Lie API returns play ids as strings.  We also
        // attach the BDL gameId and persist the raw play data on the `data`
        // property to avoid polluting the schema with unknown fields.  If the
        // play id can be parsed as a number, we derive a sequence value; this
        // preserves ordering but is not required by the schema.
        const extId = play && play.id != null ? String(play.id) : undefined;
        const updateDoc = {
          externalId: extId,
          gameId: play.game_id || game.gameId,
          // derive sequence number when possible
          sequence: !isNaN(Number(play.id)) ? Number(play.id) : undefined,
          offense: play.offense_team || play.possession_team || play.offense || null,
          defense: play.defense_team || play.defense || null,
          quarter: play.period || play.quarter || null,
          timeRemaining: play.clock || play.time_remaining || null,
          down: play.start_down || play.down || null,
          distance: play.start_distance || play.distance || null,
          type: play.play_type || play.type || null,
          description: play.short_text || play.text || null,
          data: play,
        };
        // Remove undefined values so Mongoose does not set them explicitly
        Object.keys(updateDoc).forEach((k) => updateDoc[k] === undefined && delete updateDoc[k]);
        return {
          updateOne: {
            filter: { externalId: extId },
            update: { $set: updateDoc, $setOnInsert: { game: game._id, createdAt: new Date() } },
            upsert: true,
          },
        };
      });
      if (ops.length > 0) {
        await Play.bulkWrite(ops);
        await Game.updateOne({ _id: game._id }, { $set: { playsFetched: true } });
        console.log(`✅ Synced ${ops.length} plays for game ${game._id}`);
      } else {
        console.warn(`⚠️ No valid plays to sync for game ${game._id}`);
      }
    } catch (err) {
      console.error(`❌ Failed syncing plays for game ${game._id}:`, err.message);
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Exports                                    */
/* -------------------------------------------------------------------------- */

module.exports = {
  syncInjuries,
  syncOddsAndPropsForWeek,
  syncAdvancedRushing,
  syncAdvancedPassing,
  syncAdvancedReceiving,
  syncRemainingPlays,
  syncPlayers,
  syncTeamPlayers,
  syncGames,
  syncStats,
  syncWeeklyForTeam,
  syncAllTeamsForWeek,
  syncTeams,
};