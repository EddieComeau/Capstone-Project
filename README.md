# Sideline Studio - Pro Football Companion

A comprehensive NFL companion application featuring real-time play-by-play, depth charts, matchup comparisons, and more.

## 🏈 Features

- **Real-time Play-by-Play**: Live game tracking with retro-styled visualizations
- **Depth Charts**: View and analyze team rosters and player positions
- **Matchup Comparisons**: Compare players and teams side-by-side
- **Standings & Betting**: Track team standings and betting odds
- **Injury Tracking**: Monitor current and historical injuries

## 🛠️ Technology Stack

- **Frontend**: React + Vite
- **Backend**: Express.js + MongoDB
- **Data Source**: Ball Don't Lie NFL API
- **Styling**: Custom CSS with retro-inspired design

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v14 or higher)
- **npm** (bundled with Node)
- **MongoDB** (local installation or MongoDB Atlas account)
- **Ball Don't Lie API Key** - Get one at [balldontlie.io](https://www.balldontlie.io/)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/EddieComeau/Capstone-Project.git
cd Capstone-Project
```

### 2. Backend Setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and Ball Don't Lie API key
```

Required environment variables in `server/.env`:

```env
MONGO_URI=mongodb://localhost:27017/nfl_cards
BALLDONTLIE_API_KEY=your_api_key_here
BALLDONTLIE_NFL_BASE_URL=https://api.balldontlie.io/v1/nfl
PORT=4000
SYNC_ON_STARTUP=false
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

### 4. Start MongoDB

**Local MongoDB:**
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

**OR use MongoDB Atlas** (cloud-hosted):
- Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- Update `MONGO_URI` in `server/.env` with your connection string

### 5. Sync NFL Data to MongoDB

Before running the application, you need to sync player data:

**Option 1: Manual test sync**
```bash
cd server
node scripts/testSync.js KC
```

**Option 2: Auto-sync on server start**
```bash
# In server/.env, set:
SYNC_ON_STARTUP=true
```

**Option 3: Sync via API after starting the server**
```bash
curl -X POST http://localhost:4000/api/players/sync
```

### 6. Run the Application

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Visit **http://localhost:4000** to use the application!

## 📖 Documentation

- **Backend Documentation**: See [server/README.md](server/README.md)
- **Project Details**: See [docs/project.md](docs/project.md)
- **Visual Mockups**: Open [docs/mockups/index.html](docs/mockups/index.html) in a browser

## 🔄 Syncing Data to MongoDB

The application needs NFL player data from the Ball Don't Lie API synced to your MongoDB database. Here's how:

### Understanding the Sync Process

1. The backend connects to your MongoDB database
2. It fetches player data from the Ball Don't Lie NFL API
3. Player records are upserted (inserted or updated) in MongoDB
4. This data is then available for the application to query

### Sync Methods

#### Method 1: Test Script (Recommended for First Time)

Test that everything is configured correctly:

```bash
cd server
node scripts/testSync.js
```

This will:
- ✅ Verify environment variables
- ✅ Test MongoDB connection
- ✅ Test Ball Don't Lie API access
- ✅ Sync players for Kansas City Chiefs (or specify a team)

#### Method 2: Automatic Sync on Server Start

Set in `server/.env`:
```env
SYNC_ON_STARTUP=true
```

The server will automatically sync all players when it starts. Great for keeping data fresh!

#### Method 3: Manual API Endpoint

With the server running:

```bash
# Sync all players
curl -X POST http://localhost:4000/api/players/sync

# Sync specific team (e.g., Buffalo Bills)
curl -X POST http://localhost:4000/api/players/sync/BUF
```

### Troubleshooting Sync Issues

**"MONGO_URI not set in .env"**
- Create a `.env` file in the `server` directory
- Copy from `.env.example` and add your MongoDB connection string

**"BALLDONTLIE_API_KEY is not set"**
- Get an API key from [balldontlie.io](https://www.balldontlie.io/)
- Add it to your `server/.env` file

**"MongoDB connection failed"**
- Ensure MongoDB is running (for local setup)
- Verify your connection string is correct
- For MongoDB Atlas, check network access settings

**"Failed to sync players"**
- Check your API key is valid
- Verify you have internet connectivity
- Check the Ball Don't Lie API status

## 🏗️ Project Structure

```
Capstone-Project/
├── frontend/              # React + Vite frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page-level components
│   │   ├── services/     # API integration
│   │   └── utils/        # Helper utilities
│   └── public/           # Static assets
├── server/               # Express.js backend
│   ├── controllers/      # Request handlers
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── scripts/         # Utility scripts
│   └── utils/           # Helper utilities
└── docs/                # Documentation and mockups
```

## 🎨 Features Overview

### Start Screen
Retro-styled landing page with animated jumbotron

### Home Page
Quick navigation to all features with hero animations

### Depth Chart
- View team rosters by position
- Compare players side-by-side
- Advanced statistics visualization

### Play-by-Play
- Live game tracking
- Retro field visualization
- Animated plays with sound effects
- Big play highlights

### Matchups
- Player vs Player comparisons
- Team vs Team analysis
- Detailed statistics

### Standings
- League standings
- Team performance metrics
- Historical data

### Betting & Injuries
- Current betting odds
- Injury reports and tracking
- Historical injury data

## API Endpoints

Below are common endpoints for this project:

### Health
- `GET /api/health` – basic server health check

### Sync endpoints
Some implementations expose sync operations as endpoints (useful for manual triggering in dev):

- `POST /api/sync/teams`
- `POST /api/sync/players`
- `POST /api/sync/games`

### Data endpoints
- `GET /api/teams`
- `GET /api/players`
- `GET /api/games`

## Common Troubleshooting

- **Mongo connection errors**: verify `MONGO_URI`, network access, and that MongoDB is running.
- **401/403 from Ball Don't Lie**: confirm `BALLDONTLIE_API_KEY` is present and valid.
- **CORS issues**: ensure the server allows requests from the frontend dev origin.

## Security

- Do **not** commit `.env` files
- Rotate your Ball Don't Lie API key if it's exposed

## 🤝 Contributing

This is a capstone project. For questions or suggestions, please open an issue.

## 📄 License

ISC

## 🙏 Acknowledgments

- **Ball Don't Lie** for providing the NFL API
- **Kenney** for sprite assets
- **Lottie** for animation support
