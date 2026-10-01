# Changelog

All notable changes to this project will be documented in this file.

## [v1.6.2] - 2026-09-30

### Added

- AnimeX Sub and Dub server choices with in-player quality, subtitle, and playback settings.
- AniDB catalogue with AniDB IDs and no API client ID.

### Changed

- Catalogue details use AniDB records; AniList supplies discovery, and AnimeX supplies episode streams.
- The homepage shows popular airing anime in place of the former release feed.

### Removed

- Obsolete provider routes, browser cookies, extraction code, and dependencies.

## [v1.6.1] - 2026-04-13

### Changed
- Updated packages to version: 1.6.1

### Fixed

- **Poster images loads**: Allow images to load from external CDN domains by removing restrictive CSP headers

## [v1.6.0] - 2026-02-4

### Added

- **Windows Executable**: Standalone Windows installer (.exe) available in releases
- **Automated Release Builds**: GitHub Actions workflow for automatic Windows builds on version tags
- **Build Script**: `build-windows-exe.bat` for local Windows executable builds
- **SQLite Database**: Persistent storage using SQLAlchemy with SQLite
  - User authentication with JWT tokens (30-day expiry)
  - Anime list management (plan to watch, watching, completed, paused, dropped)
  - Optimized with WAL mode, foreign keys, and composite indexes for performance
  - Database stored in `backend/aniways.db` (locally) or `/app/data/aniways.db` (Docker)
- **Docker Database Persistence**: Volume mount `aniways-data` for persistent database storage
- **One-Click Installer**: `install-app.bat` to automatically install both backend and frontend dependencies
  - Automatically detects and uses Python (supports both `python` and `py` launcher)
  - Creates virtual environment if it doesn't exist
  - Installs all required packages
- **Installation Guide**: `INSTALL.md` with prerequisites and quick start instructions

### Changed

- **Watch Page Responsiveness**: Anime info sidebar only shows on extra-large screens (2xl+), giving more room for video player on smaller screens
- **Video Controls Layout**: Improved responsive layout to prevent button overlapping on medium-sized screens

### Fixed

- **Add to List Dropdown**: Dropdown no longer overlaps the popover card
- **Continue Watching Duplicates**: Only displays one entry per anime showing the most recently watched episode
