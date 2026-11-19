@echo off
setlocal
cd /d "%~dp0"
echo Installing backend dependencies...
call npm install
if errorlevel 1 goto failed
cd /d "%~dp0frontend"
echo Installing frontend dependencies...
call npm install
if errorlevel 1 goto failed
echo.
echo Dependencies installed successfully.
echo Next: copy .env.example to .env and fill in your MySQL password and JWT secret.
pause
exit /b 0
:failed
echo.
echo Installation failed. Check the error above and confirm Node.js and npm are installed.
pause
exit /b 1
