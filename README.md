# Capstone Project

## Overview
This repository contains a **Node/Express + MongoDB** backend (server) and a **frontend** client application. It also includes sync tooling to pull NBA data from the **Ball Don't Lie** API into MongoDB.

> If you are missing any details below (exact script names, ports, or routes), update the commands/paths to match this repo’s `package.json` and route definitions.

---

## Prerequisites
- **Node.js** (LTS recommended)
- **npm** (bundled with Node)
- **MongoDB** (local or hosted, e.g., MongoDB Atlas)
- A **Ball Don't Lie** API key
  - Get one from: https://www.balldontlie.io/

---

## Repository Structure (typical)
- `server/` – Express API + MongoDB models + sync scripts
- `frontend/` – Frontend application (React/Vite or similar)

If your structure differs, adjust the paths accordingly.

---

## Environment Variables
Create a `.env` file for the server (commonly at `server/.env`).

### Server (`server/.env`)
```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/capstone
# or for Atlas (example)
# MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority

# Ball Don't Lie
BALLDONTLIE_API_KEY=your_api_key_here
# Optional, depending on your implementation
BALLDONTLIE_BASE_URL=https://api.balldontlie.io/v1
```

> Notes:
> - Some codebases use `MONGO_URI` instead of `MONGODB_URI`, or `BALL_DONT_LIE_API_KEY` instead of `BALLDONTLIE_API_KEY`. Use the variable names your server code expects.

### Frontend (`frontend/.env`)
If the frontend needs to know where the server is running, create `frontend/.env`:

```env
# Example for Vite
VITE_API_BASE_URL=http://localhost:5000
```

If you are using Create React App, the prefix would be `REACT_APP_` instead.

---

## Install Dependencies
From the repository root:

```bash
# Backend
cd server
npm install

# Frontend
cd ../frontend
npm install
```

---

## Run the Application
### 1) Start MongoDB
- **Local MongoDB**: ensure the `mongod` service is running
- **Atlas**: ensure your IP is whitelisted and `MONGODB_URI` is correct

### 2) Run the server
From `server/`:

```bash
npm run dev
# or
npm start
```

The server should start on `http://localhost:5000` (or the `PORT` you set).

### 3) Run the frontend
From `frontend/`:

```bash
npm run dev
# or
npm start
```

The frontend dev server typically runs at `http://localhost:5173` (Vite) or `http://localhost:3000` (CRA).

---

## Syncing Data from Ball Don't Lie
This project includes scripts to sync NBA data from Ball Don't Lie into MongoDB.

### Before you sync
- Confirm `MONGODB_URI` and `BALLDONTLIE_API_KEY` are set
- Start MongoDB
- Ensure the server has access to the internet (for API calls)

### Run sync scripts (examples)
From `server/`:

```bash
# Example script commands (replace with the commands in server/package.json)
npm run sync

# Or specific resources
npm run sync:teams
npm run sync:players
npm run sync:games
npm run sync:stats
```

### Run sync scripts directly (examples)
If your repo uses direct node script execution:

```bash
# Examples — update paths/names to match this repo
node scripts/syncTeams.js
node scripts/syncPlayers.js
node scripts/syncGames.js
```

---

## API Endpoints
Below are common endpoints for this kind of project. Replace/extend these with the exact routes defined in `server/`.

### Health
- `GET /api/health` – basic server health check

### Sync endpoints (if exposed via HTTP)
Some implementations expose sync operations as endpoints (useful for manual triggering in dev):

- `POST /api/sync/teams`
- `POST /api/sync/players`
- `POST /api/sync/games`

> If your server protects these endpoints, you may need auth or an admin key.

### Data endpoints (examples)
- `GET /api/teams`
- `GET /api/players`
- `GET /api/games`

---

## Common Troubleshooting
- **Mongo connection errors**: verify `MONGODB_URI`, network access, and that MongoDB is running.
- **401/403 from Ball Don't Lie**: confirm `BALLDONTLIE_API_KEY` is present and valid.
- **CORS issues**: ensure the server allows requests from the frontend dev origin.

---

## Security
- Do **not** commit `.env` files
- Rotate your Ball Don't Lie API key if it’s exposed
