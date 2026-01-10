// server/cron.js

/*
 * Schedules recurring tasks to keep NFL betting data and other
 * collections up to date. Uses node-cron to run at a configurable
 * interval (default: every day at 03:00). Calculates the current
 * NFL week dynamically based on a start date for the season. After
 * each run the results are summarised and sent to Slack/Discord/email
 * via the notify utility.
 */

require('dotenv').config();
const cron = require('node-cron');
const mongoose = require('mongoose');
const { syncBettingData } = require('./controllers/adminController');
const { sendNotification } = require('./utils/notify');

// Determine the current NFL week based on the season start date.
// Weeks less than 1 are clamped to 1 and greater than 23 to 23.
function getCurrentWeek() {
  const now = new Date();
  const year = now.getFullYear();
  const seasonStartDate = process.env.SEASON_START_DATE || `${year}-09-05`;
  const seasonStart = new Date(seasonStartDate);
  if (now < seasonStart) return 1;
  const diffDays = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;
  return Math.max(1, Math.min(week, 23));
}

// Build a summary string for notifications.
function buildSummary(season, week, games, failedOdds, failedProps) {
  let msg = `Betting sync complete for season ${season}, week ${week}.\n`;
  msg += `Processed ${games} games.\n`;
  if (failedOdds.length || failedProps.length) {
    msg += `There were errors syncing:\n`;
    if (failedOdds.length) msg += `- Odds failed for game IDs: ${failedOdds.join(', ')}\n`;
    if (failedProps.length) msg += `- Props failed for game IDs: ${failedProps.join(', ')}\n`;
  }
  return msg;
}

// The main cron task: run betting sync for the current week.
async function runCronSync() {
  const season = Number(process.env.AUTO_SYNC_SEASON) || new Date().getFullYear();
  const week = getCurrentWeek();
  console.log(`[cron] Starting auto sync: season ${season}, week ${week}`);

  try {
    // Connect to Mongo only if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    // Call the controller via a dummy request/response
    const req = { body: { season, week } };
    const jsonData = {};
    const res = {
      json(payload) {
        Object.assign(jsonData, payload);
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
    };
    await syncBettingData(req, res);

    const failedOdds = jsonData.failedOdds || [];
    const failedProps = jsonData.failedProps || [];
    const summary = buildSummary(season, week, jsonData.games || 0, failedOdds, failedProps);

    console.log('[cron] Sync summary:\n' + summary);
    await sendNotification(summary);
  } catch (err) {
    console.error('[cron] Sync failed:', err.message);
    await sendNotification(`⚠️ Auto-sync failed: ${err.message}`);
  }
}

// Configure the cron schedule. Default: 03:00 daily (UTC).
const cronExpr = process.env.CRON_SCHEDULE || '0 3 * * *';
const cronTimeZone = process.env.CRON_TIMEZONE || 'UTC';

console.log(`[cron] Scheduled betting sync: "${cronExpr}" (${cronTimeZone})`);

cron.schedule(
  cronExpr,
  () => {
    runCronSync().catch((err) => {
      console.error('[cron] Unexpected error during auto sync:', err);
    });
  },
  { timezone: cronTimeZone }
);

// Optionally run immediately at startup unless explicitly disabled.
if (String(process.env.AUTO_SYNC_ON_STARTUP).toLowerCase() !== 'false') {
  setTimeout(() => {
    runCronSync().catch((err) => {
      console.error('[cron] Startup sync failed:', err);
    });
  }, 5000);
}
