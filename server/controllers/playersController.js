// server/controllers/playersController.js
const Player = require("../models/Player");
const { syncTeamPlayers } = require("../services/syncService");
const { fetchPlayersFromBallDontLie } = require("../services/ballDontLieService");

/**
 * GET /api/players
 * Optional query: team, position, q (search by name)
 */
async function getAllPlayers(req, res, next) {
  try {
    const filter = {};
    if (req.query.team) filter.Team = req.query.team.toUpperCase();
    if (req.query.position) filter.Position = req.query.position.toUpperCase();

    const q = req.query.q;
    let query = Player.find(filter);

    if (q) {
      const regex = new RegExp(q, "i");
      query = query.find({
        $or: [{ FullName: regex }, { FirstName: regex }, { LastName: regex }],
      });
    }

    const players = await query.sort({ Team: 1, Position: 1, FullName: 1 });
    res.json(players);
  } catch (err) {
    next(err);
  }
}

// GET /api/players/:id
async function getPlayerById(req, res, next) {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }
    res.json(player);
  } catch (err) {
    next(err);
  }
}

// GET /api/players/team/:team
async function getPlayersByTeam(req, res, next) {
  try {
    const team = req.params.team.toUpperCase();
    const players = await Player.find({ Team: team }).sort({
      Position: 1,
      DepthChartOrder: 1,
    });
    res.json(players);
  } catch (err) {
    next(err);
  }
}

// POST /api/players/sync/:team
async function syncPlayersForTeam(req, res, next) {
  try {
    const team = req.params.team;
    const count = await syncTeamPlayers(team);

    res.status(200).json({
      team: team.toUpperCase(),
      syncedPlayers: count,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/players/sync
async function syncPlayers(req, res) {
  try {
    let page = 1;
    let totalPlayersSynced = 0;
    let hasMorePlayers = true;

    console.log("⏳ Starting player sync from Ball Don't Lie...");

    while (hasMorePlayers) {
      // Fetch players for the current page
      const players = await fetchPlayersFromBallDontLie(page);

      // Log the fetched players for debugging
      console.log(`✅ Fetched ${players.data.length} players from page ${page}`);

      // Ensure players.data is an array and filter out invalid entries
      const validPlayers = players.data.filter((player) => player && player.id);

      // Prepare bulk operations
      const bulkOperations = validPlayers.map((player) => {
        // Log a warning if the player's position is unknown
        if (!player.position) {
          console.log(`⚠️ Player ${player.first_name} ${player.last_name} has an unknown position.`);
        }

        return {
          updateOne: {
            filter: { PlayerID: player.id }, // Match by PlayerID
            update: {
              $set: {
                PlayerID: player.id,
                FullName: `${player.first_name || ""} ${player.last_name || ""}`.trim(), // Handle missing names
                FirstName: player.first_name || "Unknown", // Default to "Unknown" if no first name
                LastName: player.last_name || "Unknown", // Default to "Unknown" if no last name
                Team: player.team?.abbreviation || "FA", // Default to "FA" (Free Agent) if no team
                Position: player.position || "Unknown", // Default to "Unknown" if no position
                Status: player.status || "Unknown", // Default to "Unknown" if no status
                raw: player, // Store the raw data for reference
              },
            },
            upsert: true, // Insert if the document does not exist
          },
        };
      });

      // Execute bulk write
      if (bulkOperations.length > 0) {
        const bulkWriteResult = await Player.bulkWrite(bulkOperations);
        console.log(
          `✅ Bulk write completed: ${bulkWriteResult.modifiedCount} players updated, ${bulkWriteResult.upsertedCount} players inserted.`
        );
      } else {
        console.log(`⚠️ No valid players to process on page ${page}.`);
      }

      // Update the total players synced
      totalPlayersSynced += validPlayers.length;

      // Check if there are more players to fetch
      hasMorePlayers = players.meta && players.meta.next_page !== null;
      if (!hasMorePlayers) {
        console.log("✅ All active players have been scanned. Stopping sync.");
      }

      page++; // Move to the next page
    }

    console.log(`✅ Successfully synced ${totalPlayersSynced} players!`);
    res.status(200).json({ message: `Players synced successfully! Total: ${totalPlayersSynced}` });
  } catch (error) {
    console.error("❌ Error syncing players:", error.message);
    res.status(500).json({ error: "Failed to sync players", details: error.message });
  }
}

module.exports = {
  getAllPlayers,
  getPlayerById,
  getPlayersByTeam,
  syncPlayersForTeam,
  syncPlayers,
};
