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

(async () => {
  await connectDB();
  console.log('✅ Connected to MongoDB');

  const { season, week } = getCurrentSeasonAndWeek();

  if (!isDuringSeason()) {
    console.log('🏈 Out of season. Skipping all sync jobs.');
    return;
  }

  cron.schedule(process.env.CRON_SYNC_INJURIES, async () => {
    console.log(`[CRON] Syncing injuries for season ${season}, week ${week}`);
    try {
      await syncInjuries(season, week);
      await sendAlert('🩹 Injury Sync Success', `Injuries synced for season ${season}, week ${week}`);
    } catch (err) {
      console.error('[CRON] syncInjuries failed:', err);
    }
  });

  cron.schedule(process.env.CRON_SYNC_ODDS, async () => {
    console.log(`[CRON] Syncing odds/props for season ${season}, week ${week}`);
    try {
      await syncOddsAndPropsForWeek(season, week);
      await sendAlert('💰 Odds/Props Sync Success', `Betting data synced for season ${season}, week ${week}`);
    } catch (err) {
      console.error('[CRON] syncOddsAndPropsForWeek failed:', err);
    }
  });

  cron.schedule(process.env.CRON_SYNC_ADVANCED_RUSHING, async () => {
    console.log(`[CRON] Syncing advanced rushing stats for season ${season}`);
    try {
      await syncAdvancedRushing(season);
    } catch (err) {
      console.error('[CRON] syncAdvancedRushing failed:', err);
    }
  });

  cron.schedule(process.env.CRON_SYNC_ADVANCED_PASSING, async () => {
    console.log(`[CRON] Syncing advanced passing stats for season ${season}`);
    try {
      await syncAdvancedPassing(season);
    } catch (err) {
      console.error('[CRON] syncAdvancedPassing failed:', err);
    }
  });

  cron.schedule(process.env.CRON_SYNC_ADVANCED_RECEIVING, async () => {
    console.log(`[CRON] Syncing advanced receiving stats for season ${season}`);
    try {
      await syncAdvancedReceiving(season);
    } catch (err) {
      console.error('[CRON] syncAdvancedReceiving failed:', err);
    }
  });

  cron.schedule(process.env.CRON_SYNC_REMAINING_LIVE, async () => {
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
