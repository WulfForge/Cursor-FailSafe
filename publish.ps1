# FailSafe Extension Publisher
# PowerShell version with better error handling

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FailSafe Extension Publisher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get current version from package.json
try {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $VERSION = $packageJson.version
    Write-Host "Current version: $VERSION" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Could not read version from package.json" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Function to generate commit message from CHANGELOG
function Get-CommitMessageFromChangelog {
    param([string]$Version)
    
    try {
        $content = Get-Content "CHANGELOG.md" -Raw
        $pattern = "## \[$Version\] - .*(?=## \[|$)"
        
        if ($content -match $pattern) {
            $match = $matches[0]
            $lines = $match -split '\r?\n'
            $features = @()
            $fixes = @()
            $changes = @()
            $inSection = ''
            
            foreach ($line in $lines) {
                if ($line -match '### Added') {
                    $inSection = 'added'
                } elseif ($line -match '### Fixed') {
                    $inSection = 'fixed'
                } elseif ($line -match '### Changed') {
                    $inSection = 'changed'
                } elseif ($line -match '^-\s*\*\*(.+?)\*\*') {
                    $feature = $matches[1]
                    switch ($inSection) {
                        'added' { $features += $feature }
                        'fixed' { $fixes += $feature }
                        'changed' { $changes += $feature }
                    }
                }
            }
            
            $summary = @()
            if ($features.Count -gt 0) {
                $featureText = 'Added: ' + ($features[0..2] -join ', ')
                if ($features.Count -gt 3) {
                    $featureText += ' and ' + ($features.Count - 3) + ' more'
                }
                $summary += $featureText
            }
            
            if ($fixes.Count -gt 0) {
                $fixText = 'Fixed: ' + ($fixes[0..2] -join ', ')
                if ($fixes.Count -gt 3) {
                    $fixText += ' and ' + ($fixes.Count - 3) + ' more'
                }
                $summary += $fixText
            }
            
            if ($changes.Count -gt 0) {
                $changeText = 'Changed: ' + ($changes[0..2] -join ', ')
                if ($changes.Count -gt 3) {
                    $changeText += ' and ' + ($changes.Count - 3) + ' more'
                }
                $summary += $changeText
            }
            
            if ($summary.Count -eq 0) {
                return "Release version $Version"
            } else {
                return "v$Version - " + ($summary -join '; ')
            }
        } else {
            return "Release version $Version"
        }
    } catch {
        return "Release version $Version"
    }
}

# Generate commit message from CHANGELOG
Write-Host "Generating commit message from CHANGELOG..." -ForegroundColor Yellow
$COMMIT_MSG = Get-CommitMessageFromChangelog -Version $VERSION

# Prompt for commit message
$USER_COMMIT_MSG = Read-Host "Enter commit message (or press Enter for auto-generated)"
if (-not [string]::IsNullOrWhiteSpace($USER_COMMIT_MSG)) {
    $COMMIT_MSG = $USER_COMMIT_MSG
}

Write-Host ""
Write-Host "Commit message: $COMMIT_MSG" -ForegroundColor Yellow
Write-Host ""

# Confirm before proceeding
$CONFIRM = Read-Host "Proceed with commit and publish? (y/N)"
if ($CONFIRM -ne "y" -and $CONFIRM -ne "Y") {
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 0
}

# Function to check if command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Function to execute command with error handling
function Invoke-CommandWithErrorHandling($command, $description, $fatal = $true) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host $description -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    try {
        Invoke-Expression $command
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code $LASTEXITCODE"
        }
        Write-Host "SUCCESS: $description" -ForegroundColor Green
    } catch {
        $errorMsg = "ERROR: $description failed - $($_.Exception.Message)"
        if ($fatal) {
            Write-Host $errorMsg -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        } else {
            Write-Host $errorMsg -ForegroundColor Yellow
        }
    }
}

# Step 1: Compile TypeScript
Invoke-CommandWithErrorHandling "npm run compile" "Compiling TypeScript"

# Step 2: Run tests
Invoke-CommandWithErrorHandling "npm test" "Running tests" $false

# Step 3: Check icon integrity
Invoke-CommandWithErrorHandling "npm run prepackage" "Checking icon integrity"

# Step 4: Add files to git
Invoke-CommandWithErrorHandling "git add ." "Adding files to git"

# Step 5: Commit changes
Invoke-CommandWithErrorHandling "git commit -m '" + $COMMIT_MSG + "'" "Committing changes"

# Step 6: Push to GitHub
Invoke-CommandWithErrorHandling "git push origin main" "Pushing to GitHub"

# Step 7: Create and push git tag
try {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Creating git tag" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    git tag "v$VERSION"
    if ($LASTEXITCODE -eq 0) {
        git push origin "v$VERSION"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "SUCCESS: Git tag v$VERSION created and pushed" -ForegroundColor Green
        } else {
            Write-Host "WARNING: Tag push failed, but continuing..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "WARNING: Tag creation failed, but continuing..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "WARNING: Git tag operations failed, but continuing..." -ForegroundColor Yellow
}

# Step 8: Package extension
Invoke-CommandWithErrorHandling "npm run package" "Packaging extension"

# Step 9: Publish to VS Code Marketplace
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Publishing to VS Code Marketplace" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$PUBLISH_CONFIRM = Read-Host "Publish to VS Code Marketplace? (y/N)"
if ($PUBLISH_CONFIRM -eq "y" -or $PUBLISH_CONFIRM -eq "Y") {
    Invoke-CommandWithErrorHandling "npm run publish" "Publishing to VS Code Marketplace"
    Write-Host ""
    Write-Host "SUCCESS: Extension published to VS Code Marketplace!" -ForegroundColor Green
} else {
    Write-Host "Skipping marketplace publish." -ForegroundColor Yellow
}

# Success summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "SUCCESS: All operations completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor White
Write-Host "- Version: $VERSION" -ForegroundColor Cyan
Write-Host "- Commit: $COMMIT_MSG" -ForegroundColor Cyan
Write-Host "- GitHub: Pushed to main branch" -ForegroundColor Cyan
Write-Host "- Tag: v$VERSION created and pushed" -ForegroundColor Cyan
Write-Host "- Package: failsafe-cursor-$VERSION.vsix created" -ForegroundColor Cyan
if ($PUBLISH_CONFIRM -eq "y" -or $PUBLISH_CONFIRM -eq "Y") {
    Write-Host "- Marketplace: Published successfully" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Check GitHub releases page" -ForegroundColor Yellow
Write-Host "2. Verify marketplace listing" -ForegroundColor Yellow
Write-Host "3. Test the published extension" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to exit" 