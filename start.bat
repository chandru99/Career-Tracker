@echo off
title Career Tracker
cd /d "%~dp0"

echo ================================================
echo  Career Tracker
echo ================================================
echo.
echo  Starting server at http://localhost:8000
echo  Press Ctrl+C to stop.
echo.

:: Open browser after a 2-second delay (runs in background)
start /b "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8000"

:: Start the FastAPI server
python main.py

:: Keep window open if server exits with an error
echo.
echo Server stopped. Press any key to close.
pause >nul
