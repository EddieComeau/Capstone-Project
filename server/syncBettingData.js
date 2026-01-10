// scripts/syncBettingData.js

require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");

const BettingProp = require("../models/BettingProp");

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("Missing MONGO_URI in .env");
  process.exit(1);
}

async function connectToDB() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("✅ Connected to MongoDB");
}

async function fetchBettingData() {
  try {
    // Example API endpoint — replace with your real source
    const response = await axios.get("https://api.example.com/betting-props");
    return response.data?.props || [];
  } catch (err) {
    console.error("❌ Failed to fetch betting data:", err.message);
    return [];
  }
}

function parsePropEntry(entry) {
  // Example shape of raw entry — adjust as needed
  return {
    player_id: entry.player_id,
    prop: entry.prop_type || entry.prop,
    line: parseFloat(entry.line) || null,
    book: entry.book_name || entry.book || "Unknown",
    game_id: entry.game_id || null,
    team_abbr: entry.team || null,
    synced_at: new Date(),
  };
}

async function savePropsToDB(props) {
  let saved = 0;
  let skipped = 0;

  for (const raw of props) {
    const parsed = parsePropEntry(raw);
    if (!parsed.player_id || !parsed.prop) {
      console.warn("⚠️ Skipping invalid entry", raw);
      skipped++;
      continue;
    }

    // Deduplicate: match on player_id + prop + game
    await BettingProp.findOneAndUpdate(
      {
        player_id: parsed.player_id,
        prop: parsed.prop,
        game_id: parsed.game_id || null,
      },
      { $set: parsed },
      { upsert: true, new: true }
    );
    saved++;
  }

  console.log(`✅ Saved ${saved} props, skipped ${skipped}`);
}

async function main() {
  await connectToDB();
  const data = await fetchBettingData();
  if (!data.length) {
    console.warn("⚠️ No props fetched");
    process.exit(0);
  }

  await savePropsToDB(data);
  await mongoose.disconnect();
  console.log("✅ Done syncing betting data");
}

main().catch((err) => {
  console.error("❌ syncBettingData failed:", err);
  process.exit(1);
});
