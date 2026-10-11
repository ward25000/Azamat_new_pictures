@echo off
cd /d "%~dp0"
if defined AZURE_SPEECH_KEY if defined AZURE_SPEECH_REGION (
    echo Azure Speech mode: Daulet/Dmitry neural voices
) else (
    echo Edge TTS mode: Daulet/Dmitry voices
)
py tts_server.py
pause
