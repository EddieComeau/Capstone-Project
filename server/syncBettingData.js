// server/syncBettingData.js

require('dotenv').config();
const mongoose = require('mongoose');
const { listOdds, listPlayerProps } = require('./services/ballDontLieService');
const BettingProp = require('./models/BettingProp');
const Odds = require('./models/Odds');
const minimist = require('minimist');

const MONGO_URI = process.env.MONGO_URI;
const args = minimist(process.argv.slice(2));
const season = args.season || 2025;
const week = args.week;
const gameId = args.gameId;

async function main() {
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI is not set in your .env file');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Fetch and upsert game-level odds
  const oddsData = await listOdds({ season, week });
  if (Array.isArray(oddsData)) {
    for (const item of oddsData) {
      await Odds.findOneAndUpdate(
        { game_id: item.game_id, vendor: item.vendor },
        { ...item },
        { upsert: true }
      );
    }
    console.log(`✅ Synced ${oddsData.length} game odds`);
  }

  // Fetch and upsert player props
  const propsData = await listPlayerProps({ gameId });
  if (Array.isArray(propsData)) {
    for (const item of propsData) {
      await BettingProp.findOneAndUpdate(
        {
          game_id: item.game_id,
          player_id: item.player_id,
          vendor: item.vendor,
          prop: item.prop,
        },
        { ...item },
        { upsert: true }
      );
    }
    console.log(`✅ Synced ${propsData.length} player props`);
  }

  mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Error in syncBettingData:', err.message);
  process.exit(1);
});
