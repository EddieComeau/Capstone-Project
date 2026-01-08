require('dotenv').config({ path: '../.env' });
const cron = require('node-cron');
const { exec } = require('child_process');
const connectDB = require('./db');

(async () => {
  await connectDB();
})();

const runCommand = (label, command) => {
  console.log(`🚀 ${label} started...`);
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ ${label} error:`, error.message);
      return;
    }
    if (stderr) {
      console.error(`⚠️  ${label} stderr:`, stderr);
    }
    console.log(`✅ ${label} done:\n${stdout}`);
  });
};

// Run betting sync every Tuesday at 5am
cron.schedule('0 5 * * 2', () => {
  runCommand('Weekly Betting Sync', 'GAME_IDS=424150,424151,424152 node syncBettingData.js');
});

// Run odds-only daily at noon (optional)
cron.schedule('0 12 * * *', () => {
  runCommand('Daily Odds Sync', 'DO_PROPS=false node syncBettingData.js');
});

console.log('📆 Betting sync scheduler running...');
