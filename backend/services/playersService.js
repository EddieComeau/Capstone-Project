// backend/services/playersService.js
const Player = require('../models/Player');
const sportsdataService = require('./sportsdataService');

// Map SportsData.io player shape → our DB shape
function mapSportsdataPlayerToDoc(apiPlayer) {
  return {
    // IDs
    PlayerID: apiPlayer.PlayerID,
    sportsdataPlayerId: apiPlayer.PlayerID,

    // Team
    Team: apiPlayer.Team,
    TeamID: apiPlayer.TeamID,

    // Names
    Name: apiPlayer.Name,
    FirstName: apiPlayer.FirstName,
    LastName: apiPlayer.LastName,
    Position: apiPlayer.Position,
    Jersey: apiPlayer.Jersey,

    // Photos
    PhotoUrl: apiPlayer.PhotoUrl,
    PhotoUrlHiRes: apiPlayer.PhotoUrlHiRes,
    OfficialImageSrc: apiPlayer.OfficialImageSrc,
    ESPNImageUrl: apiPlayer.ESPNImageUrl,
    FanDuelImageUrl: apiPlayer.FanDuelImageUrl,
    DraftKingsImageUrl: apiPlayer.DraftKingsImageUrl,

    // Bio
    Height: apiPlayer.Height,
    Weight: apiPlayer.Weight,
    BirthDate: apiPlayer.BirthDate,
    College: apiPlayer.College,
    Experience: apiPlayer.Experience,

    // Stats
    PassingYards: apiPlayer.PassingYards,
    PassingTouchdowns: apiPlayer.PassingTouchdowns,
    PassingInterceptions: apiPlayer.PassingInterceptions,

    RushingYards: apiPlayer.RushingYards,
    RushingTouchdowns: apiPlayer.RushingTouchdowns,

    ReceivingYards: apiPlayer.ReceivingYards,
    ReceivingTouchdowns: apiPlayer.ReceivingTouchdowns,

    FantasyPoints: apiPlayer.FantasyPoints,

    Stats: apiPlayer.Stats || undefined,

    isActive: apiPlayer.Active ?? apiPlayer.IsActive ?? undefined,

    Updated: apiPlayer.Updated ? new Date(apiPlayer.Updated) : new Date(),
  };
}

// ------------------- SYNC -------------------

async function syncAllPlayerStats() {
  const teamKeys = await sportsdataService.getAllTeamKeys();

  let totalUpserted = 0;
  const perTeam = [];

  for (const teamKey of teamKeys) {
    const { upsertedCount } = await syncPlayersForTeam(teamKey);
    totalUpserted += upsertedCount;
    perTeam.push({ teamKey, upsertedCount });
  }

  return {
    teamCount: teamKeys.length,
    playersUpserted: totalUpserted,
    details: perTeam,
  };
}

async function syncPlayersForTeam(teamKey) {
  const apiPlayers = await sportsdataService.fetchPlayersForTeam(teamKey);

  let upsertedCount = 0;

  for (const apiPlayer of apiPlayers) {
    if (!apiPlayer.PlayerID) continue;

    const doc = mapSportsdataPlayerToDoc(apiPlayer);

    const filter = { PlayerID: apiPlayer.PlayerID };
    const update = { $set: doc };
    const options = {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    };

    await Player.findOneAndUpdate(filter, update, options);
    upsertedCount += 1;
  }

  return {
    team: teamKey,
    upsertedCount,
  };
}

// ------------------- READ -------------------

async function getPlayersByTeam(teamKey) {
  return Player.find({ Team: teamKey })
    .select('-__v')
    .sort({ Position: 1, LastName: 1, FirstName: 1 })
    .lean();
}

async function getPlayersByTeamWithStats(teamKey) {
  return Player.find({ Team: teamKey })
    .select('-__v')
    .sort({ Position: 1, LastName: 1, FirstName: 1 })
    .lean();
}

async function getTeamPlayersWithPhotos(teamKey) {
  return Player.find({
    Team: teamKey,
    $or: [
      { PhotoUrlHiRes: { $exists: true, $ne: null } },
      { PhotoUrl: { $exists: true, $ne: null } },
      { OfficialImageSrc: { $exists: true, $ne: null } },
      { ESPNImageUrl: { $exists: true, $ne: null } },
      { FanDuelImageUrl: { $exists: true, $ne: null } },
      { DraftKingsImageUrl: { $exists: true, $ne: null } },
    ],
  })
    .select('-__v')
    .sort({ Position: 1, LastName: 1, FirstName: 1 })
    .lean();
}

async function getAllLivePlayers() {
  return Player.find({})
    .select('-__v')
    .sort({ Team: 1, Position: 1, LastName: 1, FirstName: 1 })
    .lean();
}

async function getLivePlayersForTeam(teamKey) {
  return Player.find({
    Team: teamKey,
  })
    .select('-__v')
    .sort({ Position: 1, LastName: 1, FirstName: 1 })
    .lean();
}

async function getPlayerByPlayerId(playerId) {
  const idNum = Number(playerId);
  if (Number.isNaN(idNum)) {
    return Player.findOne({
      $or: [{ PlayerID: playerId }, { sportsdataPlayerId: playerId }],
    }).lean();
  }

  return Player.findOne({
    $or: [{ PlayerID: idNum }, { sportsdataPlayerId: idNum }],
  }).lean();
}

async function getPlayerByMongoId(id) {
  return Player.findById(id).lean();
}

module.exports = {
  syncAllPlayerStats,
  syncPlayersForTeam,

  getPlayersByTeam,
  getPlayersByTeamWithStats,
  getTeamPlayersWithPhotos,
  getAllLivePlayers,
  getLivePlayersForTeam,
  getPlayerByPlayerId,
  getPlayerByMongoId,
};
