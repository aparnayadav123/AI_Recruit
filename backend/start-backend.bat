@echo off
echo 🚀 Starting RecruitAI MongoDB Backend...
echo.

REM Stop any existing Node.js processes
taskkill /f /im node.exe >nul 2>&1

REM Start the robust MongoDB backend
echo 🗄️  Starting robust MongoDB backend...
node robust-mongodb-backend.js

pause
