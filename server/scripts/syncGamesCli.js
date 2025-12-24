#!/usr/bin/env node
// server/scripts/syncGamesCli.js
// Usage: node syncGamesCli.js --seasons=2023,2024 --per_page=100 --dryRun=true --historical=false --maxPages=50

require('dotenv').config();
const minimist = require('minimist');

async function main() {
  const argv = minimist(process.argv.slice(2), {
    boolean: ['dryRun', 'historical'],
    default: { per_page: 100, dryRun: false, historical: false, maxPages: 1000 }
  });

  const seasonsArg = argv.seasons;
  let seasons = null;
  if (seasonsArg) {
    seasons = String(seasonsArg).split(',').map(s => Number(s.trim())).filter(Boolean);
  }

  const opts = {
    per_page: Number(argv.per_page),
    seasons,
    historical: Boolean(argv.historical),
    dryRun: Boolean(argv.dryRun),
    maxPages: Number(argv.maxPages || argv.maxPages === 0 ? argv.maxPages : argv.maxPages || 1000)
  };

  try {
    const svc = require('../services/syncService');
    console.log('Starting syncGames with options:', opts);
    const res = await svc.syncGames(opts);
    console.log('syncGames result:', res);
    process.exit(0);
  } catch (err) {
    console.error('syncGamesCli error:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

main();
