@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 LTS from https://nodejs.org/en/download then reopen this file.
  pause
  exit /b 1
)
node scripts\start-local.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
