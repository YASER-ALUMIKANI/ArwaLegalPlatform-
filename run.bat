@echo off
echo ========================================================
echo         Arwa Legal Platform - Unified Runner
echo ========================================================
echo.

echo [1/2] Starting Backend Server (FastAPI)...
start "Arwa - Backend (FastAPI)" cmd /k "cd backend && call .venv\Scripts\activate && uvicorn app.main:app --reload"

echo [2/2] Starting Frontend Server (React/Vite)...
start "Arwa - Frontend (React/Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo --------------------------------------------------------
echo Server processes launched in separate windows!
echo.
echo - Frontend URL: http://localhost:5173
echo - Backend API:  http://127.0.0.1:8000
echo - API Docs:     http://127.0.0.1:8000/docs
echo --------------------------------------------------------
echo.
pause
