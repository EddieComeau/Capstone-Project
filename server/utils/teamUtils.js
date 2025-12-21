const Team = require("../models/Team");
const { bdlList } = require("./apiUtils");

/**
 * Ensure a team exists in the database, fetching from Ball Don't Lie API if needed
 * @param {string} teamAbbrev - Team abbreviation (e.g., "KC", "BUF")
 * @returns {Promise<{teamDoc: Object, raw: Object}>}
 */
async function ensureTeam(teamAbbrev) {
  console.log(`Ensuring team exists: ${teamAbbrev}`);
  
  try {
    // First, check if team already exists in database by abbreviation
    let teamDoc = await Team.findOne({ abbreviation: teamAbbrev.toUpperCase() });
    
    if (teamDoc) {
      console.log(`Team ${teamAbbrev} found in database`);
      return {
        teamDoc,
        raw: {
          id: teamDoc.ballDontLieTeamId,
          abbreviation: teamDoc.abbreviation,
          name: teamDoc.name,
        },
      };
    }
    
    // If not in database, fetch from Ball Don't Lie API
    console.log(`Fetching team ${teamAbbrev} from Ball Don't Lie API...`);
    const teams = await bdlList("/teams", { abbreviation: teamAbbrev.toUpperCase() });
    
    if (!teams || teams.length === 0) {
      throw new Error(`Team ${teamAbbrev} not found in Ball Don't Lie API`);
    }
    
    const teamData = teams[0];
    
    // Create team document in database
    teamDoc = await Team.create({
      ballDontLieTeamId: teamData.id,
      name: teamData.name,
      abbreviation: teamData.abbreviation,
      conference: teamData.conference,
      division: teamData.division,
      city: teamData.city,
      fullName: teamData.full_name,
    });
    
    console.log(`Team ${teamAbbrev} created in database`);
    
    return {
      teamDoc,
      raw: teamData,
    };
  } catch (error) {
    console.error(`Error ensuring team ${teamAbbrev}:`, error.message);
    throw error;
  }
}

module.exports = {
  ensureTeam,
};