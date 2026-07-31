@echo off
REM start-all.bat — launches backend and frontend in separate cmd windows

REM Resolve script directory and change to repo root
SET SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

REM Start backend (keeps window open)
start "Backend" cmd /k "cd /d "%SCRIPT_DIR%backend" && node src/server.js"

REM Start frontend (keeps window open)
start "Frontend" cmd /k "cd /d "%SCRIPT_DIR%frontend" && npm run start"

echo Launched backend and frontend in new windows.
exit /b 0
