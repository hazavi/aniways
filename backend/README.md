# Aniways Backend

A FastAPI-based backend for anime streaming, providing catalogue data from the official MyAnimeList v2 API and episode servers from AnimeX.

## Features

- **User Authentication** - JWT-based auth with 30-day token expiry
- **Anime Lists** - Track anime with status (Plan to Watch, Watching, Completed, Paused, Dropped)
- **SQLite Database** - Persistent storage with SQLAlchemy ORM
- **MyAnimeList Integration** - Anime metadata, search, rankings, seasons, and schedules via MAL v2
- **AnimeX Streams** - Sub and Dub server choices for available episodes
- **AniList ID Mapping** - Connects MyAnimeList IDs to AnimeX titles
- **Caching** - In-memory TTL cache to reduce API calls
- **Player Route** - The frontend serves AnimeX's embedded player inside the watch page

## Quick Start

### Prerequisites

- Python 3.11+
- pip or uv package manager

### Installation

```bash
# Clone and navigate to backend
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# or
.venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt
```

### Running

```bash
# Development (auto-reload when DEBUG=true)
python server.py

# Or with uvicorn directly
uvicorn app.main:app --reload --host 127.0.0.1 --port 4444
```

The API will be available at `http://localhost:4444`

### API Documentation

- Swagger UI: `http://localhost:4444/docs`
- ReDoc: `http://localhost:4444/redoc`

## Configuration

Configuration is managed via environment variables with sensible defaults:

| Variable        | Default                   | Description                         |
| --------------- | ------------------------- | ----------------------------------- |
| `DEBUG`         | `false`                   | Enable debug logging and auto-reload |
| `HOST`          | `127.0.0.1`               | Server bind host                    |
| `PORT`          | `4444`                    | Server bind port                    |
| `MAL_CLIENT_ID` | -                         | Required MyAnimeList v2 client ID   |
| `DATA_DIR`      | `backend/` or `/app/data` | Directory for SQLite database       |

## Project Structure

```
backend/
??? server.py              # Entry point
??? requirements.txt       # Dependencies
??? app/
    ??? main.py            # FastAPI application factory
    ??? core/              # Configuration and shared HTTP client
    ?   ??? config.py
    ?   ??? dependencies.py
    ??? utils/
    ?   ??? cache.py       # TTL cache
    ??? scrapers/
    ?   ??? mal.py         # Official MyAnimeList v2 client
    ?   ??? animex.py      # AnimeX episode servers
    ??? database/
    ?   ??? database.py    # SQLite connection and sessions
    ?   ??? models.py      # User and anime-list models
    ??? auth/
    ?   ??? security.py    # JWT and password hashing
    ?   ??? schemas.py     # Authentication schemas
    ??? routes/
        ??? auth.py        # Registration and login
        ??? animelist.py   # Personal anime lists
        ??? mal.py         # MyAnimeList catalogue
        ??? watch.py       # AnimeX availability and streams
```

## API Reference

### Authentication Endpoints (`/api/auth`)

#### Register

```
POST /api/auth/register
Body: {"username": "user", "password": "pass"}
```

Returns user info and JWT token.

#### Login

```
POST /api/auth/login
Body: {"username": "user", "password": "pass"}
```

Returns JWT token (valid for 30 days).

#### Get Current User

```
GET /api/auth/me
Header: Authorization: Bearer <token>
```

---

### Anime List Endpoints (`/api/list`)

#### Get User's List

```
GET /api/list
Header: Authorization: Bearer <token>
```

| Param    | Default | Description                                         |
| -------- | ------- | --------------------------------------------------- |
| `status` | -       | Filter by status: `plan_to_watch`, `watching`, etc. |

#### Add to List

```
POST /api/list
Header: Authorization: Bearer <token>
Body: {"mal_id": 1, "status": "watching"}
```

#### Update List Item

```
PUT /api/list/{mal_id}
Header: Authorization: Bearer <token>
Body: {"status": "completed"}
```

#### Remove from List

```
DELETE /api/list/{mal_id}
Header: Authorization: Bearer <token>
```

---

### MAL Endpoints (`/api`)

#### Top Anime

```
GET /api/top/anime?filter=airing&page=1&limit=25&type=tv
```

