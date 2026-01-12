// server/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: process.env.MONGO_MAX_POOL_SIZE || 100,
      bufferTimeoutMS: process.env.MONGOOSE_BUFFER_TIMEOUT_MS || 60000,
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1); // exit if DB connection fails
  }
};

module.exports = connectDB;
