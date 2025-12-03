// --Brainstorming (Step 1)--

/* 
An application that can compare and filter NFL team matchups.

Data sources:
- Sportsdata.io NFL API for official, structured stats:
  - Teams, schedules, scores, player season stats, etc.
- (Optional) Basic info from other public sources if needed, but
  Sportsdata.io will be the primary stats provider.

Frontend:
- React app that shows:
  - List of weekly matchups, filterable by team, week, spread/total, and a couple of stat filters.
  - Detailed matchup page with:
    - Team summary stats for the game/season.
    - Player cards with stats and advanced metrics built from Sportsdata.io data.

Backend:
- Node.js + Express app that:
  - Exposes a clean, documented REST API for the React frontend.
  - Fetches and caches data from Sportsdata.io.
  - Joins in any derived advanced metrics (e.g., your own matchup scores).

Database:
- MongoDB via Mongoose (teams, matchups, players, user favorites, and derived advanced metrics).
- Sportsdata.io is the source of truth; DB is for caching, combining, and custom scores.
*/


// --Project Proposal (Step 2)-- 

/* 
Project Name:
- NFL Matchup Explorer

Goal:
- Help NFL fans and fantasy players quickly compare upcoming matchups using Sportsdata.io stats.

Target Users:
- Fantasy football players looking for matchup edges.
- Casual fans who want more context when choosing bets or watching games.

Core Features (MVP):
1. Week & matchup browser
   - Select an NFL week and see all matchups (from Sportsdata.io schedule).
   - Filter by team, home/away, or favorites.

2. Matchup comparison page
   - Show team stats from Sportsdata.io:
     - Team record, points per game, yards per play, offensive/defensive ranks, etc.
   - Show key players for each team with stat lines (passing, rushing, receiving).

3. Player “cards”
   - For a given matchup, list starting QBs, RBs, WRs, TE, etc.
   - Each card shows:
     - Photo (if provided or assembled), name, jersey, position.
     - Season stats from Sportsdata.io (yards, TDs, targets, etc.).
     - Optional: derived advanced metrics (your own efficiency index, matchup score).

4. Filtering & sorting
   - Filter matchups by:
     - Offensive vs defensive strength (based on Sportsdata.io team stats).
     - Over/under line or spread (if you store odds in your DB).
   - Sort by projected offensive strength, total yards, etc.

Optional Future Features:
- User accounts & favorites (save matchups).
- Custom “matchup scores” combining multiple Sportsdata.io metrics.
- Historical games comparison (look back at previous matchups between teams).

Tech Stack:
- Frontend: React (Vite or CRA), Axios/Fetch for API calls, basic component library or Tailwind CSS.
- Backend: Node.js, Express, Axios to hit Sportsdata.io.
- Database: MongoDB + Mongoose.
- External Data:
  - Sportsdata.io NFL API for teams, schedules, stats (requires subscription + API key).

Risks / Constraints:
- Sportsdata.io has rate limits and requires an API key; need to:
  - Store key in environment variables.
  - Implement minimal caching / DB storage to avoid hitting limits.
- Some endpoints may be paid / limited depending on my subscription.
*/


// --Database Model (Step 4)--

/* 
Using MongoDB + Mongoose.

Main Collections:

1. Team
   - _id: ObjectId
   - sportsdataTeamId: Number or String (Sportsdata.io TeamID)
   - name: String
   - abbreviation: String
   - conference: String
   - division: String
   - logoUrl: String (if available or manually set)

2. Player
   - _id: ObjectId
   - sportsdataPlayerId: Number or String (Sportsdata.io PlayerID)
   - teamId: ObjectId (ref: Team)
   - name: String
   - position: String
   - jerseyNumber: String
   - height: String
   - weight: String
   - headshotUrl: String (if available)

3. Matchup
   - _id: ObjectId
   - week: Number
   - season: Number
   - sportsdataGameId: Number or String (from Sportsdata.io)
   - homeTeamId: ObjectId (ref: Team)
   - awayTeamId: ObjectId (ref: Team)
   - kickoffTime: Date
   - venue: String
   - spread: Number (home team spread; optional)
   - overUnder: Number (optional)
   - createdAt / updatedAt: Date

4. PlayerStats (from Sportsdata.io)
   - _id: ObjectId
   - playerId: ObjectId (ref: Player)
   - season: Number
   - week: Number (optional if you store weekly stats)
   - rawStats: Object
     // Example fields:
     // passingYards, passingTDs, interceptions,
     // rushingYards, rushingTDs,
     // receptions, receivingYards, receivingTDs, etc.

5. PlayerAdvancedMetrics (derived layer)
   - _id: ObjectId
   - playerId: ObjectId (ref: Player)
   - season: Number
   - efficiencyScore: Number  // your formula using Sportsdata.io stats
   - boomProbability: Number  // another derived metric (0–1)
   - matchupNotes: String

6. User (optional, for favorites)
   - _id: ObjectId
   - email: String
   - passwordHash: String
   - favoriteMatchupIds: [ObjectId] (ref: Matchup)
*/


