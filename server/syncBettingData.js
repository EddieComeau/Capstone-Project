require('dotenv').config({ path: '../.env' });

const connectDB = require('./db');
const Game = require('./models/Game');
const bdl = require('./services/ballDontLieService');
const BettingProp = require('./models/BettingProp');
const BettingOdds = require('./models/BettingOdds');

const {
  SEASON,
  WEEK,
  GAME_IDS,
  PER_PAGE = 100,
  MAX_GAMES = 50,
  DRY_RUN = false,
  DO_ODDS = true,
  DO_PROPS = true,
} = process.env;

(async () => {
  await connectDB();

  const config = {
    season: SEASON ? Number(SEASON) : null,
    week: WEEK ? Number(WEEK) : null,
    perPage: Number(PER_PAGE),
    maxGames: Number(MAX_GAMES),
    dryRun: DRY_RUN === 'true',
    doOdds: DO_ODDS !== 'false',
    doProps: DO_PROPS !== 'false',
  };

  const gameIds = GAME_IDS
    ? GAME_IDS.split(',').map((id) => parseInt(id, 10))
    : [];

  config.gameIdsCount = gameIds.length;

  console.log('==============================');
  console.log('syncBettingData config:');
  console.log(config);
  console.log('==============================');

  if (config.doOdds) {
    console.log('🎲 syncOdds starting...');
    if (config.season && config.week) {
      const res = await bdl.listOdds({
        season: config.season,
        week: config.week,
        per_page: config.perPage,
      });

      const odds = res.data || [];
      console.log(`📄 Odds received: ${odds.length} rows`);

      if (!config.dryRun && odds.length) {
        await BettingOdds.insertMany(odds, { ordered: false }).catch(() => {});
        console.log('✅ Betting odds saved');
      }
    } else if (gameIds.length) {
      const res = await bdl.listOdds({ game_ids: gameIds });
      const odds = res.data || [];
      console.log(`📄 Odds received: ${odds.length} rows`);
      if (!config.dryRun && odds.length) {
        await BettingOdds.insertMany(odds, { ordered: false }).catch(() => {});
        console.log('✅ Betting odds saved');
      }
    } else {
      console.warn('⚠️  Skipping odds: provide (SEASON + WEEK) OR GAME_IDS.');
    }
  }

  if (config.doProps) {
    console.log('🎯 syncPlayerProps starting...');
    let games = [];

    if (gameIds.length) {
      games = gameIds;
    } else if (config.season && config.week) {
      games = await Game.find({
        season: config.season,
        week: config.week,
      }).limit(config.maxGames);
      games = games.map((g) => g.gameId).filter(Boolean);
    }

    if (!games.length) {
      console.warn('⚠️  No games available for props. Skipping.');
    } else {
      let total = 0;
      for (const gameId of games) {
        try {
          const res = await bdl.listOddsPlayerProps({ game_id: gameId });
          const props = res.data || [];
          total += props.length;
          if (!config.dryRun && props.length) {
            await BettingProp.insertMany(props, { ordered: false }).catch(() => {});
          }
        } catch (e) {
          console.warn(`⚠️  Props fetch failed for game ${gameId}:`, e.message);
        }
      }
      console.log(`✅ syncPlayerProps complete — games=${games.length}, props=${total}`);
    }
  }

  process.exit(0);
})();
