const { MongoClient } = require("mongodb");
const { BalldontlieAPI } = require("@balldontlie/sdk");

const uri = "mongodb://localhost:27017"; // Replace with your MongoDB connection string
const client = new MongoClient(uri);

const apiKey = process.env.BALLDONTLIE_API_KEY; // Ensure this is set in your .env file
const api = new BalldontlieAPI({ apiKey });

async function insertTeamPlayers(teamId) {
  try {
    await client.connect();
    const db = client.db("sportsDB");
    const playersCollection = db.collection("players");

    console.log(`⏳ Fetching active players for team ID: ${teamId}...`);

    let cursor = null;
    let totalInserted = 0;

    do {
      // Fetch players from the API with pagination
      const response = await api.nfl.getActivePlayers({
        team_ids: [teamId],
        cursor,
        per_page: 100, // Maximum allowed per page
      });

      const players = response.data;

      if (players.length > 0) {
        // Insert players into MongoDB
        const bulkOperations = players.map((player) => ({
          updateOne: {
            filter: { id: player.id }, // Match by player ID
            update: {
              $set: {
                id: player.id,
                first_name: player.first_name,
                last_name: player.last_name,
                position: player.position || "Unknown",
                position_abbreviation: player.position_abbreviation || "Unknown",
                height: player.height || "Unknown",
                weight: player.weight || "Unknown",
                jersey_number: player.jersey_number || "Unknown",
                college: player.college || "Unknown",
                experience: player.experience || "Unknown",
                age: player.age || "Unknown",
                team: player.team || {},
              },
            },
            upsert: true, // Insert if the document does not exist
          },
        }));

        const result = await playersCollection.bulkWrite(bulkOperations);
        totalInserted += result.upsertedCount + result.modifiedCount;

        console.log(
          `✅ Inserted/Updated ${result.upsertedCount + result.modifiedCount} players for this page.`
        );
      }

      // Update the cursor for the next page
      cursor = response.meta.next_cursor;
    } while (cursor);

    console.log(`🎉 Successfully inserted/updated ${totalInserted} players for team ID: ${teamId}.`);
  } catch (error) {
    console.error("❌ Error inserting team players:", error.message);
  } finally {
    await client.close();
  }
}

// Replace with the team ID you want to fetch players for
const teamId = 18; // Example: Philadelphia Eagles
insertTeamPlayers(teamId);