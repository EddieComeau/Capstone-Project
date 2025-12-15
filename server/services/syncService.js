// services/syncService.js
// ... keep everything else the same ...

async function syncTeamPlayers(teamAbbrev) {
  const { teamDoc, raw } = await ensureTeam(teamAbbrev);

  const players = await bdlList("/players/active", {
    team_ids: [raw.id],
    per_page: 100,
  });

  let upsertCount = 0;

  for (const p of players) {
    // ... unchanged ...
    const doc = await Player.findOneAndUpdate({ PlayerID: p.id }, update, {
      new: true,
      upsert: true,
    });

    if (doc) upsertCount++;
  }

  // ✅ return the shape the controller expects
  return { count: upsertCount };
}

module.exports = {
  syncTeamPlayers,
  syncWeeklyForTeam,
  syncAllTeamsForWeek,
};
