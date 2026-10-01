@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo Node.js is required. Install Node.js 20 or newer, then try again.
    exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
    echo npm is required. Install Node.js with npm, then try again.
    exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
    echo Backend dependencies are missing. Run install-app.bat first.
    exit /b 1
)

if not exist "frontend\node_modules\next\dist\bin\next" (
    echo Installing frontend dependencies...
    pushd frontend
    call npm.cmd ci
    if errorlevel 1 (
        popd
        exit /b 1
    )
    popd
)

if not exist "desktop\node_modules\electron\package.json" (
    echo Installing desktop dependencies...
    pushd desktop
    call npm.cmd ci
    if errorlevel 1 (
        popd
        exit /b 1
    )
    popd
)

if not exist "desktop\node_modules\electron\dist\electron.exe" (
    echo Downloading Electron runtime...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-electron.ps1"
    if errorlevel 1 exit /b 1
)

rem Codex and some terminal environments set this to run Electron as Node.
set "ELECTRON_RUN_AS_NODE="

powershell.exe -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000' -TimeoutSec 2 | Out-Null } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo Starting Next.js frontend on port 3000...
    start "Aniways Frontend" /min /D "%~dp0frontend" cmd /k "npm.cmd run dev -- --port 3000"
)

echo Waiting for the frontend...
call "desktop\node_modules\.bin\wait-on.cmd" -t 60000 http://127.0.0.1:3000
if errorlevel 1 (
    echo Frontend did not start on port 3000. Check the Aniways Frontend window.
    exit /b 1
)

if /I "%~1"=="--check" (
    echo Aniways desktop prerequisites are ready.
    exit /b 0
)

echo Opening Aniways in Electron...
pushd desktop
"node_modules\electron\dist\electron.exe" .
set "APP_EXIT=%ERRORLEVEL%"
popd
exit /b %APP_EXIT%
