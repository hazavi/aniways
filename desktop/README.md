# Aniways Desktop App

Electron-based desktop application for Aniways.

## Overview

This folder contains the Electron wrapper that packages the Aniways frontend and backend into a standalone desktop application for Windows.

The bundled backend reads anime data from the official MyAnimeList v2 API and episode streams from AnimeX.

## Files

- `main.js` - Electron main process that manages the application window, starts the bundled backend server, and serves the Next.js frontend
- `preload.js` - Preload script for secure IPC communication between renderer and main process
- `package.json` - Dependencies and electron-builder configuration

## How It Works

When the desktop app starts:

1. **Backend Server** - Starts the bundled `aniways-backend.exe` (compiled with PyInstaller) on port 4444
2. **Frontend Server** - Starts the Next.js standalone server on port 3000
3. **Electron Window** - Opens a browser window pointing to `http://localhost:3000`

## Building

The desktop app is built automatically via GitHub Actions when you push a version tag:

```bash
git tag v1.6.2
git push origin v1.6.2
```

This creates a Windows installer (`Aniways.Setup.X.X.X.exe`) available on the [Releases](https://github.com/hazavi/aniways/releases) page.

### Build Process

The GitHub Actions workflow:

1. Installs Python dependencies and builds the backend with PyInstaller
2. Installs Node.js dependencies and builds the Next.js frontend
3. Copies the built backend and frontend into the desktop folder
4. Runs electron-builder to create the Windows installer

## Development

For development, it's recommended to run the frontend and backend separately:

```bash
# Terminal 1 - Backend
cd backend
python server.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## Configuration

The electron-builder configuration in `package.json` includes:

- **NSIS Installer** - Creates a proper Windows installer with desktop/start menu shortcuts
- **Extra Resources** - Bundles the Next.js standalone build and PyInstaller backend
- **App Metadata** - Name, version, icons, etc.
