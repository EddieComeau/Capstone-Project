// server/services/syncService.js
// All syncing logic centralized here.

const ballDontLieService = require('./ballDontLieService');

/**
 * Sync players from Ball Don't Lie NFL API.
 * Standardized single endpoint on backend: POST /api/players/sync
 *
 * Options can include:
 * - per_page
 * - cursor (if supported)
 * - search, team_ids, etc.
 */
async function syncPlayers(options = {}, { PlayerModel } = {}) {
  // PlayerModel is injected for easier testing; if not provided we lazy-require.
  const Player = PlayerModel || require('../models/Player');

  // Fetch first page (cursor-based or page-based depending on API behavior).
  // We keep this conservative and support 'cursor' if API returns next_cursor.
  const per_page = Number(options.per_page || 100);

  let cursor = options.cursor || null;
  let synced = 0;
  let fetched = 0;

  // limit safety to avoid infinite loops
  const maxPages = Number(options.maxPages || 50);
  let pageCount = 0;

  while (pageCount < maxPages) {
    pageCount += 1;

    const params = { ...options, per_page };
    if (cursor) params.cursor = cursor;

    const payload = await ballDontLieService.listPlayers(params);

    const data = payload && payload.data ? payload.data : payload;
    const meta = payload && payload.meta ? payload.meta : {};

    const players = Array.isArray(data) ? data : [];
    fetched += players.length;

    for (const p of players) {
      // Normalize a minimal schema to what we likely store.
      // Keep additional fields if present.
      const doc = {
        bdlId: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        full_name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        position: p.position,
        team: p.team || null,
        raw: p,
        updatedAt: new Date(),
      };

      await Player.updateOne(
        { bdlId: doc.bdlId },
        { $set: doc, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );
      synced += 1;
    }

    // Cursor-based pagination in BDL often uses meta.next_cursor.
    const nextCursor = meta.next_cursor || meta.nextCursor || null;

    if (!nextCursor || players.length === 0) break;
    cursor = nextCursor;
  }

  return {
    ok: true,
    fetched,
    synced,
    pages: pageCount,
    next_cursor: cursor,
  };
}

module.exports = {
  syncPlayers,
};
