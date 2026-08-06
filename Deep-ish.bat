@echo off
REM Double-click this to launch Deep-ish.
cd /d "%~dp0"

if not exist "server\node_modules" (
  echo First run - installing dependencies ^(this only happens once^)...
  call npm run setup
)
if not exist "client\node_modules" (
  call npm run setup
)

call npm run build --prefix client

start "" /min cmd /c "timeout /t 3 >nul & start http://localhost:5174"

echo.
echo Deep-ish is starting at http://localhost:5174
echo Keep this window open while you use it. Close it to stop.
echo.

call npm run dev --prefix server
