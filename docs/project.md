# Sideline Studio – Pro Football Companion

A consolidated project guide for the current repository layout so you can copy/paste into VS Code. It covers what’s built, how to run each part, and where the key assets live.

## Name ideas
- **Gridiron Pulse** — emphasizes live play insights and energy.
- **Playbook Pulse** — blends coaching vibes with real-time data.
- **Sideline Studio** — signals a polished, analyst-friendly experience.
- **Field IQ** — short, brandable, and data-forward.
- **Snapline** — quick hits for depth charts and play-by-play.
- **Down & Data** — pairs football phrasing with analytics.
- **Driveboard** — a visual board for drives, matchups, and cards.
- **Prime Yard** — premium feel with a football nod.
- **Huddleboard** — collaborative tone for teams or fantasy leagues.
- **Matchup Atlas** — highlights the comparison and scouting focus.

## Brand clearance note
- Requested search: **“Sideline Studio – Pro Football Companion.”**
- This environment cannot access trademark databases (e.g., USPTO TESS, WIPO Global Brand DB, EUIPO), so a live clearance search was **not performed**. To check, run those databases plus a common-law search (app stores, domains, social). Avoid combining the mark with league names (e.g., “NFL”) without licenses.

## High-level overview
- **Frontend:** React + Vite experience that surfaces Home, Depth Chart, Matchups, Cards, and a Play-by-Play flow with Lottie/SFX overlays. Routing and tab navigation live in `src/App.jsx` and `src/components/TopTabs.jsx`.
- **Backend:** Express/Mongo API that exposes teams, matchups, players, box scores, play-by-play, and authentication endpoints. Entry point is `server/server.js`.

## Repository structure
```
/Brainstorming.js           # Legacy brainstorm file
/docs/mockups              # Retro SVG mockups + browser index
/frontend                   # Vite React app
  /public                   # Static assets (Kenney sprites, Lottie JSON, SFX)
  /src                      # App source
    /components             # Shared UI (TopTabs, play-by-play widgets, depth chart helpers)
    /data                   # Mock depth charts + play-by-play fallbacks
    /pages                  # Route-level pages (Home, DepthChart, Matchups, Cards, etc.)
    /ui/backgrounds         # Kenney and Lottie hero backgrounds
/server                     # Express API
  /routes, /controllers     # REST routes for teams, matchups, players, etc.
  server.js                 # API bootstrap + Mongo connection
```

### Full folder/file diagram (excluding node_modules/dist)
```
./
  .gitignore
  Brainstorming.js
  PROJECT_DOCUMENT.md
  package-lock.json
  package.json
  docs/
    mockups/
      depth-chart.svg
      home.svg
      index.html
      play-by-play.svg
      standings-betting-injuries.svg
      start-screen.svg
  frontend/
    README.md
    index.html
    package.json
    vite.config.js
    public/
      kenney/
        football.png
        grass_tile.png
        helmet_away.png
        helmet_home.png
      lottie/
        football.json
        fx/ (first_down.json, fumble.json, interception.json, touchdown.json)
      sfx/ (first_down.wav, fumble.wav, interception.wav, touchdown.wav)
    src/
      App.css
      App.jsx
      index.css
      main.jsx
      assets/react.svg
      components/
        Card.{jsx,css}
        PlayerCard.{jsx,css}
        TeamCard.{jsx,css}
        TopTabs.jsx
        cards/PlayerTileCard.{jsx,css}
        common/{PixelBadge.jsx, TeamBadge.jsx, avatar.jsx, teamTheme.js}
        depthchart/{DepthChartGrid.{jsx,css}, DepthChartTabs.{jsx,css}, cards.css}
        playbyplay/{HelmetButton.jsx, PlayByPlayTab.jsx, RetroField.jsx, playbyplay.css}
        playbyplay/eventFx/{PlayEventFXLayer.jsx, usePlayEventFx.js}
      data/{mockDepthCharts.js, playSamples.js}
      lib/api.js
      pages/{StartPage.jsx, HomePage.jsx, PrototypePage.jsx, DepthChartPage.{jsx,css}, MatchupComparisonPage.{jsx,css}, StandingsPage.{jsx,css}, BettingPage.{jsx,css}, InjuriesPage.{jsx,css}}
      services/balldontlieNFL.js
      ui/{LottiePlaysBackground.jsx, backgrounds/{KenneyPlaysBackground.jsx, LottiePlaysBackground.jsx}, overlays/{PlayRoutesOverlay.jsx, RetroStartScreen.jsx}}
      utils/nflDepthChart.js
    cards/{CardWrapper.jsx, DefenseCard.jsx, OLineAdvancedCard.jsx, OLineCard.jsx, SkillCard.jsx, SpecialTeamsCard.jsx}
  server/
    config/sportsdata.js
    controllers/{authController.js, gamesController.js, playByPlayController.js, playersController.js, standingsController.js, teamsController.js}
    db.js
    middleware/authMiddleware.js
    models/{AdvancedLineMetrics.js, DefensiveMetrics.js, LineMetrics.js, Matchup.js, Player.js, PlayerAdvancedMetrics.js, PlayerStats.js, SpecialTeamsMetrics.js, Team.js, User.js}
    routes/{auth.js, boxscores.js, cards.js, games.js, matchups.js, playByPlay.js, players.js, standings.js, sync.js, teams.js}
    server.js
    services/{advancedLineService.js, cardAggregationService.js, defensiveMetricsService.js, lineMetricsService.js, specialTeamsService.js, sportsdataService.js, syncService.js}
    client/ (legacy CRA stub: App.js, index.js, cards styles)
```
### Updated flow diagram
```mermaid
graph LR
  Start[Retro Start Screen] --> Home[Home (Kenney/Lottie hero)]
  Home --> Depth[Depth Chart]
  Home --> Play[Play-by-Play]
  Home --> Match[Matchups]
  Home --> Standings[Standings]
  Home --> Betting[Betting]
  Home --> Injuries[Injuries]
  Play --> Field[Retro Field \n green stripes + numbers]
  Field --> Ball[Brown football marker]
  Field --> Orange[Orange down marker + digital stick]
  Field --> Refs[Striped refs with penalty raise]
  Play --> Reel[Big-play reel\n prev/next popups]
  Depth --> Tabs[Overview / Advanced / PvP / TvT]
  Match --> Modes[Player vs Player | Team vs Team]
  Standings --> Teams[Team detail stats]
  Betting --> Props[Props & odds with FX]
  Injuries --> Tracker[Current + past injuries]
```

