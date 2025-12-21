// services/syncService.js
// Import necessary modules and dependencies
const { ensureTeam } = require("../utils/teamUtils");
const { bdlList } = require("../utils/apiUtils");
const Player = require("../models/Player");

// Function to sync team players
async function syncTeamPlayers(teamAbbrev) {
  const { teamDoc, raw } = await ensureTeam(teamAbbrev);

  console.log(`Fetching players for team ${teamAbbrev} (ID: ${raw.id})...`);
  
  // Use the correct Ball Don't Lie API endpoint: /v1/nfl/players
  const players = await bdlList("/v1/nfl/players", {
    team_ids: [raw.id],
    per_page: 100,
  });

  let upsertCount = 0;

  for (const p of players) {
    // Validate critical fields
    if (!p.id) {
      console.warn(`⚠️ Skipping player with missing ID:`, p);
      continue;
    }
    
    // Map Ball Don't Lie API response to Player model schema
    const update = {
      PlayerID: p.id,
      FullName: `${p.first_name || ""} ${p.last_name || ""}`.trim(),
      FirstName: p.first_name || "Unknown",
      LastName: p.last_name || "Unknown",
      Team: p.team?.abbreviation || teamAbbrev.toUpperCase(),
      Position: p.position || "Unknown",
      Status: p.status || "Active",
      Jersey: p.jersey_number,
      Height: p.height,
      Weight: p.weight,
      BirthDate: p.birth_date,
      College: p.college,
      Experience: p.experience,
      PhotoUrl: p.photo_url,
      raw: p, // Store raw data for reference
    };

    const doc = await Player.findOneAndUpdate(
      { PlayerID: p.id },
      { $set: update },
      {
        new: true,
        upsert: true,
      }
    );

    if (doc) upsertCount++;
  }

  console.log(`✅ Synced ${upsertCount} players for team ${teamAbbrev}`);
  
  // Return the shape the controller expects
  return upsertCount;
}

// Function to sync weekly data for a specific team
async function syncWeeklyForTeam(season, week, teamAbbrev) {
  console.log(`Syncing weekly data for team: ${teamAbbrev}, season: ${season}, week: ${week}`);
  // For now, just sync the team players
  const count = await syncTeamPlayers(teamAbbrev);
  return { season, week, teamAbbrev, syncedPlayers: count };
}

// Function to sync all teams for a specific week
async function syncAllTeamsForWeek(season, week, options = {}) {
  console.log(`Syncing all teams for season: ${season}, week: ${week}`);
  const concurrency = options.concurrency || 2;
  
  // List of all NFL team abbreviations
  const teams = [
    "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
    "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
    "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG",
    "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS"
  ];
  
  const results = [];
  
  // Process teams with concurrency limit
  for (let i = 0; i < teams.length; i += concurrency) {
    const batch = teams.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(teamAbbrev => 
        syncWeeklyForTeam(season, week, teamAbbrev)
          .catch(err => {
            console.error(`Error syncing team ${teamAbbrev}:`, err.message);
            return { season, week, teamAbbrev, error: err.message };
          })
      )
    );
    results.push(...batchResults);
  }

  const successCount = results.filter(r => !r.error).length;
  const errorCount = results.filter(r => r.error).length;
  
  console.log(`✅ Sync complete: ${successCount} teams synced, ${errorCount} errors`);

  return { season, week, results, successCount, errorCount };
}

// Export the functions
module.exports = {
  syncTeamPlayers,
  syncWeeklyForTeam,
  syncAllTeamsForWeek,
};
