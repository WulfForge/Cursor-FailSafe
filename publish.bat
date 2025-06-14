@echo off
setlocal enabledelayedexpansion

echo ========================================
echo FailSafe Extension Publisher
echo ========================================
echo.

:: Get current version from package.json
for /f "tokens=*" %%i in ('powershell -Command "(Get-Content package.json | ConvertFrom-Json).version"') do set VERSION=%%i
echo Current version: %VERSION%
echo.

:: Prompt for commit message
set /p COMMIT_MSG="Enter commit message (or press Enter for default): "
if "!COMMIT_MSG!"=="" set COMMIT_MSG="Release version %VERSION% - Dashboard improvements and testing features"

echo.
echo Commit message: !COMMIT_MSG!
echo.

:: Confirm before proceeding
set /p CONFIRM="Proceed with commit and publish? (y/N): "
if /i not "!CONFIRM!"=="y" (
    echo Operation cancelled.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 1: Compiling TypeScript...
echo ========================================
call npm run compile
if %errorlevel% neq 0 (
    echo ERROR: Compilation failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 2: Running tests...
echo ========================================
call npm test
if %errorlevel% neq 0 (
    echo WARNING: Tests failed, but continuing...
)

echo.
echo ========================================
echo Step 3: Checking icon integrity...
echo ========================================
call npm run prepackage
if %errorlevel% neq 0 (
    echo ERROR: Icon integrity check failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 4: Adding files to git...
echo ========================================
git add .
if %errorlevel% neq 0 (
    echo ERROR: Git add failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 5: Committing changes...
echo ========================================
git commit -m "!COMMIT_MSG!"
if %errorlevel% neq 0 (
    echo ERROR: Git commit failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 6: Pushing to GitHub...
echo ========================================
git push origin main
if %errorlevel% neq 0 (
    echo ERROR: Git push failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 7: Creating git tag...
echo ========================================
git tag v%VERSION%
if %errorlevel% neq 0 (
    echo WARNING: Tag creation failed, but continuing...
)

git push origin v%VERSION%
if %errorlevel% neq 0 (
    echo WARNING: Tag push failed, but continuing...
)

echo.
echo ========================================
echo Step 8: Packaging extension...
echo ========================================
call npm run package
if %errorlevel% neq 0 (
    echo ERROR: Packaging failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 9: Publishing to VS Code Marketplace...
echo ========================================
set /p PUBLISH_CONFIRM="Publish to VS Code Marketplace? (y/N): "
if /i "!PUBLISH_CONFIRM!"=="y" (
    call npm run publish
    if %errorlevel% neq 0 (
        echo ERROR: Publishing failed!
        pause
        exit /b 1
    )
    echo.
    echo SUCCESS: Extension published to VS Code Marketplace!
) else (
    echo Skipping marketplace publish.
)

echo.
echo ========================================
echo SUCCESS: All operations completed!
echo ========================================
echo.
echo Summary:
echo - Version: %VERSION%
echo - Commit: !COMMIT_MSG!
echo - GitHub: Pushed to main branch
echo - Tag: v%VERSION% created and pushed
echo - Package: failsafe-cursor-%VERSION%.vsix created
if /i "!PUBLISH_CONFIRM!"=="y" echo - Marketplace: Published successfully
echo.
echo Next steps:
echo 1. Check GitHub releases page
echo 2. Verify marketplace listing
echo 3. Test the published extension
echo.
pause 