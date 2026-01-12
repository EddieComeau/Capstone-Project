const Injury = require('../models/Injury');
const Game = require('../models/Game');
const Player = require('../models/Player');
const Play = require('../models/Play');
const Stat = require('../models/Stat');

const sportsdata = require('../config/sportsdata');
const ballDontLieService = require('./ballDontLieService');
const { getCurrentSeasonAndWeek } = require('../utils/weekUtils');

// -------------------
// INJURIES
// -------------------

async function syncInjuries(season, week) {
  const perPage = parseInt(process.env.SYNC_INJURIES_PER_PAGE || 100, 10);
  let page = 1;
  let totalSynced = 0;

  while (true) {
    const injuries = await sportsdata.getInjuries({ season, week, page, perPage });

    if (!injuries || injuries.length === 0) break;

    const ops = injuries.map((injury) => ({
      updateOne: {
        filter: { externalId: injury.id },
        update: { $set: injury },
        upsert: true,
      },
    }));

    await Injury.bulkWrite(ops);
    totalSynced += injuries.length;
    page++;
  }

  return totalSynced;
}

// -------------------
// ADVANCED STATS
// -------------------

async function syncAdvancedRushing(season) {
  const stats = await ballDontLieService.listAdvancedRushing({ season });
  return bulkWriteStats(stats);
}

async function syncAdvancedPassing(season) {
  const stats = await ballDontLieService.listAdvancedPassing({ season });
  return bulkWriteStats(stats);
}

async function syncAdvancedReceiving(season) {
  const stats = await ballDontLieService.listAdvancedReceiving({ season });
  return bulkWriteStats(stats);
}

async function bulkWriteStats(stats) {
  if (!stats || stats.length === 0) return 0;

  const ops = stats.map((stat) => ({
    updateOne: {
      filter: { externalId: stat.id },
      update: { $set: stat },
      upsert: true,
    },
  }));

  const result = await Stat.bulkWrite(ops);
  return result.upsertedCount + result.modifiedCount;
}

// -------------------
// ODDS + PLAYER PROPS
// -------------------

async function syncOddsAndPropsForWeek(season, week) {
  const games = await Game.find({ season, week });

  let totalOdds = 0;
  let totalProps = 0;

  for (const game of games) {
    if (!game.externalId) continue;

    const odds = await sportsdata.getOdds(game.externalId);
    const props = await sportsdata.getPlayerProps(game.externalId);

    if (odds) {
      await Game.updateOne(
        { _id: game._id },
        { $set: { odds } }
      );
      totalOdds++;
    }

    if (props && Array.isArray(props)) {
      const propOps = props.map((prop) => ({
        updateOne: {
          filter: { externalId: prop.id },
          update: { $set: { ...prop, game: game._id } },
          upsert: true,
        },
      }));
      await Player.bulkWrite(propOps);
      totalProps += props.length;
    }
  }

  return { odds: totalOdds, props: totalProps };
}

// -------------------
// REMAINING PLAYS ONLY
// -------------------

async function syncRemainingPlays() {
  const games = await Game.find({ playsFetched: { $ne: true } });

  if (!games.length) {
    console.log('✅ No games missing plays');
    return;
  }

  console.log(`🔍 Found ${games.length} games missing plays`);

  for (const game of games) {
    try {
      const plays = await sportsdata.getPlays(game.externalId);

      if (!Array.isArray(plays) || plays.length === 0) {
        console.warn(`⚠️ No plays returned for game ${game._id}`);
        continue;
      }

      const ops = plays.map((play) => ({
        updateOne: {
          filter: { externalId: play.id },
          update: { $set: { ...play, game: game._id } },
          upsert: true,
        },
      }));

      await Play.bulkWrite(ops);
      await Game.updateOne({ _id: game._id }, { $set: { playsFetched: true } });

      console.log(`✅ Synced ${plays.length} plays for game ${game._id}`);
    } catch (err) {
      console.error(`❌ Failed syncing plays for game ${game._id}:`, err.message);
    }
  }
}

// -------------------
// EXPORTS
// -------------------

module.exports = {
  syncInjuries,
  syncOddsAndPropsForWeek,
  syncAdvancedRushing,
  syncAdvancedPassing,
  syncAdvancedReceiving,
  syncRemainingPlays,
};
