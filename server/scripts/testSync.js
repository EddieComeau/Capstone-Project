#!/usr/bin/env node

/**
 * Test script to verify MongoDB sync functionality
 *
 * This script tests:
 * 1. Environment variables are properly loaded
 * 2. MongoDB connection works
 * 3. Ball Don't Lie API is accessible
 * 4. Player sync functions work correctly
 *
 * Usage:
 *   node scripts/testSync.js [team_abbreviation | ALL]
 *
 * Examples:
 *   # Sync all players across all teams (default)
 *   node scripts/testSync.js
 *
 *   # Sync players for Kansas City Chiefs only
 *   node scripts/testSync.js KC
 */

require("dotenv").config();
const mongoose = require("mongoose");
const syncService = require("../services/syncService");

async function testSync(teamArg = "ALL") {
  console.log("🧪 Starting MongoDB Sync Test...\n");

  // Step 1: Check environment variables
  console.log("📋 Step 1: Checking environment variables...");
  const requiredEnvVars = ["MONGO_URI", "BALLDONTLIE_API_KEY"];
  const optionalEnvVars = ["BALLDONTLIE_NFL_BASE_URL"]; // Has a default fallback
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error("❌ Missing required environment variables:", missingVars.join(", "));
    console.error("Please create a .env file with the required variables.");
    console.error("See .env.example for reference.");
    process.exit(1);
  }

  // Check optional vars
  const missingOptional = optionalEnvVars.filter(varName => !process.env[varName]);
  if (missingOptional.length > 0) {
    console.log("ℹ️  Using defaults for:", missingOptional.join(", "));
  }

  console.log("✅ All required environment variables are set\n");

  // Step 2: Test MongoDB connection
  console.log("📋 Step 2: Testing MongoDB connection...");
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB successfully");
    console.log(`   Database: ${mongoose.connection.db.databaseName}\n`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.error("Please ensure MongoDB is running and MONGO_URI is correct.");
    process.exit(1);
  }

  // Step 3: Test Ball Don't Lie API
  console.log("📋 Step 3: Testing Ball Don't Lie API access...");
  try {
    const { bdlList } = require("../utils/apiUtils");
    const teams = await bdlList("/nfl/v1/teams", { per_page: 1 });
    console.log("✅ Ball Don't Lie API is accessible\n");
  } catch (error) {
    console.error("❌ Ball Don't Lie API access failed:", error.message);
    console.error("Please check your BALLDONTLIE_API_KEY and base URL.");
    await mongoose.connection.close();
    process.exit(1);
  }

  // Step 4: Run the sync
  const teamArgUp = String(teamArg || "ALL").toUpperCase().trim();

  if (teamArgUp === "ALL" || teamArgUp === "ALLTEAMS" || teamArgUp === "") {
    console.log("📋 Step 4: Running full sync for ALL teams (this may take a while)...");
    try {
      const result = await syncService.syncPlayers(); // sync all players across API

      // result is { ok, fetched, upsertCount, pages, next_cursor }
      const upserted = result.upsertCount ?? result.synced ?? null;
      console.log(`✅ Full sync complete. Upserted: ${upserted ?? 'N/A'}, Fetched: ${result.fetched ?? 'N/A'}, Pages: ${result.pages ?? 'N/A'}`);
    } catch (error) {
      console.error("❌ Full player sync failed:", error.message);
      console.error(error);
      await mongoose.connection.close();
      process.exit(1);
    }
  } else {
    console.log(`📋 Step 4: Testing player sync for team: ${teamArgUp}...`);
    try {
      const result = await syncService.syncTeamPlayers(teamArgUp);

      // result may be object { upsertCount, next_cursor } or legacy number
      if (typeof result === 'object' && result !== null) {
        const upserted = result.upsertCount ?? result.syncedPlayers ?? null;
        const nextCursor = result.next_cursor ?? result.nextCursor ?? null;
        console.log(`✅ Successfully synced ${upserted !== null ? upserted : 'N/A'} players for team ${teamArgUp}`);
        if (nextCursor) console.log(`   Next cursor after sync: ${nextCursor}`);
      } else {
        console.log(`✅ Successfully synced ${result} players for team ${teamArgUp}`);
      }
    } catch (error) {
      console.error("❌ Player sync failed:", error.message);
      console.error(error);
      await mongoose.connection.close();
      process.exit(1);
    }
  }

  // Cleanup
  await mongoose.connection.close();
  console.log("✅ All tests completed. MongoDB sync finished.");
  console.log("\n🎉 You can now:");
  console.log("   1. Start the server with: npm start");
  console.log("   2. Use `node scripts/testSync.js <TEAM>` to sync a specific team (e.g., KC)");
  console.log("   3. Or run `node scripts/testSync.js` to sync every player (all teams).");
}

// Get team abbreviation from command line or default to ALL (sync every player)
const teamAbbrev = process.argv[2] || "ALL";

// Run the test
testSync(teamAbbrev)
  .catch(error => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });
