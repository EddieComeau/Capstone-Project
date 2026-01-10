require('dotenv').config();
const mongoose = require('mongoose');
const minimist = require('minimist');
const axios = require('axios');
const BettingProp = require('./models/BettingProp');
const Odds = require('./models/Odds');

const args = minimist(process.argv.slice(2));
const season = Number(args.season);
const week = Number(args.week);

const MONGO_URI = process.env.MONGO_URI;
const API_KEY = process.env.BDL_API_KEY;
const BASE = process.env.BALLDONTLIE_NFL_BASE_URL || 'https://api.balldontlie.io/nfl/v1';

if (!API_KEY) {
  console.error('❌ BDL_API_KEY is missing in .env');
  process.exit(1);
}

if (!season || !week) {
  console.error('❌ season and week are required');
  process.exit(1);
}

const api = axios.create({
  baseURL: BASE,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
  },
  timeout: 15000,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');
  console.log(`📡 API Base: ${BASE}`);

  let games;
  try {
    const res = await api.get('/games', { params: { season, week } });
    games = res.data?.data || [];
  } catch (err) {
    logAxiosError('games', err);
    process.exit(1);
  }

  if (!games.length) {
    console.log('⚠️ No games found');
    return;
  }

  console.log(`🎯 Found ${games.length} games`);

  for (const game of games) {
    const gameId = game.id;

    // --- Odds ---
    try {
      const res = await api.get('/odds', {
        params: { season, week },
      });
      for (const o of res.data?.data || []) {
        await Odds.updateOne(
          { game_id: o.game_id, vendor: o.vendor },
          o,
          { upsert: true }
        );
      }
      console.log(`✅ Odds synced for game ${gameId}`);
    } catch (err) {
      if (err.response?.status === 404) {
        console.log(`ℹ️ No odds for game ${gameId}`);
      } else {
        logAxiosError('odds', err);
      }
    }

    // --- Player Props ---
    try {
      const res = await api.get('/player-props', { params: { game_id: gameId } });
      for (const p of res.data?.data || []) {
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
      console.log(`✅ Props synced for game ${gameId}`);
    } catch (err) {
      if (err.response?.status === 404) {
        console.log(`ℹ️ No props for game ${gameId}`);
      } else {
        logAxiosError('player-props', err);
      }
    }

    // ✅ Delay to avoid hitting rate limits (429)
    await sleep(500);
  }

  await mongoose.disconnect();
  console.log('🎉 Betting sync complete');
}

function logAxiosError(label, err) {
  console.error(`❌ ${label} request failed`);
  console.error('STATUS:', err.response?.status);
  console.error('URL:', err.config?.baseURL + err.config?.url);
  console.error('DATA:', err.response?.data);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
