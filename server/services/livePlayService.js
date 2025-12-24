// services/livePlayService.js
//
// Provides a simple polling-based live play-by-play sync.  This service
// uses the BallDon'tLie NFL `/nfl/v1/plays` endpoint to fetch the latest
// plays for a given game and emits events as new plays arrive.  It is
// designed to support a server-sent events (SSE) or WebSocket endpoint
// that pushes live updates to connected clients.

const EventEmitter = require('events');
const ballDontLieService = require('./ballDontLieService');

/**
 * LivePlaySync class
 *
 * Maintains polling workers per game ID.  Each worker regularly
 * requests new plays from the BDL API and emits a `play` event
 * whenever a play is returned.  Consumers can subscribe to the
 * `play` event to receive updates and can start/stop polling per
 * game ID.  Polling frequency is configurable via the
 * `LIVE_PLAY_POLL_MS` environment variable (default 10000ms).
 */
class LivePlaySync extends EventEmitter {
  constructor() {
    super();
    this.gameWorkers = {};
    this.pollInterval = Number(process.env.LIVE_PLAY_POLL_MS) || 10000;
  }

  /**
   * Start polling for a specific game ID.  If a worker already
   * exists, this call is a no-op.  The first poll is executed
   * immediately to deliver any existing plays.
   *
   * @param {number} gameId
   */
  startGame(gameId) {
    if (!gameId) return;
    if (this.gameWorkers[gameId]) {
      return;
    }
    let cursor = null;
    const poll = async () => {
      try {
        const params = { per_page: 100, game_id: gameId };
        if (cursor) params.cursor = cursor;
        const res = await ballDontLieService.listPlays(params);
        const plays = (res && res.data) || [];
        const meta = (res && res.meta) || {};
        // Update cursor for next poll
        cursor = meta.next_cursor || meta.nextCursor || null;
        // Emit each play event
        for (const play of plays) {
          this.emit('play', { gameId, play });
        }
      } catch (err) {
        console.warn(`livePlayService: poll error for game ${gameId}`, err && err.message ? err.message : err);
      }
    };
    // Execute initial poll
    poll();
    // Store worker with interval id and cursor state
    const intervalId = setInterval(poll, this.pollInterval);
    this.gameWorkers[gameId] = { intervalId };
  }

  /**
   * Stop polling for a specific game ID and clean up the worker.
   *
   * @param {number} gameId
   */
  stopGame(gameId) {
    const worker = this.gameWorkers[gameId];
    if (worker) {
      clearInterval(worker.intervalId);
      delete this.gameWorkers[gameId];
    }
  }
}

// Export a singleton instance
module.exports = new LivePlaySync();