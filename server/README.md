# Capstone Project

## Overview
This repository contains a **Node / Express + MongoDB** backend (`server/`) and a frontend client application (`frontend/`). The backend includes tooling to **sync NFL player and team data** from the **Ball Don’t Lie (BDL) NFL API** into MongoDB, and helper scripts to validate and run the sync locally.

Key goals:
- Keep a single, consistent way to call the Ball Don’t Lie API.
- Support cursor-based pagination reliably (log cursors, break if cursor doesn’t advance).
- Provide an easy test script and `npm` scripts to exercise syncing locally.

---

## Features
- Server API for health checks and triggering syncs  
- Sync service that upserts player data into MongoDB  
- Test script that verifies environment, MongoDB connectivity, BDL API access, and sync logic  
- Robust cursor-based pagination guarded against infinite loops  
- Centralized `bdlList` helper to standardize BDL API calls

You can find the sync logic and cursor guards in `server/services/syncService.js`. The project includes `server/scripts/testSync.js` to run quick functional tests.

---

## Ball Don't Lie API
BDL OpenAPI spec:  
`https://www.balldontlie.io/openapi.yml`

This repository expects to call the BDL NFL endpoints under `/v1/nfl/...`. The codebase centralizes BDL calls via `server/utils/apiUtils.js` (the `bdlList` helper). That helper is the canonical place for base URL and API-key handling.

---

## Prerequisites
- Node.js (LTS recommended)  
- npm  
- MongoDB (local or hosted, e.g., MongoDB Atlas)  
- A Ball Don’t Lie API key (get one at https://www.balldontlie.io/)

---

## Environment variables

Create a `.env` file in `server/` (commonly `server/.env`) and set the following:

**Required**
```env
# MongoDB
MONGO_URI=mongodb://127.0.0.1:27017/nfl_cards

# Ball Don't Lie API
BALLDONTLIE_API_KEY=your_api_key_here