## Frontend notes
- **Routing & tabs:** `src/App.jsx` wires routes for the start screen (`/` or `/start`), home (`/home`), cards, depth chart, play-by-play, and matchups. The top navigation lives in `src/components/TopTabs.jsx` with a Play-By-Play CTA button.
- **Start screen:** `src/pages/StartPage.jsx` renders the flashing yellow/white jumbotron (using `RetroStartScreen.jsx`) with a Start button that jumps you into the animated homepage.
- **Home hero:** `src/pages/HomePage.jsx` lets you toggle between Kenney sprites and an American-football Lottie loop and now showcases both animations inline. Quick CTAs jump to Depth Chart, Cards, or Play-by-Play.
- **Depth Chart:** `src/pages/DepthChartPage.jsx` now pins detail tabs for Overview, Advanced Stats, Player-vs-Player, and Team-vs-Team comparisons with sticky inspector styling, plus scrollable mini-graphs that update when you click any player card.
- **Play-by-play:** `src/components/playbyplay/PlayByPlayTab.jsx` pulls games and plays via the backend (and falls back to `src/data/playSamples.js` when BALLDONTLIE isn’t reachable), shows a retro field (`RetroField`), and triggers Kenney/Lottie FX for touchdowns, interceptions, fumbles, and first downs. A new scoreboard bar above the field shows team abbreviations and scores, while the “big play reel” lets you step back and forth through play-impacting moments with a small popup per event. The field stays green with white stripes/numbers, a brown football that moves with ball spot, orange down markers (plus a digital down stick), and sideline referees that animate when penalties fire. FX assets live under `/public/lottie/fx` and `/public/sfx`.
- **Matchups:** `src/pages/MatchupComparisonPage.jsx` offers player-vs-player or team-vs-team comparisons with side-by-side metric pills and mode toggles.
- **Standings:** `src/pages/StandingsPage.jsx` fetches standings by season (BALDONTLIE proxy) and surfaces a team detail rail for run defense vs pass blocking, explosive plays, and red-zone efficiency.
- **Betting:** `src/pages/BettingPage.jsx` rotates recommended odds/props with celebratory Lottie/audio when you lock a card.
- **Injuries:** `src/pages/InjuriesPage.jsx` lets you add/update current injuries and auto-roll resolved entries into history.
- **Styling:** Global styles are in `src/App.css`/`src/index.css` with feature styles beside their components (e.g., `playbyplay.css`, `MatchupComparisonPage.css`). Kenney hero sprites now auto-fall back to CSS chips if PNGs are missing, so you don’t need to edit art files to keep the theme intact.

## Backend notes
- **Entry & middleware:** `server/server.js` enables CORS/JSON logging, mounts all routes, and connects to Mongo with `MONGO_URI` (defaults to `mongodb://localhost:27017/nflcards`).
- **Key routes:** `/api/teams`, `/api/matchups`, `/api/players`, `/api/boxscores`, `/api/standings`, `/api/cards`, `/api/games`, `/api/playbyplay`, and `/api/auth`. Add a `.env` with `MONGO_URI` and any auth secrets before running.

