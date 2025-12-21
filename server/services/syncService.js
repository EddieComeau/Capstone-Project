// services/syncService.js
const { ensureTeam } = require("../utils/teamUtils");
const { bdlList } = require("../utils/apiUtils");
const Player = require("../models/Player");

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
    if (!p.id) {
      console.warn(`⚠️ Skipping player with missing ID:`, p);
      continue;
    }
    
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
      raw: p,
    };

    const doc = await Player.findOneAndUpdate(
      { PlayerID: p.id },
      { $set: update },
      { new: true, upsert: true }
    );

    if (doc) upsertCount++;
  }

  console.log(`✅ Synced ${upsertCount} players for team ${teamAbbrev}`);
  return upsertCount;
}

async function syncWeeklyForTeam(season, week, teamAbbrev) {
  console.log(`Syncing weekly data for team: ${teamAbbrev}, season: ${season}, week: ${week}`);
  const count = await syncTeamPlayers(teamAbbrev);
  return { season, week, teamAbbrev, syncedPlayers: count };
}

async function syncAllTeamsForWeek(season, week, options = {}) {
  console.log(`Syncing all teams for season: ${season}, week: ${week}`);
  const concurrency = options.concurrency || 2;
  
  const teams = [
    "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
    "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
    "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG",
    "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS"
  ];
  
  const results = [];
  
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

module.exports = { syncTeamPlayers, syncWeeklyForTeam, syncAllTeamsForWeek };