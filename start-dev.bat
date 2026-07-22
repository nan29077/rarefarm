@echo off
echo [RareFarm] Starting dev server...
echo Killing existing process on port 3014...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3014" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul
timeout /t 2 /nobreak >nul
echo Starting server at http://localhost:3014
echo.
cd /d "%~dp0"
npm run dev
echo.
echo Server stopped.
pause