// --API Specifications (Step 5)--

/* 
Base URL:
- /api

Endpoints (MVP):

1. GET /api/teams
   - Description: Returns list of NFL teams (from DB, originally from Sportsdata.io).
   - Query params: ?season=2024 (optional)
   - Response:
     [
       {
         "_id": "...",
         "name": "Buffalo Bills",
         "abbreviation": "BUF",
         "logoUrl": "..."
       },
       ...
     ]

2. GET /api/matchups
   - Description: List matchups with optional filters.
   - Query params:
     - season (Number, required)
     - week (Number, optional)
     - team (String, optional, e.g. "BUF" to filter games involving that team)
   - Response:
     [
       {
         "_id": "...",
         "season": 2024,
         "week": 1,
         "sportsdataGameId": 12345,
         "homeTeam": { "name": "Buffalo Bills", "abbreviation": "BUF" },
         "awayTeam": { "name": "Miami Dolphins", "abbreviation": "MIA" },
         "spread": -3.5,
         "overUnder": 48.5
       },
       ...
     ]

3. GET /api/matchups/:id
   - Description: Details of a single matchup.
   - Response:
     {
       "_id": "...",
       "season": 2024,
       "week": 1,
       "homeTeam": { ... },
       "awayTeam": { ... },
       "teamStats": {
         "home": { "pointsPerGame": 27.2, "yardsPerPlay": 5.9, ... },
         "away": { ... }
       },
       "keyPlayers": [
         {
           "player": { "_id": "...", "name": "Josh Allen", "position": "QB", ... },
           "stats": { "passingYards": 4500, "passingTDs": 35, ... },
           "advancedMetrics": { "efficiencyScore": 92.4 }
         },
         ...
       ]
     }

4. GET /api/players/:id
   - Description: Return data used to render a player card.
   - Response:
     {
       "_id": "...",
       "name": "Josh Allen",
       "team": { "name": "Buffalo Bills", "abbreviation": "BUF" },
       "position": "QB",
       "height": "6'5\"",
       "weight": "237",
       "stats": { ... },           // from PlayerStats
       "advancedMetrics": { ... }  // from PlayerAdvancedMetrics
     }

Optional Auth:

5. POST /api/auth/register
   - Body: { email, password }
   - Response: { token, user }

6. POST /api/auth/login
   - Body: { email, password }
   - Response: { token, user }

7. GET /api/users/me/favorites
   - Auth required, returns list of favorite matchup IDs.

NOTE: Backend uses a Sportsdata.io service layer to:
- Fetch teams, schedule, and player stats.
- Normalize and upsert into MongoDB.
- Join any derived metrics before sending to the client.
*/


// --Build, Document, and Submit (Step 6)--
/* 
Implementation Tasks:
1. Initialize backend (Node + Express) and connect to MongoDB.
2. Add env vars: SPORTSDATA_API_KEY, SPORTSDATA_BASE_URL.
3. Implement a sportsdataService using Axios (getTeams, getSchedule, getPlayerSeasonStats).
4. Implement Mongoose models using the Database Model above.
5. Seed the DB with teams and one season’s worth of matchups & player stats.
6. Implement API routes and test with Postman.
7. Initialize React frontend and build:
   - Week selector + matchup list page.
   - Matchup detail page with player cards.
8. Write a README documenting:
   - Project purpose.
   - API endpoints.
   - How Sportsdata.io is used.
   - Setup instructions (env vars, running backend & frontend).
9. (Optional) Add auth + favorites and deploy to a host.
*/
