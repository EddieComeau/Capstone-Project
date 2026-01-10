// server/syncBettingData.js

require('dotenv').config();
const mongoose = require('mongoose');
const minimist = require('minimist');
const BettingProp = require('./models/BettingProp');
const Odds = require('./models/Odds');
const axios = require('axios');

const args = minimist(process.argv.slice(2));
const season = args.season;
const week = args.week;

const MONGO_URI = process.env.MONGO_URI;
const API_KEY = process.env.BDL_API_KEY;
const BASE = process.env.BDL_API_BASE || 'https://nfl.balldontlie.io/v1';

if (!season || !week) {
  console.error('❌ season and week are required');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // 1️⃣ Fetch games
  const gamesRes = await axios.get(`${BASE}/games`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
    params: { season, week },
  });

  const games = gamesRes.data?.data || [];
  if (!games.length) {
    console.log('⚠️ No games found for this week — no odds available');
    return;
  }

  console.log(`🎯 Found ${games.length} games`);

  // 2️⃣ Loop games → odds + props
  for (const game of games) {
    const gameId = game.id;

    // --- ODDS ---
    try {
      const oddsRes = await axios.get(`${BASE}/odds`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
        params: { game_id: gameId },
      });

      for (const o of oddsRes.data?.data || []) {
        await Odds.findOneAndUpdate(
          { game_id: o.game_id, vendor: o.vendor },
          o,
          { upsert: true }
        );
      }
      console.log(`✅ Odds synced for game ${gameId}`);
    } catch {
      console.log(`ℹ️ No odds for game ${gameId}`);
    }

    // --- PLAYER PROPS ---
    try {
      const propsRes = await axios.get(`${BASE}/player-props`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
        params: { game_id: gameId },
      });

      for (const p of propsRes.data?.data || []) {
        await BettingProp.findOneAndUpdate(
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
    } catch {
      console.log(`ℹ️ No props for game ${gameId}`);
    }
  }

  await mongoose.disconnect();
  console.log('🎉 Betting sync complete');
}

main().catch((err) => {
  console.error('❌ Fatal sync error:', err.message);
  process.exit(1);
});
