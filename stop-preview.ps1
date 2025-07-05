#!/usr/bin/env pwsh

# FailSafe Preview Server Stopper (PowerShell)
# This script stops the preview server by killing Node.js processes on preview ports

param(
    [int]$StartPort = 3001,
    [int]$EndPort = 3010
)

Write-Host "🛑 Stopping FailSafe Preview Server..." -ForegroundColor Yellow
node scripts/preview-manager.js stop

$foundProcesses = 0

# Function to get processes using a specific port
function Get-ProcessesOnPort {
    param([int]$Port)
    
    $processes = @()
    $netstat = netstat -ano | Select-String ":$Port "
    
    foreach ($line in $netstat) {
        $parts = $line -split '\s+'
        if ($parts.Length -ge 5) {
            $processId = $parts[4]
            if ($processId -ne "0") {
                $processes += $processId
            }
        }
    }
    
    return $processes
}

# Check each port in range
for ($port = $StartPort; $port -le $EndPort; $port++) {
    Write-Host "Checking port $port..." -ForegroundColor Yellow
    
    $processes = Get-ProcessesOnPort -Port $port
    
    foreach ($processId in $processes) {
        Write-Host "Found process $processId on port $port" -ForegroundColor Cyan
        Write-Host "Killing process $processId..." -ForegroundColor Yellow
        
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
            Write-Host "✅ Killed process $processId on port $port" -ForegroundColor Green
            $foundProcesses++
        }
        catch {
            $errorMsg = $_.Exception.Message
            Write-Host "❌ Failed to kill process $processId: $errorMsg" -ForegroundColor Red
        }
    }
}

Write-Host ""
if ($foundProcesses -gt 0) {
    Write-Host "✅ Stopped $foundProcesses preview server process(es)" -ForegroundColor Green
} else {
    Write-Host "ℹ️ No preview server processes found running on ports $StartPort-$EndPort" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🧹 Cleaning up any remaining Node.js processes..." -ForegroundColor Cyan

try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Stop-Process -Name "node" -Force -ErrorAction Stop
        Write-Host "✅ Cleaned up Node.js processes" -ForegroundColor Green
    } else {
        Write-Host "ℹ️ No additional Node.js processes to clean up" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "ℹ️ No additional Node.js processes to clean up" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 Preview server cleanup complete!" -ForegroundColor Green
Read-Host "Press Enter to exit" 