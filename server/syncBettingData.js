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

if (!API_KEY || !BASE) {
  console.warn('[BALLDONTLIE] Warning: BDL_API_KEY or BALLDONTLIE_NFL_BASE_URL is not set in your .env');
  console.warn('⏩ Skipping odds and props sync.');
  process.exit(0);
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
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`📡 API Base: ${BASE}`);

    // --- Get games ---
    const { data: gamesResponse } = await api.get('/games', {
      params: { season, week },
    });
    const games = gamesResponse?.data || [];

    if (!games.length) {
      console.log('⚠️ No games found');
      return;
    }

    console.log(`🎯 Found ${games.length} games`);

    // --- Get odds once for the week ---
    try {
      const { data: oddsRes } = await api.get('/odds', {
        params: { season, week },
      });

      for (const o of oddsRes?.data || []) {
        o.synced_at = new Date();
        await Odds.updateOne(
          { game_id: o.game_id, vendor: o.vendor },
          o,
          { upsert: true }
        );
      }

      console.log(`✅ Odds synced for ${oddsRes?.data?.length || 0} entries`);
    } catch (err) {
      logAxiosError('odds', err);
    }

    // --- Batch player-props by game_ids ---
    const gameIds = games.map((g) => g.id);
    try {
      const { data: propsRes } = await api.get('/player-props', {
        params: { 'game_ids[]': gameIds },
      });

      const props = propsRes?.data || [];
      console.log(`✅ Props fetched: ${props.length}`);

      for (const p of props) {
        p.synced_at = new Date();
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

      console.log(`✅ Props synced for ${props.length} entries`);
    } catch (err) {
      if (err.response?.status === 404) {
        console.log(`ℹ️ No props for any of the games`);
      } else {
        logAxiosError('player-props', err);
      }
    }

    await mongoose.disconnect();
    console.log('🎉 Betting sync complete');
  } catch (err) {
    console.error('❌ Fatal sync error:', err.message);
    process.exit(1);
  }
}

function logAxiosError(label, err) {
  console.error(`❌ ${label} request failed`);
  console.error('STATUS:', err.response?.status);
  console.error('URL:', err.config?.baseURL + err.config?.url);
  console.error('DATA:', err.response?.data);
}

main();