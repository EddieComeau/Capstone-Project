// server/db.js

const mongoose = require('mongoose');

async function connectDB(mongoUri = process.env.MONGO_URI) {
  if (!mongoUri) throw new Error('MONGO_URI is required');

  mongoose.set('strictQuery', true);

  await mongoose.connect(mongoUri);
  return mongoose.connection;
}

module.exports = connectDB;
