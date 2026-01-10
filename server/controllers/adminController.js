const axios = require('axios');
const BettingProp = require('../models/BettingProp');
const Odds = require('../models/Odds');

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

exports.syncBettingData = async (req, res) => {
  const { season, week } = req.body;

  if (!season || !week) {
    return res.status(400).json({ error: 'season and week are required' });
  }

  console.log(`🔄 Starting sync for season ${season}, week ${week}`);

  try {
    const { data: gamesRes } = await api.get('/games', {
      params: { season, week },
    });

    const games = gamesRes?.data || [];

    if (!games.length) {
      return res.status(404).json({ message: 'No games found' });
    }

    const gameIds = games.map((g) => g.id);
    const timestamp = new Date();

    // --- Odds ---
    try {
      const { data: oddsRes } = await api.get('/odds', {
        params: { season, week },
      });

      for (const o of oddsRes?.data || []) {
        o.synced_at = timestamp;
        await Odds.updateOne(
          { game_id: o.game_id, vendor: o.vendor },
          o,
          { upsert: true }
        );
      }

      console.log(`✅ Synced ${oddsRes?.data?.length} odds`);
    } catch (err) {
      logAxiosError('odds', err);
    }

    // --- Props ---
    try {
      const { data: propsRes } = await api.get('/player-props', {
        params: { 'game_ids[]': gameIds },
      });

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
      }

      console.log(`✅ Synced ${props.length} player props`);
    } catch (err) {
      logAxiosError('player-props', err);
    }

    res.json({
      message: `✅ Sync complete for week ${week}`,
      games: games.length,
    });
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
    res.status(500).json({ error: 'Sync failed', details: err.message });
  }
};
