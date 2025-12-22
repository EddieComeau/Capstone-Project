<<<<<<< HEAD
// server/scripts/testSync.js

require('dotenv').config();

const connectDB = require('../db');
const syncService = require('../services/syncService');

(async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set');
    await connectDB(process.env.MONGO_URI);

    const result = await syncService.syncPlayers({ per_page: 100, maxPages: 2 });
    console.log('Sync result:', result);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
=======
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
 *   node scripts/testSync.js [team_abbreviation]
 * 
 * Example:
 *   node scripts/testSync.js KC
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { syncTeamPlayers } = require("../services/syncService");

async function testSync(teamAbbrev = "KC") {
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
    const teams = await bdlList("/teams", { per_page: 1 });
    console.log("✅ Ball Don't Lie API is accessible\n");
  } catch (error) {
    console.error("❌ Ball Don't Lie API access failed:", error.message);
    console.error("Please check your BALLDONTLIE_API_KEY.");
    await mongoose.connection.close();
    process.exit(1);
  }
  
  // Step 4: Test player sync for a team
  console.log(`📋 Step 4: Testing player sync for team: ${teamAbbrev}...`);
  try {
    const count = await syncTeamPlayers(teamAbbrev);
    console.log(`✅ Successfully synced ${count} players for team ${teamAbbrev}\n`);
  } catch (error) {
    console.error("❌ Player sync failed:", error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
  
  // Cleanup
  await mongoose.connection.close();
  console.log("✅ All tests passed! MongoDB sync is working correctly.");
  console.log("\n🎉 You can now:");
  console.log("   1. Start the server with: npm start");
  console.log("   2. Set SYNC_ON_STARTUP=true in .env to auto-sync on server start");
  console.log("   3. Use the /api/players/sync endpoint to sync via API");
}

// Get team abbreviation from command line or use default
const teamAbbrev = process.argv[2] || "KC";

// Run the test
testSync(teamAbbrev)
  .catch(error => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });
>>>>>>> origin/copilot/sync-data-to-mongodb
