const ballDontLieService = require("./ballDontLieService");
const sportsdata = require("./sportsdataService");
const Team = require("../models/Team");
const Player = require("../models/Player");
const Game = require("../models/Game");
const Statline = require("../models/Statline");

async function syncTeams() {
  console.log("🔁 syncTeams starting...");

  const teams = await ballDontLieService.listTeams();
  console.log(`   Received ${teams.length} teams`);

  for (const team of teams) {
    await Team.updateOne({ teamId: team.id }, team, { upsert: true });
  }

  console.log(`✅ syncTeams complete — upserted (approx): ${teams.length}`);
}

async function syncPlayers() {
  console.log("🔁 syncPlayers (ALL TEAMS) starting...");
  let allPlayers = [];
  let page = 1;
  let cursor = null;

  while (true) {
    const params = {
      per_page: 100,
      cursor,
    };

    const result = await ballDontLieService.listPlayers(params);
    const players = result?.data || [];
    if (!players.length) break;

    for (const player of players) {
      await Player.updateOne({ playerId: player.id }, player, { upsert: true });
    }

    allPlayers.push(...players);

    cursor = result.meta?.next_cursor;
    if (!cursor) break;
    page++;
  }

  console.log(`✅ syncPlayers complete — upserted (approx): ${allPlayers.length}`);
}

async function syncGames({ season }) {
  console.log(`🔁 syncGames starting...`);
  let allGames = [];
  let page = 1;
  let cursor = null;

  while (true) {
    const params = {
      per_page: 100,
      season,
      cursor,
    };

    const result = await ballDontLieService.listGames(params);
    const games = result?.data || [];
    if (!games.length) break;

    for (const game of games) {
      await Game.updateOne({ gameId: game.id }, game, { upsert: true });
    }

    allGames.push(...games);
    cursor = result.meta?.next_cursor;
    if (!cursor) break;
    page++;
  }

  console.log(
    `✅ syncGames complete — fetched: ${allGames.length}, upserted (approx): ${allGames.length}, pages: ${page}`
  );
}

async function syncStats({ season }) {
  console.log(`🔁 syncStats starting...`);
  let count = 0;
  let page = 1;
  let cursor = null;

  while (true) {
    const params = {
      per_page: 100,
      season,
      cursor,
    };

    const result = await ballDontLieService.listStats(params);
    const stats = result?.data || [];
    if (!stats.length) break;

    for (const stat of stats) {
      await Statline.updateOne({ statlineId: stat.id }, stat, { upsert: true });
    }

    count += stats.length;
    cursor = result.meta?.next_cursor;
    if (!cursor) break;
    page++;
  }

  console.log(`✅ syncStats complete — upserted (approx): ${count}, pages: ${page}`);
}

async function syncInjuries({ season, week }) {
  console.log(`🔁 syncInjuries starting — season ${season}, week ${week}`);

  let page = 1;
  let cursor = null;
  let allInjuries = [];

  while (true) {
    const params = {
      per_page: 100,
      season,
      week,
      cursor,
    };

    const result = await ballDontLieService.getPlayerInjuries(params);
    const injuries = result?.data || [];
    if (!injuries.length) break;

    allInjuries.push(...injuries);
    cursor = result.meta?.next_cursor;
    if (!cursor) break;
    page++;
  }

  console.log(
    `✅ syncInjuries complete — fetched: ${allInjuries.length}, pages: ${page}`
  );
}

async function syncOddsAndPropsForWeek({ season, week }) {
  const games = await Game.find({ season, week });

  for (const game of games) {
    const odds = await ballDontLieService.getOddsForGame(game.gameId);
    const props = await ballDontLieService.getPropsForGame(game.gameId);

    game.odds = odds || null;
    game.props = props || null;
    await game.save();
  }

  console.log(
    `✅ Betting data synced for ${games.length} games (season ${season}, week ${week})`
  );
}

module.exports = {
  syncTeams,
  syncPlayers,
  syncGames,
  syncStats,
  syncInjuries,
  syncOddsAndPropsForWeek,
};
