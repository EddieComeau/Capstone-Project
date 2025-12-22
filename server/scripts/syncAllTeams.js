#!/usr/bin/env node
/**
 * server/scripts/syncAllTeams.js
 *
 * Sequentially syncs each NFL team by calling syncTeamPlayers(teamAbbrev).
 * The script logs per-team progress and prints a final summary.
 *
 * Usage:
 *   node scripts/syncAllTeams.js
 *
 * Optional env:
 *   SYNC_CONCURRENCY - number (not used here; script is sequential by default)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const syncService = require('../services/syncService');

const TEAMS = [
  "ARI","ATL","BAL","BUF","CAR","CHI","CIN","CLE",
  "DAL","DEN","DET","GB","HOU","IND","JAX","KC",
  "LAC","LAR","LV","MIA","MIN","NE","NO","NYG",
  "NYJ","PHI","PIT","SEA","SF","TB","TEN","WAS"
];

async function runAllTeams() {
  console.log('🧪 Starting full per-team sync for all NFL teams...\n');

  // Step 0: basic env check
  const required = ['MONGO_URI','BALLDONTLIE_API_KEY'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error('❌ Missing required env vars:', missing.join(', '));
    process.exit(1);
  }

  // Connect DB
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB:', mongoose.connection.db.databaseName);
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message || err);
    process.exit(1);
  }

  const summary = [];
  for (const team of TEAMS) {
    console.log('\n------------------------------------------------------------');
    console.log(`🔁 Syncing team: ${team}`);
    const start = Date.now();
    try {
      // syncTeamPlayers returns { upsertCount, next_cursor }
      const result = await syncService.syncTeamPlayers(team);
      const upserted = result && (result.upsertCount ?? result.syncedPlayers) ? (result.upsertCount ?? result.syncedPlayers) : 'N/A';
      const nextCursor = result && (result.next_cursor ?? result.nextCursor) ? (result.next_cursor ?? result.nextCursor) : null;
      const elapsed = Math.round((Date.now() - start) / 1000);
      console.log(`✅ Finished ${team} — upserted: ${upserted} — elapsed: ${elapsed}s${nextCursor ? ` — next_cursor: ${nextCursor}` : ''}`);
      summary.push({ team, status: 'ok', upserted, elapsed, next_cursor: nextCursor });
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      console.error(`❌ Error syncing ${team}:`, msg);
      summary.push({ team, status: 'error', message: msg });
    }
  }

  console.log('\n============================================================');
  console.log('📋 Per-team sync summary:');
  for (const s of summary) {
    if (s.status === 'ok') {
      console.log(` - ${s.team}: OK — upserted: ${s.upserted} — ${s.elapsed}s`);
    } else {
      console.log(` - ${s.team}: ERROR — ${s.message}`);
    }
  }
  console.log('============================================================\n');

  // Cleanup
  await mongoose.connection.close();
  console.log('✅ All done, DB connection closed.');
  process.exit(0);
}

runAllTeams().catch(err => {
  console.error('❌ Unexpected error running per-team sync:', err && err.message ? err.message : err);
  process.exit(1);
});
