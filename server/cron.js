require('dotenv').config();
const cron = require('node-cron');
const connectDB = require('./config/db');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const {
  syncInjuries,
  syncOddsAndPropsForWeek,
  syncAdvancedRushing,
  syncAdvancedPassing,
  syncAdvancedReceiving,
  syncRemainingOddsAndProps
} = require('./services/syncService');
const { getCurrentSeasonAndWeek, isDuringSeason } = require('./utils/weekUtils');
const desiredService = require('./services/desiredService');
const Game = require('./models/Game');

// Email setup
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function sendAlert(subject, text) {
  if (!process.env.EMAIL_USER || !process.env.NOTIFY_EMAIL) return;
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: process.env.NOTIFY_EMAIL,
    subject,
    text,
  });
}

function scheduleIf(expr, label, task) {
  if (!expr) {
    console.log(`[CRON] ${label} not scheduled (missing env)`);
    return;
  }
  if (!cron.validate(expr)) {
    console.warn(`[CRON] ${label} not scheduled (invalid cron "${expr}")`);
    return;
  }
  cron.schedule(expr, task);
}

async function resolveSeasons() {
  const envSeason = process.env.AUTO_SYNC_SEASON;
  if (envSeason) {
    const seasonNum = Number(envSeason);
    if (!Number.isNaN(seasonNum)) return [seasonNum];
  }
  const seasons = await Game.distinct('season');
  const sorted = seasons.filter(Boolean).sort((a, b) => b - a);
  return sorted.slice(0, 2);
}

(async () => {
  await connectDB();
  console.log('✅ Connected to MongoDB');

  const { season, week } = getCurrentSeasonAndWeek();

  if (!isDuringSeason()) {
    console.log('🏈 Out of season. Skipping all sync jobs.');
    return;
  }

  scheduleIf(process.env.CRON_SCHEDULE, 'Derived sync', async () => {
    const seasons = await resolveSeasons();
    console.log(`[CRON] Running derived sync for seasons: ${seasons.join(', ')}`);
    try {
      await desiredService.computeAdvancedStats();
      await desiredService.computeStandings({ seasons });
      await desiredService.computeMatchups({ seasons });
      await sendAlert('✅ Derived Sync Success', `Derived sync completed for seasons: ${seasons.join(', ')}`);
    } catch (err) {
      console.error('[CRON] derived sync failed:', err);
    }
  });
  if (process.env.CRON_SCHEDULE) {
    console.log(`[CRON] Derived sync scheduled: ${process.env.CRON_SCHEDULE}`);
  }

  scheduleIf(process.env.CRON_SYNC_INJURIES, 'Sync injuries', async () => {
    console.log(`[CRON] Syncing injuries for season ${season}, week ${week}`);
    try {
      await syncInjuries(season, week);
      await sendAlert('🩹 Injury Sync Success', `Injuries synced for season ${season}, week ${week}`);
    } catch (err) {
      console.error('[CRON] syncInjuries failed:', err);
    }
  });

  scheduleIf(process.env.CRON_SYNC_ODDS, 'Sync odds/props', async () => {
    console.log(`[CRON] Syncing odds/props for season ${season}, week ${week}`);
    try {
      await syncOddsAndPropsForWeek(season, week);
      await sendAlert('💰 Odds/Props Sync Success', `Betting data synced for season ${season}, week ${week}`);
    } catch (err) {
      console.error('[CRON] syncOddsAndPropsForWeek failed:', err);
    }
  });

  scheduleIf(process.env.CRON_SYNC_ADVANCED_RUSHING, 'Sync advanced rushing', async () => {
    console.log(`[CRON] Syncing advanced rushing stats for season ${season}`);
    try {
      await syncAdvancedRushing(season);
    } catch (err) {
      console.error('[CRON] syncAdvancedRushing failed:', err);
    }
  });

  scheduleIf(process.env.CRON_SYNC_ADVANCED_PASSING, 'Sync advanced passing', async () => {
    console.log(`[CRON] Syncing advanced passing stats for season ${season}`);
    try {
      await syncAdvancedPassing(season);
    } catch (err) {
      console.error('[CRON] syncAdvancedPassing failed:', err);
    }
  });

  scheduleIf(process.env.CRON_SYNC_ADVANCED_RECEIVING, 'Sync advanced receiving', async () => {
    console.log(`[CRON] Syncing advanced receiving stats for season ${season}`);
    try {
      await syncAdvancedReceiving(season);
    } catch (err) {
      console.error('[CRON] syncAdvancedReceiving failed:', err);
    }
  });

  scheduleIf(process.env.CRON_SYNC_REMAINING_LIVE, 'Sync remaining live', async () => {
    console.log(`[CRON] Syncing remaining live odds/props`);
    try {
      await syncRemainingOddsAndProps();
      await sendAlert('🧮 Remaining Live Sync Success', `Remaining odds/props synced.`);
    } catch (err) {
      console.error('[CRON] syncRemainingOddsAndProps failed:', err);
    }
  });

  console.log('📅 Cron jobs scheduled');
})();
