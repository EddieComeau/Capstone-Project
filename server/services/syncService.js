// services/syncService.js
// Import necessary modules and dependencies
const { ensureTeam } = require("../utils/teamUtils"); // Example utility function
const { bdlList } = require("../utils/apiUtils"); // Example API utility
const Player = require("../models/Player"); // Import the Player model

// Function to sync team players
async function syncTeamPlayers(teamAbbrev) {
  const { teamDoc, raw } = await ensureTeam(teamAbbrev);

  const players = await bdlList("/players/active", {
    team_ids: [raw.id],
    per_page: 100,
  });

  let upsertCount = 0;

  for (const p of players) {
    const update = {
      // Add fields to update
      TeamID: raw.id,
      TeamAbbrev: teamAbbrev,
      ...p,
    };

    const doc = await Player.findOneAndUpdate({ PlayerID: p.id }, update, {
      new: true,
      upsert: true,
    });

    if (doc) upsertCount++;
  }

  // ✅ Return the shape the controller expects
  return { count: upsertCount };
}

// Function to sync weekly data for a specific team
async function syncWeeklyForTeam(teamAbbrev, week) {
  console.log(`Syncing weekly data for team: ${teamAbbrev}, week: ${week}`);
  // Add logic to sync weekly data for the team
  // Example:
  const result = await syncTeamPlayers(teamAbbrev);
  return { teamAbbrev, week, result };
}

// Function to sync all teams for a specific week
async function syncAllTeamsForWeek(week) {
  console.log(`Syncing all teams for week: ${week}`);
  const teams = ["NE", "DAL", "SF", "KC"]; // Example team abbreviations
  const results = [];

  for (const teamAbbrev of teams) {
    const result = await syncWeeklyForTeam(teamAbbrev, week);
    results.push(result);
  }

  return results;
}

// Export the functions
module.exports = {
  syncTeamPlayers,
  syncWeeklyForTeam,
  syncAllTeamsForWeek,
};
