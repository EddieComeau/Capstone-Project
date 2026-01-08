require('dotenv').config({ path: './.env' });
const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ensure logs/ folder exists
const logPath = path.resolve(__dirname, 'logs/scheduler.log');
fs.mkdirSync(path.dirname(logPath), { recursive: true });

// 🔁 Get current NFL week (based on 2025 season start)
function getCurrentWeek() {
  const seasonStart = new Date('2025-09-05');
  const today = new Date();
  const daysSinceStart = Math.floor((today - seasonStart) / (1000 * 60 * 60 * 24));
  const week = Math.floor(daysSinceStart / 7) + 1;
  return Math.max(1, Math.min(week, 18)); // Clamp between 1 and 18
}

// 🔁 Find all games for this week from DB
async function getGameIdsForCurrentWeek() {
  const mongoose = require('mongoose');
  const Game = require('./server/models/Game');
  await mongoose.connect(process.env.MONGO_URI);

  const week = getCurrentWeek();
  const season = 2025;
  const games = await Game.find({ season, week }).select('gameId').lean();
  await mongoose.disconnect();

  return games.map(g => g.gameId);
}

function runCommand(command, label) {
  const fullCommand = `cd server && ${command}`;
  const timestamp = new Date().toISOString();
  const logEntry = `\n[${timestamp}] ${label} - Running: ${command}\n`;

  fs.appendFileSync(logPath, logEntry);
  exec(fullCommand, (error, stdout, stderr) => {
    fs.appendFileSync(logPath, stdout);
    if (error || stderr) {
      fs.appendFileSync(logPath, `\n❌ ${label} ERROR:\n${stderr || error.message}\n`);
    }
  });
}

// 🧾 Weekly odds sync — Tuesdays 11AM
cron.schedule('0 11 * * 2', () => {
  const week = getCurrentWeek();
  runCommand(`SEASON=2025 WEEK=${week} node syncBettingData.js --odds-only`, 'Weekly Odds Sync');
});

// 🎯 Player props sync — Sundays 9AM
cron.schedule('0 9 * * 0', async () => {
  const gameIds = await getGameIdsForCurrentWeek();
  if (gameIds.length === 0) return;

  const idList = gameIds.join(',');
  runCommand(`GAME_IDS=${idList} node syncBettingData.js --props-only`, 'Player Props Sync');
});

console.log('📅 Betting scheduler with dynamic week/gameId started.');
