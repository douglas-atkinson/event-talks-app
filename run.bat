@echo off
echo ===================================================
echo  Starting BigQuery Release Notes Hub...
echo ===================================================
if not exist "venv" (
    echo [ERROR] Virtual environment 'venv' not found. Creating it now...
    python -m venv venv
    .\venv\Scripts\pip install Flask requests feedparser beautifulsoup4
)
echo Running Flask server via virtual environment...
.\venv\Scripts\python app.py
pause
