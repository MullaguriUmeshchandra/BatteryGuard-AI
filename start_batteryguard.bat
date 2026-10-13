@echo off
echo =======================================================
echo Starting BatteryGuard AI Platform
echo =======================================================
echo.
echo Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "BatteryGuard AI - Backend" cmd /k "cd /d "%~dp0\batteryguard-ai\backend" && ..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo Launching Vite React Frontend on http://localhost:5173 ...
start "BatteryGuard AI - Frontend" cmd /k "cd /d "%~dp0\batteryguard-ai\frontend" && npm run dev"

echo.
echo Both services launched! 
echo Backend Docs: http://127.0.0.1:8000/docs
echo Frontend UI:  http://localhost:5173
echo.
pause
