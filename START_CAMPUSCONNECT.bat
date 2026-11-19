@echo off
setlocal
cd /d "%~dp0"
echo Starting CampusConnect backend...
start "CampusConnect Backend" cmd /k "npm start"
timeout /t 3 /nobreak >nul
cd /d "%~dp0frontend"
echo Starting CampusConnect frontend...
start "CampusConnect Frontend" cmd /k "npm run dev"
echo.
echo Both servers are starting. Keep both terminal windows open.
echo Open the Vite URL shown in the frontend terminal.
endlocal
