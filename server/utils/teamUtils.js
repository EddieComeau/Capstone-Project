const Team = require("../models/Team");
const { bdlList } = require("./apiUtils");

async function ensureTeam(teamAbbrev) {
  console.log(`Ensuring team exists: ${teamAbbrev}`);
  
  try {
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
    
    console.log(`Fetching team ${teamAbbrev} from Ball Don't Lie API...`);
    // Use the correct Ball Don't Lie API endpoint: /v1/nfl/teams
    const teams = await bdlList("/v1/nfl/teams", { per_page: 100 });
    
    const matchingTeams = teams.filter(t => 
      t.abbreviation && t.abbreviation.toUpperCase() === teamAbbrev.toUpperCase()
    );
    
    if (!matchingTeams || matchingTeams.length === 0) {
      throw new Error(`Team ${teamAbbrev} not found in Ball Don't Lie API`);
    }
    
    const teamData = matchingTeams[0];
    
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
    return { teamDoc, raw: teamData };
  } catch (error) {
    console.error(`Error ensuring team ${teamAbbrev}:`, error.message);
    throw error;
  }
}

module.exports = { ensureTeam };