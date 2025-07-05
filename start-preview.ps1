#!/usr/bin/env pwsh

Write-Host "🎯 FailSafe Preview Manager" -ForegroundColor Cyan
Write-Host ""

$command = $args[0]

switch ($command) {
    "start" {
        Write-Host "🚀 Starting preview server..." -ForegroundColor Green
        node scripts/preview-manager.js start --browser
    }
    "stop" {
        Write-Host "🛑 Stopping preview server..." -ForegroundColor Yellow
        node scripts/preview-manager.js stop
    }
    "restart" {
        Write-Host "🔄 Restarting preview server..." -ForegroundColor Blue
        node scripts/preview-manager.js restart
    }
    "status" {
        Write-Host "📊 Checking status..." -ForegroundColor Magenta
        node scripts/preview-manager.js status
    }
    "logs" {
        $lines = if ($args[1]) { $args[1] } else { 50 }
        Write-Host "📋 Showing logs..." -ForegroundColor Gray
        node scripts/preview-manager.js logs $lines
    }
    default {
        Write-Host "Usage: .\start-preview.ps1 [start|stop|restart|status|logs]" -ForegroundColor White
        Write-Host ""
        Write-Host "Examples:" -ForegroundColor Gray
        Write-Host "  .\start-preview.ps1 start" -ForegroundColor White
        Write-Host "  .\start-preview.ps1 stop" -ForegroundColor White
        Write-Host "  .\start-preview.ps1 restart" -ForegroundColor White
        Write-Host "  .\start-preview.ps1 status" -ForegroundColor White
        Write-Host "  .\start-preview.ps1 logs 100" -ForegroundColor White
    }
} 