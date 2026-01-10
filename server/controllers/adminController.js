// server/controllers/adminController.js

const axios = require('axios');
const BettingProp = require('../models/BettingProp');
const Odds = require('../models/Odds');
const { sendNotification } = require('../utils/notify');

const API_KEY = process.env.BDL_API_KEY;
const BASE = process.env.BALLDONTLIE_NFL_BASE_URL || 'https://api.balldontlie.io/nfl/v1';

const api = axios.create({
  baseURL: BASE,
  headers: { Authorization: `Bearer ${API_KEY}` },
  timeout: 15000,
});

function logAxiosError(label, err) {
  console.error(`❌ ${label} request failed`);
  console.error('STATUS:', err.response?.status);
  console.error('URL:', err.config?.baseURL + err.config?.url);
  console.error('DATA:', err.response?.data);
}

/**
 * POST /api/admin/sync-betting
 * Body: { season, week }
 * Performs a one-shot sync of odds and player props for the given season/week.
 * Returns JSON with success message, number of games, and arrays of game IDs
 * where odds or props were missing.
 */
exports.syncBettingData = async (req, res) => {
  const { season, week } = req.body;
  if (!season || !week) {
    return res.status(400).json({ error: 'season and week are required' });
  }

  console.log(`🔄 Starting sync for season ${season}, week ${week}`);

  try {
    // 1. Fetch games
    const { data: gamesRes } = await api.get('/games', {
      params: { season, week },
    });
    const games = gamesRes?.data || [];
    if (!games.length) {
      return res.status(404).json({ message: 'No games found' });
    }

    const gameIds = games.map((g) => g.id);
    const timestamp = new Date();
    let failedOdds = [];
    let failedProps = [];

    // 2. Sync odds and track missing odds
    try {
      const { data: oddsRes } = await api.get('/odds', {
        params: { season, week },
      });

      const seenOddsGameIds = new Set();
      for (const o of oddsRes?.data || []) {
        o.synced_at = timestamp;
        await Odds.updateOne(
          { game_id: o.game_id, vendor: o.vendor },
          o,
          { upsert: true }
        );
        if (o.game_id !== undefined) seenOddsGameIds.add(o.game_id);
      }
      failedOdds = gameIds.filter((id) => !seenOddsGameIds.has(id));
      console.log(`✅ Synced ${oddsRes?.data?.length || 0} odds`);
    } catch (err) {
      logAxiosError('odds', err);
      failedOdds = [...gameIds];
    }

    // 3. Sync player props and track missing props
    try {
      const { data: propsRes } = await api.get('/player-props', {
        params: { 'game_ids[]': gameIds },
      });

      const seenPropsGameIds = new Set();
      const props = propsRes?.data || [];
      for (const p of props) {
        p.synced_at = timestamp;
        await BettingProp.updateOne(
          {
            game_id: p.game_id,
            player_id: p.player_id,
            vendor: p.vendor,
            prop: p.prop,
          },
          p,
          { upsert: true }
        );
        if (p.game_id !== undefined) seenPropsGameIds.add(p.game_id);
      }
      failedProps = gameIds.filter((id) => !seenPropsGameIds.has(id));
      console.log(`✅ Synced ${props.length} player props`);
    } catch (err) {
      logAxiosError('player-props', err);
      failedProps = [...gameIds];
    }

    return res.json({
      message: `✅ Sync complete for week ${week}`,
      games: games.length,
      failedOdds,
      failedProps,
    });
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
    return res.status(500).json({ error: 'Sync failed', details: err.message });
  }
};