| Param    | Default  | Description                                      |
| -------- | -------- | ------------------------------------------------ |
| `filter` | `airing` | `airing`, `upcoming`, `bypopularity`, `favorite` |
| `page`   | `1`      | Page number (≥1)                                 |
| `limit`  | `25`     | Results per page (1-50)                          |
| `type`   | -        | `tv`, `movie`, `ova`, `special`, `ona`, `music`  |

#### Browse Anime

```
GET /api/browse/anime?status=airing&order_by=score&sort=desc&page=1&limit=25
```

| Param      | Default | Description                                            |
| ---------- | ------- | ------------------------------------------------------ |
| `status`   | -       | `airing`, `complete`, `upcoming`                       |
| `order_by` | -       | `score`, `popularity`, `rank`, `members`, `start_date` |
| `sort`     | `desc`  | `asc`, `desc`                                          |
| `page`     | `1`     | Page number (≥1)                                       |
| `limit`    | `25`    | Results per page (1-25)                                |

#### Search Anime

```
GET /api/anime?q=naruto&page=1&limit=25
```

| Param   | Default | Description             |
| ------- | ------- | ----------------------- |
| `q`     | -       | Search query (required) |
| `page`  | `1`     | Page number (≥1)        |
| `limit` | `25`    | Results per page (1-25) |

#### Anime Details

```
GET /api/anime/{mal_id}
GET /api/anime/{mal_id}/recommendations?limit=12
GET /api/anime/{mal_id}/characters?limit=12
```

| Param   | Default | Description        |
| ------- | ------- | ------------------ |
| `limit` | `12`    | Max results (1-50) |

#### Seasons

```
GET /api/seasons/now?limit=25
GET /api/seasons/upcoming?page=1&limit=25
GET /api/seasons/{year}/{season}?limit=25
```

| Param    | Values                               |
| -------- | ------------------------------------ |
| `year`   | e.g., `2024`                         |
| `season` | `winter`, `spring`, `summer`, `fall` |
| `limit`  | Results per page (1-50)              |

#### Schedule

```
GET /api/schedules?filter=monday&page=1
```

| Param    | Default | Description                  |
| -------- | ------- | ---------------------------- |
| `filter` | -       | `monday`-`sunday`, `unknown` |
| `page`   | `1`     | Page number (≥1)             |

---

### AnimeX Endpoints (`/api`)

#### Availability

```
GET /api/anime/{mal_id}/animex
```

Returns an AnimeX match and episode count when episode 1 has a playable server.

### Watch Endpoints (`/api`)

#### Watch Episode

```
GET /api/watch/{mal_id}/{episode}
```

| Param     | Description          |
| --------- | -------------------- |
| `mal_id`  | MyAnimeList anime ID |
| `episode` | Episode number       |

Returns the available AnimeX Sub and Dub player servers for an episode, including ZEN when offered.

#### Numbered Episodes

```
GET /api/anime/{mal_id}/episodes
```

Returns numbered episodes from MyAnimeList's published episode count. The public API does not supply episode titles.

## AnimeX Playback

The backend maps a MyAnimeList ID to AnimeX through AniList, then reads the server list for the requested episode. The frontend serves the native player through `/animex-player/`, allowing its Quality, Subtitles, Settings, and Servers controls to appear in the watch page.

## MyAnimeList API Setup

Create an API client at MyAnimeList, then set its client ID before starting the backend. Catalogue endpoints use the `X-MAL-CLIENT-ID` header, so no user access token is required.

Create `backend/.env` from `backend/.env.example`, then replace its `MAL_CLIENT_ID` value with your registered client ID. The `.env` file is ignored by Git and is loaded automatically when the backend starts.

```powershell
python server.py
```

MAL v2 does not expose public anime-character or per-episode-title endpoints. Those responses remain available in the API shape but contain no character or episode-title data.

## Rate Limiting

- **MyAnimeList API**: Uses the registered application's client ID for catalogue requests
- **AnimeX**: Server choices are requested per episode

## Caching

The backend uses in-memory caching to reduce load:

- **List endpoints** (top, browse, search): 5 minutes
- **Detail endpoints** (anime, recommendations): 1 hour
- **AnimeX media IDs**: Cached for one hour; episode servers are requested when needed

## Development

### Adding New Routes

1. Create route file in `app/routes/`
2. Define router with `APIRouter(prefix="...", tags=["..."])`
3. Import and include in `app/main.py`

### Error Handling

- Global exception handler returns JSON errors
- Debug mode shows full tracebacks
- Production mode shows generic error messages
