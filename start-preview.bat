@echo off
echo 🎯 FailSafe Preview Manager
echo.

if "%1"=="start" (
    echo 🚀 Starting preview server...
    node scripts/preview-manager.js start --browser
) else if "%1"=="stop" (
    echo 🛑 Stopping preview server...
    node scripts/preview-manager.js stop
) else if "%1"=="restart" (
    echo 🔄 Restarting preview server...
    node scripts/preview-manager.js restart
) else if "%1"=="status" (
    echo 📊 Checking status...
    node scripts/preview-manager.js status
) else if "%1"=="logs" (
    echo 📋 Showing logs...
    node scripts/preview-manager.js logs %2
) else (
    echo Usage: start-preview.bat [start^|stop^|restart^|status^|logs]
    echo.
    echo Examples:
    echo   start-preview.bat start
    echo   start-preview.bat stop
    echo   start-preview.bat restart
    echo   start-preview.bat status
    echo   start-preview.bat logs 100
) 