# Sideline Studio – Pro Football Companion App

**Live App:** https://sidelinestudio.app  
**Branch for submission:** `dev`

Sideline Studio is an NFL companion web application built as a capstone project. It combines a **React (Vite)** frontend with a **Node/Express** backend API. The app is deployed on an **Oracle Cloud Ubuntu VPS**, where **NGINX** serves the frontend build and reverse-proxies API requests under `/api` to the backend (managed by **PM2**). HTTPS is enabled using **Let’s Encrypt / Certbot** for `sidelinestudio.app` and `www.sidelinestudio.app`.

---

## 🏈 Features

- **Depth Charts:** Browse team rosters by position and explore player/team views.
- **Matchups / Comparisons:** Compare players or teams (as implemented in the app).
- **Standings / Season Context:** View season context and standings views (as implemented in the app).
- **Play-by-Play / Cards Style Views:** Game-focused visualizations and views (as implemented in the app).
- **Production API Pathing:** Production frontend calls the backend through `/api` (no `localhost` baked into the build).

> Note: A betting page was removed from the final version of the project.

---

## 🛠️ Technology Stack

| Layer     | Tech |
|----------|------|
| Frontend | React + Vite |
| Backend  | Node.js + Express |
| Data/API | External football data integration (via server and/or frontend service modules) |
| Deploy   | Oracle Cloud VPS (Ubuntu), NGINX, PM2, Let’s Encrypt/Certbot |
| Other    | React Router, Axios, Lottie (if enabled in UI) |

---

## 📋 Prerequisites (Local Dev)

To run locally you generally need:

- **Node.js v18+** (includes npm)
- Any backend configuration required by your server (example: `.env` values for API keys, DB URI if used, etc.)

---

## 🚀 Quick Start (Local)

Clone the repo and install both backend + frontend dependencies.


git clone https://github.com/EddieComeau/Capstone-Project.git
cd Capstone-Project
git checkout dev

Capstone-Project/
├── frontend/              # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── public/
├── server/                # Express backend
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── scripts/
│   ├── utils/
│   └── server.js
└── docs/                  # Documentation (if present)

Live URL: https://sidelinestudio.app