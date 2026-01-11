#!/usr/bin/env node

require("dotenv").config();
const mongoose = require("mongoose");
const syncService = require("../services/syncService");

async function testSync(teamArg = "ALL") {
  console.log("🧪 Starting MongoDB Sync Test...\n");

  // Step 1: Check env vars
  console.log("📋 Step 1: Checking environment variables...");
  const requiredEnvVars = ["MONGO_URI", "BDL_API_KEY"];
  const optionalEnvVars = ["BALLDONTLIE_NFL_BASE_URL"];
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error("❌ Missing required environment variables:", missingVars.join(", "));
    console.error("Please create a .env file with the required variables.");
    process.exit(1);
  }

  const missingOptional = optionalEnvVars.filter((varName) => !process.env[varName]);
  if (missingOptional.length > 0) {
    console.log("ℹ️  Using defaults for:", missingOptional.join(", "));
  }

  console.log("✅ All required environment variables are set\n");

  // Step 2: MongoDB connection
  console.log("📋 Step 2: Testing MongoDB connection...");
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB successfully");
    console.log(`   Database: ${mongoose.connection.db.databaseName}\n`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }

  // Step 3: Sync players
  console.log("📋 Step 3: Syncing players from Ball Don't Lie NFL API...\n");
  try {
    if (teamArg === "ALL") {
      await syncService.syncPlayersAllTeams();
    } else {
      await syncService.syncPlayersForTeam(teamArg);
    }
    console.log("\n✅ Sync complete");
  } catch (error) {
    console.error("❌ Sync failed:", error.message);
  }

  mongoose.connection.close();
}

const arg = process.argv[2];
testSync(arg);