## Running the project
1. **Install root dependencies (optional):** `npm install`
2. **Frontend:**
   - `cd frontend`
   - `npm install`
   - `npm run dev` (serves Vite on port **4000** by default; matches the request for port 4000)
3. **Backend:**
   - `cd server`
   - `npm install`
   - Create `.env` with `MONGO_URI=<your-connection-string>` and any JWT secrets
   - `npm run dev` (uses nodemon) or `npm start` on port `5000` by default (set `PORT=4000` if you want backend and frontend aligned—use a different port for Vite to avoid conflicts)
4. Visit `http://localhost:4000` for the UI; the frontend expects the API at `http://localhost:5000` unless you override `VITE_API_BASE_URL` in `frontend/.env`.

## Asset expectations
- Kenney sprites (e.g., `/kenney/grass_tile.png`, `/kenney/football.png`, `/kenney/helmet_home.png`, `/kenney/helmet_away.png`) and Lottie files (`/lottie/football.json`, `/lottie/fx/*.json`) should live in `frontend/public`. If those PNGs aren’t present, the Kenney background swaps to built-in CSS chips so the UI still renders without editing art files.
- SFX `.wav` files for touchdown, interception, fumble, and first down should be under `frontend/public/sfx`.
- Sample play-by-play data lives in `frontend/src/data/playSamples.js` so the retro field, scoreboard, and FX all populate even without a BALLDONTLIE key.

## Feature walk-through
- **Start:** Retro start screen at `/start` (also default `/`) with flashing marquee and Start button into the app.
- **Home:** Landing hero with background toggle and quick navigation to Depth Chart, Cards, and Play-by-Play, plus embedded Kenney/Lottie previews.
- **Depth Chart:** Accessible via `/depth-chart` with sticky detail tabs for Overview, Advanced Stats (position-relative graphs), Player-vs-Player, and Team-vs-Team comparisons.
- **Matchups:** Switch between player and team modes; select entities on each side to see metric pills.
- **Cards:** Prototype cards experience at `/cards`.
- **Play-by-Play:** Choose a game, view a retro field diagram, see live/up-to-date play rows, and optionally enable FX overlays with audio/Lottie bursts per event type.

## Useful scripts
- **Frontend:** `npm run dev`, `npm run build`, `npm run lint` (if configured)
- **Backend:** `npm run dev` (nodemon), `npm start`

## Pushing to GitHub
To push the current retro-themed frontend/backend updates to your GitHub repo, run these from the project root (swap `origin`/`main` for your remote/branch names):

```bash
git status        # confirm no uncommitted changes remain
git remote -v     # verify the remote points to your GitHub repo
git push origin main
```

If you’re on a feature branch, use `git push origin <branch-name>`. This will publish the latest start screen, play-by-play field markers, standings/betting/injuries pages, and mockups without needing manual copy/paste.

## Notes for customization
- Update asset filenames in `HomePage.jsx` and `PlayByPlayTab.jsx` if you swap in new art/SFX.
- Adjust API base URLs in `frontend/src/lib/api.js` if the backend host/port changes.
- Seed or mock backend data to ensure games and play-by-play endpoints return results for the retro field and FX triggers.
- If your BALLDONTLIE GOAT keys aren’t available locally, the UI will fall back to the baked-in sample rows for games, props, standings, and injuries so the retro layouts stay populated.
- Performance note (big rosters): avatar generation is cached in `frontend/src/components/common/avatar.jsx` so SVGs are reused instead of regenerated. If you render extremely long lists, you can also wrap the `PlayerAvatar` export with `React.memo` to skip unnecessary rerenders.

## Visual mockups (retro jumbotron theme)
- `docs/mockups/start-screen.svg` — flashing yellow/white intro with START button and marquee frame.
- `docs/mockups/home.svg` — homepage hero with Kenney sprite and Lottie panels plus retro quick-link chips.
- `docs/mockups/play-by-play.svg` — scoreboard above the retro field with big-play pop-up rail and prev/next controls.
- `docs/mockups/depth-chart.svg` — sticky inspector tabs (overview, advanced stats, player vs player, team vs team) beside the lineup stack.
- `docs/mockups/standings-betting-injuries.svg` — standings table with team detail modal cue, props carousel with celebratory Lottie, and injury-center timelines.

Each mockup uses the retro navy/yellow palette to match the in-app theme and can be opened directly in VS Code or a browser for quick reference.

**Easy viewing:** open `docs/mockups/index.html` in your browser to see all mockups at once with thumbnails and download links—no extra tooling required.