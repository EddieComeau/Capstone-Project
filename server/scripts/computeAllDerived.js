#!/usr/bin/env node
// server/scripts/computeAllDerived.js
require('dotenv').config();
const mongoose = require('mongoose');
const derived = require('../services/derivedService');

async function main() {
  if (!process.env.MONGO_URI || !process.env.BALLDONTLIE_API_KEY) {
    console.error('Missing MONGO_URI or BALLDONTLIE_API_KEY');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const season = Number(process.env.SYNC_SEASON || new Date().getFullYear());
    console.log(`Computing all derived for season ${season}...`);
    const res = await derived.computeAllDerived({ season, per_page: 100 });
    console.log('Done computeAllDerived:', res);
  } catch (err) {
    console.error('computeAllDerived error', err && err.message ? err.message : err);
  } finally {
    await mongoose.connection.close();
  }
}

main();
