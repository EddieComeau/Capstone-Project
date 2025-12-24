// routes/livePlay.js
//
// Streams live play‑by‑play updates to clients via server‑sent events (SSE).
// Clients can subscribe to `/api/live-play/:gameId` to receive
// push notifications whenever a new play occurs in the specified game.
//
// To stop receiving updates, the client simply closes the connection.

const express = require('express');
const livePlayService = require('../services/livePlayService');

const router = express.Router();

/**
 * SSE endpoint for live play‑by‑play.
 *
 * Usage: GET /api/live-play/12345
 *
 * This will establish an event-stream that pushes JSON play objects.
 */
router.get('/:gameId', async (req, res) => {
  const gameId = Number(req.params.gameId);
  if (!gameId) {
    return res.status(400).json({ error: 'gameId parameter is required' });
  }
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Immediately flush headers
  res.flushHeaders && res.flushHeaders();
  // Listener function to write play events to the SSE stream
  const onPlay = ({ gameId: gid, play }) => {
    if (gid !== gameId) return;
    try {
      const data = JSON.stringify(play);
      res.write(`data: ${data}\n\n`);
    } catch (err) {
      console.warn('livePlay route: failed to send play', err && err.message ? err.message : err);
    }
  };
  // Subscribe to play events
  livePlayService.on('play', onPlay);
  // Start polling for this game
  livePlayService.startGame(gameId);
  // Clean up when client disconnects
  req.on('close', () => {
    livePlayService.off('play', onPlay);
    livePlayService.stopGame(gameId);
    res.end();
  });
});

module.exports = router;