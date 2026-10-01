<img width="1584" height="396" alt="Untitled design (2)" src="https://github.com/user-attachments/assets/22ee2675-bff8-48e2-b656-994245aa613a" />

<div align="center">

# Aniways

A modern anime streaming application built with Next.js, FastAPI and Electron.

<img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nextjs/nextjs-original.svg" width="40" height="40" title="Next.js"/> &nbsp;&nbsp;
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/fastapi/fastapi-original.svg" width="40" height="40" title="FastAPI"/> &nbsp;&nbsp;
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/electron/electron-original.svg" width="40" height="40" title="Electron"/> &nbsp;&nbsp;

[![GitHub stars](https://img.shields.io/github/stars/hazavi/aniways?style=social)](https://github.com/hazavi/aniways/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/hazavi/aniways?style=social)](https://github.com/hazavi/aniways/fork)
[![GitHub issues](https://img.shields.io/github/issues/hazavi/aniways)](https://github.com/hazavi/aniways/issues)

## Preview

https://github.com/user-attachments/assets/0339b4af-6562-42b0-bab2-4c583a4c93f0

## Quick App Install Tutorial + Preview


https://github.com/user-attachments/assets/9fa3420c-d2b3-4b13-a882-24660d32b33d



</div>

## Disclaimer

This project is for educational and personal use only.

- I am not responsible for any misuse of this software
- This application does not host or store any media files on its servers
- All content is streamed from third-party providers
- Use at your own risk

---

## Overview

Aniways provides anime metadata from AniDB and episode streams from AnimeX. AniList supplies ranked and seasonal discovery, while the backend handles data fetching and caching.

### Features

- **Stream Anime** - Watch AnimeX Sub and Dub servers with in-player quality and subtitle controls
- **Anime Lists** - Track your anime (Plan to Watch, Watching, Completed, Paused, Dropped)
- **User Accounts** - Register and login with JWT authentication
- **Continue Watching** - Resume from where you left off
- **Search & Browse** - Find anime by name, genre, season, or schedule
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Desktop App** - Run as a standalone Electron application

## Project Structure

```
aniways/
├── backend/
│   ├── server.py              # Entry point
│   ├── requirements.txt
│   └── app/
│       ├── main.py            # FastAPI application
│       ├── core/             # Configuration and shared HTTP client
│       ├── routes/
│       │   ├── catalogue.py   # AniDB catalogue endpoints
│       │   └── watch.py       # Video source endpoints
│       └── scrapers/
│           ├── anidb.py       # AniDB catalogue client
│           └── animex.py      # AnimeX episode servers
│
├── desktop/
│   ├── main.js                # Electron main process
│   ├── preload.js             # Electron preload script
│   └── package.json           # Electron dependencies & build config
│
└── frontend/
    ├── package.json
    ├── app/                   # Next.js pages
    │   ├── page.tsx           # Home
    │   ├── anime/[id]/        # Anime details
    │   ├── watch/[id]/[ep]/   # Video player
    │   ├── search/            # Search results
    │   ├── browse/            # Browse by category
    │   └── schedule/          # Weekly schedule
    ├── components/            # React components
    └── lib/                   # Utilities and API client
```

---

## Backend

FastAPI server providing anime data and video sources.

### Requirements

- Python 3.11+

### Setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/Mac
source .venv/bin/activate

pip install -r requirements.txt
```

The catalogue needs no API client ID. Copy `backend/.env.example` to `backend/.env` only if you want to change local server settings. Anime links and saved lists use AniDB IDs. On upgrade, saved lists and browser watch history are migrated using public ID mappings; old saved-list rows remain in SQLite as a backup.

### Run

```bash
python server.py
```

Server runs at `http://localhost:4444`

### API Documentation

- Swagger UI: `http://localhost:4444/docs`
- ReDoc: `http://localhost:4444/redoc`

### API Endpoints

| Endpoint                            | Description                           |
| ----------------------------------- | ------------------------------------- |
| GET /api/top/anime                  | Top anime (airing, upcoming, popular) |
| GET /api/browse/anime               | Browse with filters                   |
| GET /api/anime?q=                   | Search anime                          |
| GET /api/anime/{id}                 | Anime details                         |
| GET /api/anime/{id}/recommendations | Recommendations                       |
| GET /api/anime/{id}/characters      | Characters                            |
| GET /api/seasons/now                | Current season                        |
| GET /api/schedules                  | Weekly schedule                       |
| GET /api/watch/{id}/{episode}       | Video sources                         |
| GET /api/anime/{id}/animex          | AnimeX availability and episode count |
| POST /api/auth/register             | Create new account                    |
| POST /api/auth/login                | Login and get JWT token               |
| GET /api/list                       | Get user's anime list                 |
| POST /api/list                      | Add anime to list                     |

### AnimeX Playback

Aniways maps AniDB IDs to AnimeX through AniList. The watch route returns available Sub and Dub servers for an episode. The frontend serves the AnimeX player at `/animex-player/` so it can display inside the watch page.

---

## Frontend

Next.js application with Tailwind CSS and shadcn/ui.

### Requirements

- Node.js 18+

### Setup

```bash
cd frontend
npm install
```

### Run

```bash
npm run dev
```

Frontend runs at `http://localhost:3000`

### Build

```bash
npm run build
npm start
```

### Pages

| Route                 | Description               |
| --------------------- | ------------------------- |
| /                     | Home with featured anime  |
| /anime/[id]           | Anime details page        |
| /watch/[id]/[episode] | Video player              |
| /search               | Search results            |
| /browse/[category]    | Browse by category        |
| /schedule             | Weekly broadcast schedule |
| /season/upcoming      | Upcoming anime            |
| /profile              | User profile & anime list |
| /login                | Login page                |
| /signup               | Registration page         |

---

## Tech Stack

### Backend

- FastAPI - Web framework
- SQLAlchemy - ORM with SQLite database
- httpx - Async HTTP client
- AniDB data via animap.id - Anime catalogue details
- AnimeX - Episode streams
- AniList - Rankings, seasons, search discovery, and playback ID mapping
- JWT - User authentication

### Frontend

- Next.js 15 - React framework
- TypeScript - Type safety
- Tailwind CSS 4 - Styling
- shadcn/ui - UI components
- AnimeX embedded player - Video playback controls

### Desktop App

- Electron - Cross-platform desktop app
- Electron Forge - Build & packaging

---

## Quick Start

### Option 1: Docker (Recommended)

```bash
docker-compose up -d
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4444`

To rebuild after changes:

```bash
docker-compose up -d --build
```

### Option 2: Startup Script

**Windows:**

```bash
start.bat
```

**Linux/Mac:**

```bash
chmod +x start.sh
./start.sh
```

### Option 3: Electron Desktop App

Run as a standalone desktop application:

```bat
start-electron.bat
```

Run `install-app.bat` first if backend dependencies are not installed. The launcher starts the Next.js frontend if needed, then opens Electron, which starts the backend. `start-app.bat` is an alias for the same launcher.

**Build Desktop App:**

```bash
cd frontend
npm run electron:build
```

or

```bash
./build-app.bat
```

The packaged app will be in `frontend/out/make/`.

### Option 4: Download Pre-built Windows Installer

Download the latest Windows installer from the [Releases](https://github.com/hazavi/aniways/releases) page:

- **Aniways.Setup.X.X.X.exe** - Windows installer with bundled backend

Simply download and run the installer. The app includes both the frontend and backend, so no additional setup is required.

### Option 5: Manual

1. Start backend:

   ```bash
   cd backend
   python server.py
   ```

2. Start frontend (new terminal):

   ```bash
   cd frontend
   npm run dev
   ```

3. Open `http://localhost:3000`

---

## License

MIT
