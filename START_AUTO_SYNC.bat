@echo off
title RecruitAI Auto-Sync to GitHub, Vercel & Render
echo ========================================================
echo   RecruitAI Continuous Deployment Watcher
echo   Auto-commits and pushes local changes to GitHub main
echo   Triggers Vercel and Render auto-deployments
echo ========================================================
echo.
cd /d "%~dp0"
node auto-sync.js
pause
