@echo off
cd /d "%~dp0"
start "" "http://localhost:5500/Azamat.html"
py -m http.server 5500
if errorlevel 1 (
    echo.
    echo Не удалось запустить локальный сервер на порту 5500.
    echo Откройте это окно и пришлите показанную ошибку.
    pause
)
