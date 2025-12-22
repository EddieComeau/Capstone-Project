# Sideline Studio Backend

Express.js backend for the Sideline Studio Pro Football Companion application.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- Ball Don't Lie API Key ([Get one here](https://www.balldontlie.io/))

## Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Environment Configuration

Create a `.env` file in the `server` directory with the following variables:

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/nfl_cards

# Ball Don't Lie API Configuration
BALLDONTLIE_API_KEY=your_api_key_here
BALLDONTLIE_NFL_BASE_URL=https://api.balldontlie.io/v1/nfl

# Server Configuration
PORT=4000

# CORS Configuration
CORS_ORIGIN=*

# Sync on Startup (set to true to automatically sync players when server starts)
SYNC_ON_STARTUP=false

# JWT Secret (for authentication)
JWT_SECRET=your_jwt_secret_here
```

You can copy the `.env.example` file and modify it:

```bash
cp .env.example .env
```

Then edit the `.env` file with your actual values.

### 3. MongoDB Setup

#### Option 1: Local MongoDB
If running MongoDB locally, start the MongoDB service:

```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

#### Option 2: MongoDB Atlas
1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get your connection string
3. Update `MONGO_URI` in your `.env` file with the Atlas connection string

## Running the Server

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on the port specified in your `.env` file (default: 4000).

## Syncing Data to MongoDB

The application provides multiple ways to sync NFL player data from the Ball Don't Lie API to your MongoDB database:

### Method 1: Automatic Sync on Server Startup

Set `SYNC_ON_STARTUP=true` in your `.env` file. The server will automatically sync all players when it starts.

```env
SYNC_ON_STARTUP=true
```

### Method 2: Manual Sync via API Endpoint

Once the server is running, you can manually trigger a sync by making a POST request:

```bash
# Sync all players
curl -X POST http://localhost:4000/api/players/sync

# Sync players for a specific team (e.g., Kansas City Chiefs)
curl -X POST http://localhost:4000/api/players/sync/KC
```

### Method 3: Using the Standalone Script

Run the standalone script to sync players for a specific team:

```bash
# Edit the teamId in server/scripts/insertTeamPlayers.js first
node scripts/insertTeamPlayers.js
```

### What Gets Synced

When syncing players, the following data is stored in MongoDB:

- Player ID (from Ball Don't Lie API)
- Full Name, First Name, Last Name
- Team abbreviation (e.g., "KC", "BUF")
- Position (e.g., "QB", "RB", "WR")
- Status (Active, Injured, etc.)
- Raw API response (for reference)

The sync process uses upsert operations, so running it multiple times is safe - it will update existing players rather than creating duplicates.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login

### Teams
- `GET /api/teams` - Get all teams
- `GET /api/teams/:id` - Get team by ID

### Players
- `GET /api/players` - Get all players (supports filtering by team, position, name)
- `GET /api/players/:id` - Get player by ID
- `GET /api/players/team/:team` - Get players by team abbreviation
- `POST /api/players/sync` - Sync all players from Ball Don't Lie API
- `POST /api/players/sync/:team` - Sync players for a specific team

### Games
- `GET /api/games` - Get games

### Play-by-Play
- `GET /api/playbyplay` - Get play-by-play data

### Standings
- `GET /api/standings` - Get standings

### Matchups
- `GET /api/matchups` - Get matchups

### Health Check
- `GET /` - Basic status check
- `GET /health` - Health check with database status

## Troubleshooting

### MongoDB Connection Issues

If you see "MongoDB connection failed", check:

1. MongoDB is running (for local setup)
2. `MONGO_URI` is correct in your `.env` file
3. Network connectivity (for MongoDB Atlas)
4. Firewall settings allow MongoDB connections

### Ball Don't Lie API Issues

If player sync fails:

1. Verify your `BALLDONTLIE_API_KEY` is valid
2. Check your API rate limits
3. Ensure `BALLDONTLIE_NFL_BASE_URL` is correct
4. Check the console logs for detailed error messages

### Common Errors

**"BALLDONTLIE_API_KEY is not set"**
- Add your API key to the `.env` file

**"MONGO_URI not set in .env"**
- Add your MongoDB connection string to the `.env` file

**"Failed to sync players on startup"**
- Check your API key and internet connection
- Verify the Ball Don't Lie API is accessible
- Check the full error in the console for more details

## Development

### Project Structure

```
server/
├── config/           # Configuration files
├── controllers/      # Route controllers
├── middleware/       # Express middleware
├── models/          # Mongoose models
├── routes/          # API route definitions
├── scripts/         # Utility scripts
├── services/        # Business logic services
├── utils/           # Helper utilities
├── .env.example     # Environment variables template
├── db.js            # Database connection (deprecated)
├── server.js        # Main application entry point
└── package.json     # Dependencies and scripts
```

### Adding New Features

1. Create models in `models/`
2. Add business logic to `services/`
3. Create controllers in `controllers/`
4. Define routes in `routes/`
5. Register routes in `server.js`

## License

ISC
