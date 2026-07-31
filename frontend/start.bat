@echo off
cd /d "%~dp0"
start "Chitkote Frontend" npm.cmd run start -- --host 0.0.0.0 --port 3000
