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
    if (!player) return res.status(404).json({ error: "Player not found" });
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

/**
 * ✅ Pure job function (no req/res)
 * Cursor-based sync from Ball Don't Lie
 */
async function syncPlayersJob({ perPage = 100, activeOnly = false, teamIds = [] } = {}) {
  const safePerPage = Math.min(Number(perPage || 100), 100);

  let cursor = null;
  let lastCursor = "__INIT__";
  let totalPlayersSynced = 0;

  console.log("⏳ Starting player sync from Ball Don't Lie...");
  console.log(
    `Params: per_page=${safePerPage}, activeOnly=${activeOnly}, teamIds=${
      teamIds.length ? teamIds.join(",") : "none"
    }`
  );

  while (true) {
    const players = await fetchPlayersFromBallDontLie({
      cursor,
      perPage: safePerPage,
      activeOnly,
      teamIds,
    });

    const dataArray = Array.isArray(players?.data) ? players.data : [];
    const validPlayers = dataArray.filter((p) => p && p.id != null);

    console.log(`✅ Fetched ${validPlayers.length} players (cursor=${cursor ?? "null"})`);
    console.log("Pagination Info:", players?.meta);

    if (validPlayers.length === 0) break;

    const bulkOperations = validPlayers.map((player) => {
      const id = Number(player.id);

      const first = player.first_name || "Unknown";
      const last = player.last_name || "Unknown";
      const full =
        `${player.first_name || ""} ${player.last_name || ""}`.trim() ||
        `${first} ${last}`.trim();

      const position = player.position_abbreviation || player.position || "Unknown";

      return {
        updateOne: {
          filter: { PlayerID: id },
          update: {
            $set: {
              PlayerID: id,
              FullName: full,
              FirstName: first,
              LastName: last,
              Team: player.team?.abbreviation || "FA",
              Position: position,
              Status: player.status || "Unknown",
              raw: player,
            },
          },
          upsert: true,
        },
      };
    });

    const result = await Player.bulkWrite(bulkOperations, { ordered: false });

    console.log(
      `✅ Bulk write: matched=${result.matchedCount}, modified=${result.modifiedCount}, upserted=${result.upsertedCount}`
    );

    totalPlayersSynced += validPlayers.length;

    const nextCursor = players?.meta?.next_cursor ?? null;

    // end
    if (nextCursor === null || nextCursor === undefined || nextCursor === "") break;

    // safety: avoid infinite loop if cursor doesn't advance
    if (String(nextCursor) === String(lastCursor)) {
      console.log("⚠️ next_cursor did not advance. Stopping to avoid infinite loop.");
      break;
    }

    lastCursor = nextCursor;
    cursor = nextCursor;
  }

  console.log(`✅ Sync complete. Total processed: ${totalPlayersSynced}`);
  return { totalPlayersSynced };
}

/**
 * POST /api/players/sync
 * Express handler -> calls syncPlayersJob()
 *
 * Optional query params:
 *   - per_page=100
 *   - activeOnly=true
 *   - teamIds=1,2,3 OR teamIds[]=1&teamIds[]=2
 */
async function syncPlayers(req, res) {
  try {
    const perPage = Math.min(Number(req.query.per_page || 100), 100);
    const activeOnly = String(req.query.activeOnly || "false").toLowerCase() === "true";

    let teamIds = [];
    if (Array.isArray(req.query.teamIds)) {
      teamIds = req.query.teamIds.map((x) => Number(x)).filter((n) => !Number.isNaN(n));
    } else if (typeof req.query.teamIds === "string") {
      teamIds = req.query.teamIds
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((n) => !Number.isNaN(n));
    }

    const result = await syncPlayersJob({ perPage, activeOnly, teamIds });

    res.status(200).json({
      message: "Players synced successfully!",
      total: result.totalPlayersSynced,
    });
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
  syncPlayersJob, // ✅ used by server.js startup sync
};
