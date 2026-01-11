require('dotenv').config();
const mongoose = require('mongoose');
const minimist = require('minimist');
const axios = require('axios');
const BettingProp = require('./models/BettingProp');
const Odds = require('./models/Odds');

const MONGO_URI = process.env.MONGO_URI;
const API_KEY = process.env.BDL_API_KEY;
const BASE = process.env.BALLDONTLIE_NFL_BASE_URL || 'https://api.balldontlie.io/nfl/v1';

if (!API_KEY || !BASE) {
  console.warn('[BDL] Warning: BDL_API_KEY or BALLDONTLIE_NFL_BASE_URL is not set in your .env');
  console.warn('⏩ Skipping odds and props sync.');
  process.exit(0);
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

async function runSync({ season, week }) {
  if (!season || !week) {
    console.error('❌ season and week are required');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
    console.log('📡 API Base:', BASE);

    const gamesRes = await api.get('/games', {
      params: { seasons: [season], weeks: [week], per_page: 100 },
    });

    const games = gamesRes.data.data || [];
    console.log(`🎯 Found ${games.length} games`);

    let syncedProps = 0;
    let syncedOdds = 0;

    for (const game of games) {
      const gameId = game.id;

      try {
        const [propsRes, oddsRes] = await Promise.allSettled([
          api.get(`/player-props?game_id=${gameId}`),
          api.get(`/odds?game_id=${gameId}`),
        ]);

        if (propsRes.status === 'fulfilled') {
          const props = propsRes.value.data || [];
          if (props.length) {
            await BettingProp.insertMany(props);
            syncedProps += props.length;
          }
        }

        if (oddsRes.status === 'fulfilled') {
          const odds = oddsRes.value.data || [];
          if (odds.length) {
            await Odds.insertMany(odds);
            syncedOdds += odds.length;
          }
        }

        await sleep(300);
      } catch (err) {
        console.warn(`⚠️ Failed to sync game ${gameId}: ${err.message}`);
      }
    }

    console.log(`✅ Props synced: ${syncedProps}`);
    console.log(`✅ Odds synced: ${syncedOdds}`);
    console.log('🎉 Betting sync complete');
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  const args = minimist(process.argv.slice(2));
  const season = Number(args.season);
  const week = Number(args.week);
  runSync({ season, week });
}