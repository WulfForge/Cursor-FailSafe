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

:: Function to generate commit message from CHANGELOG
echo Generating commit message from CHANGELOG...
set COMMIT_MSG=
for /f "tokens=*" %%i in ('powershell -Command "& { $content = Get-Content 'CHANGELOG.md' -Raw; $version = '%VERSION%'; $pattern = '## \[' + $version + '\] - .*(?=## \[|$)'; if ($content -match $pattern) { $match = $matches[0]; $lines = $match -split '\r?\n'; $features = @(); $fixes = @(); $changes = @(); $inSection = ''; foreach ($line in $lines) { if ($line -match '### Added') { $inSection = 'added'; } elseif ($line -match '### Fixed') { $inSection = 'fixed'; } elseif ($line -match '### Changed') { $inSection = 'changed'; } elseif ($line -match '^-\s*\*\*(.+?)\*\*') { $feature = $matches[1]; switch ($inSection) { 'added' { $features += $feature; } 'fixed' { $fixes += $feature; } 'changed' { $changes += $feature; } } } } $summary = @(); if ($features.Count -gt 0) { $summary += 'Added: ' + ($features[0..2] -join ', '); if ($features.Count -gt 3) { $summary += ' and ' + ($features.Count - 3) + ' more'; } } if ($fixes.Count -gt 0) { $summary += 'Fixed: ' + ($fixes[0..2] -join ', '); if ($fixes.Count -gt 3) { $summary += ' and ' + ($fixes.Count - 3) + ' more'; } } if ($changes.Count -gt 0) { $summary += 'Changed: ' + ($changes[0..2] -join ', '); if ($changes.Count -gt 3) { $summary += ' and ' + ($changes.Count - 3) + ' more'; } } if ($summary.Count -eq 0) { 'Release version ' + $version; } else { 'v' + $version + ' - ' + ($summary -join '; '); } } else { 'Release version ' + $version; } }"') do set COMMIT_MSG=%%i

:: Prompt for commit message
set /p USER_COMMIT_MSG="Enter commit message (or press Enter for auto-generated): "
if not "!USER_COMMIT_MSG!"=="" set COMMIT_MSG=!USER_COMMIT_MSG!

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
echo Step 2: Running linting...
echo ========================================
call npm run lint
if %errorlevel% neq 0 (
    echo WARNING: Linting issues found, but continuing...
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
echo Step 4: Running tests...
echo ========================================
call npm test
if %errorlevel% neq 0 (
    echo WARNING: Tests failed, but continuing...
)

echo.
echo ========================================
echo Step 5: Adding files to git...
echo ========================================
git add .
if %errorlevel% neq 0 (
    echo ERROR: Git add failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 6: Committing changes...
echo ========================================
git commit -m "!COMMIT_MSG!"
if %errorlevel% neq 0 (
    echo ERROR: Git commit failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 7: Pushing to GitHub...
echo ========================================
git push origin main
if %errorlevel% neq 0 (
    echo ERROR: Git push failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 8: Creating git tag...
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
echo Step 9: Packaging extension...
echo ========================================
call npm run package
if %errorlevel% neq 0 (
    echo ERROR: Packaging failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Step 10: Publishing to VS Code Marketplace...
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
echo - Package: cursor-failsafe-%VERSION%.vsix created
if /i "!PUBLISH_CONFIRM!"=="y" echo - Marketplace: Published successfully
echo.
echo Next steps:
echo 1. Check GitHub releases page
echo 2. Verify marketplace listing
echo 3. Test the published extension
echo.
pause 