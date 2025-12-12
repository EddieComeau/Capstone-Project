// server/db.js
const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn("[MongoDB] MONGO_URI not set in .env");
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log("[MongoDB] Connected");
  } catch (err) {
    console.error("[MongoDB] Connection error:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
