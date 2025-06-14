# Test script for commit message generation
$VERSION = "1.4.1"

function Get-CommitMessageFromChangelog {
    param([string]$Version)
    
    try {
        $content = Get-Content "CHANGELOG.md" -Raw
        $pattern = "## \[$Version\].*?(?=## \[|$)"
        
        if ($content -match $pattern) {
            $match = $matches[0]
            Write-Host "Found section for version $Version" -ForegroundColor Yellow
            Write-Host "Section length: $($match.Length)" -ForegroundColor Yellow
            
            $lines = $match -split '\r?\n'
            $features = @()
            $fixes = @()
            $changes = @()
            $inSection = ''
            
            foreach ($line in $lines) {
                if ($line -match '### Added') {
                    $inSection = 'added'
                    Write-Host "Found Added section" -ForegroundColor Green
                } elseif ($line -match '### Fixed') {
                    $inSection = 'fixed'
                    Write-Host "Found Fixed section" -ForegroundColor Green
                } elseif ($line -match '### Changed') {
                    $inSection = 'changed'
                    Write-Host "Found Changed section" -ForegroundColor Green
                } elseif ($line -match '^-\s*\*\*(.+?)\*\*') {
                    $feature = $matches[1]
                    Write-Host "Found feature: $feature in section: $inSection" -ForegroundColor Cyan
                    switch ($inSection) {
                        'added' { $features += $feature }
                        'fixed' { $fixes += $feature }
                        'changed' { $changes += $feature }
                    }
                }
            }
            
            Write-Host "Features found: $($features.Count)" -ForegroundColor Yellow
            Write-Host "Fixes found: $($fixes.Count)" -ForegroundColor Yellow
            Write-Host "Changes found: $($changes.Count)" -ForegroundColor Yellow
            
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
            Write-Host "No section found for version $Version" -ForegroundColor Red
            return "Release version $Version"
        }
    } catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        return "Release version $Version"
    }
}

$commitMsg = Get-CommitMessageFromChangelog -Version $VERSION
Write-Host "Generated commit message: $commitMsg" -ForegroundColor Green 