// server/scripts/deleteOldStats.js
require('dotenv').config();
const mongoose = require('mongoose');
const Stat = require('../models/Stat');

async function main() {
  const KEEP_FROM = Number(process.argv[2] || (new Date()).getFullYear() - 1); // keep current and previous by default
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI missing');
  await mongoose.connect(process.env.MONGO_URI, { });
  console.log(`Deleting stats with season < ${KEEP_FROM}`);
  const res = await Stat.deleteMany({ season: { $lt: KEEP_FROM } });
  console.log('Deleted count:', res.deletedCount);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
