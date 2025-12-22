// server/scripts/insertTeamPlayers.js

<<<<<<< HEAD
require('dotenv').config();
=======
const uri = process.env.MONGO_URI || "mongodb://localhost:27017/nfl_cards";
const client = new MongoClient(uri);
>>>>>>> origin/copilot/sync-data-to-mongodb

const connectDB = require('../db');

(async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error('MONGO_URI is not set');
    await connectDB(mongoUri);

    console.log('Connected to MongoDB. Implement team/player insertion logic here.');

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
