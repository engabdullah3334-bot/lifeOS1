@echo off
echo ========================================
echo    LifeOS - Pure Python Application
echo ========================================
echo.

REM Check if virtual environment exists
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -q -r requirements.txt

REM Run the application
echo.
echo Starting LifeOS...
echo.
python main.py

pause
