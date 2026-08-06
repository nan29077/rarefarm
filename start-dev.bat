@echo off
setlocal
set "RAREFARM_PORT=3014"

echo [RareFarm] Starting dev server...
echo Killing existing process on port %RAREFARM_PORT%...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%RAREFARM_PORT%" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul
timeout /t 2 /nobreak >nul

for /f "delims=" %%i in ('node -e "const os=require('os');const a=Object.values(os.networkInterfaces()).flat().filter(x=^>x^&^&x.family==='IPv4'^&^&!x.internal).map(x=^>x.address);const score=x=^>x.startsWith('192.168.')?0:x.startsWith('10.')?1:/^172\.(1[6-9]^|2[0-9]^|3[01])\./.test(x)?2:3;console.log(a.sort((x,y)=^>score(x)-score(y))[0]^|^|'');"') do set "RAREFARM_LAN_IP=%%i"

echo.
echo   RareFarm development server
echo   - Local:   http://localhost:%RAREFARM_PORT%/
if defined RAREFARM_LAN_IP (
  echo   - Network: http://%RAREFARM_LAN_IP%:%RAREFARM_PORT%/
) else (
  echo   - Network: LAN IP address could not be detected.
)
echo.
cd /d "%~dp0"
npm run dev
echo.
echo Server stopped.
pause
endlocal
