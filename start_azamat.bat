@echo off
cd /d "%~dp0"
start "" "http://localhost:5500/Azamat.html"
py -m http.server 5500
