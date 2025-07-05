# FailSafe Preview System Guide

## Overview

The FailSafe Preview System provides a seamless way to test and preview the UI without reloading the VS Code extension. It offers both **webview** and **browser** access options while keeping the process management hidden from the user.

## Key Features

- 🎯 **Dual Access**: Preview in VS Code webview or external browser
- 🔄 **Background Process**: Server runs in background, no terminal clutter
- 📋 **Comprehensive Logging**: Detailed logs for debugging while keeping UI clean
- 🚀 **Easy Management**: Simple start/stop/restart commands
- 🔍 **Health Monitoring**: Built-in health checks and status reporting

## Quick Start

### Option 1: Using Batch Files (Windows)
```bash
# Start preview with browser
start-preview.bat start

# Stop preview
start-preview.bat stop

# Restart preview
start-preview.bat restart

# Check status
start-preview.bat status

# View logs
start-preview.bat logs 100
```

### Option 2: Using PowerShell (Windows)
```powershell
# Start preview with browser
.\start-preview.ps1 start

# Stop preview
.\start-preview.ps1 stop

# Restart preview
.\start-preview.ps1 restart

# Check status
.\start-preview.ps1 status

# View logs
.\start-preview.ps1 logs 100
```

### Option 3: Direct Node.js Commands
```bash
# Start preview with browser
node scripts/preview-manager.js start --browser

# Start preview with webview
node scripts/preview-manager.js start --webview

# Start on specific port
node scripts/preview-manager.js start --port 3002

# Stop preview
node scripts/preview-manager.js stop

# Restart preview
node scripts/preview-manager.js restart

# Check status
node scripts/preview-manager.js status

# View logs
node scripts/preview-manager.js logs 50
```

## VS Code Integration

### Commands Available
- `failsafe.startPreview` - Start preview for current workspace (auto-tracking)
- `failsafe.startPreviewForWorkspace` - Start preview for specific workspace
- `failsafe.listPreviewInstances` - Show active preview instances
- `failsafe.stopPreviewInstance` - Stop specific preview instance
- `failsafe.stopAllPreviewInstances` - Stop all preview instances
- `failsafe.openPreviewInBrowser` - Open preview in browser
- `failsafe.openPreviewInWebview` - Open preview in VS Code webview

### Auto-Tracking
The preview system automatically tracks workspace changes:
- When you switch workspaces, it stops the previous preview and starts a new one
- You can toggle auto-tracking on/off using the command palette
- Manual preview starts always use auto-tracking for the current workspace

## Access Options

### Browser Access
- **URL**: `http://localhost:3001/preview`
- **Features**: Full browser capabilities, external sharing, bookmarking
- **Best for**: Testing, sharing with team, external tools

### VS Code Webview
- **URL**: `http://localhost:3001/preview?webview=true`
- **Features**: Integrated within VS Code, persistent across sessions
- **Best for**: Development, quick testing, staying within VS Code

## Process Management

### Background Operation
- Preview server runs as a detached background process
- No terminal webview clutter or multiple terminal sessions
- Process ID stored in temporary file for management
- Automatic cleanup on shutdown

### Health Monitoring
- Health endpoint: `http://localhost:3001/health`
- Automatic server readiness detection
- Memory usage and uptime monitoring
- Graceful shutdown handling

### Logging System
- **Log File**: Stored in system temp directory
- **Log Levels**: INFO, WARN, ERROR
- **Access**: View recent logs with `logs` command
- **Persistence**: Logs survive server restarts

## Configuration

### Port Management
- **Default Port**: 3001
- **Port Range**: 3001-3100 (automatic fallback)
- **Custom Port**: Use `--port` option
- **Port Conflicts**: Automatic detection and resolution

### Environment Variables
- `PORT` - Override default port
- `NODE_ENV` - Environment mode
- `PREVIEW_LOG_LEVEL` - Logging verbosity

## Troubleshooting

### Common Issues

#### Server Won't Start
```bash
# Check if port is in use
netstat -an | findstr :3001

# Kill conflicting processes
taskkill /F /IM node.exe

# Check logs
node scripts/preview-manager.js logs
```

#### Multiple Terminal Webviews
- **Problem**: Each restart creates new terminal webview
- **Solution**: Use the new preview manager (no more terminal clutter)
- **Alternative**: Close old terminal webviews manually

#### Browser Won't Open
```bash
# Manual browser access
http://localhost:3001/preview

# Check server status
node scripts/preview-manager.js status
```

### Debug Mode
```bash
# Start with verbose logging
NODE_ENV=development node scripts/preview-manager.js start

# View detailed logs
node scripts/preview-manager.js logs 200
```

## Architecture

### Components
1. **PreviewManager** - Main process management class
2. **Fastify Server** - HTTP server with health monitoring
3. **UI Components** - React-based preview interface
4. **Logging System** - Comprehensive logging with file persistence

### File Structure
```
scripts/
├── preview-manager.js     # Main process manager
├── start-preview.js       # Fastify server starter
start-preview.bat          # Windows batch wrapper
start-preview.ps1          # PowerShell wrapper
stop-preview.bat           # Stop script
stop-preview.ps1           # Stop script
```

### Process Flow
1. User runs start command
2. PreviewManager checks for existing processes
3. Starts Fastify server in background
4. Waits for health endpoint to respond
5. Opens browser/webview automatically
6. Provides access URLs and status

## Best Practices

### Development Workflow
1. Start preview with `start-preview.bat start`
2. Make UI changes in VS Code
3. Refresh browser/webview to see changes
4. Use logs for debugging: `start-preview.bat logs`
5. Stop when done: `start-preview.bat stop`

### Team Collaboration
- Share browser URLs for team review
- Use specific ports for multiple developers
- Check logs for troubleshooting
- Restart server after major changes

### Performance
- Server starts in ~2-3 seconds
- Health check timeout: 30 seconds
- Memory usage: ~50-100MB
- Log rotation: Manual (use logs command)

## Future Enhancements

### Planned Features
- [ ] WebSocket support for real-time updates
- [ ] Multiple preview instances per workspace
- [ ] Preview templates and configurations
- [ ] Integration with VS Code webview API
- [ ] Automatic log rotation
- [ ] Preview sharing with authentication

### Integration Ideas
- [ ] GitHub integration for preview sharing
- [ ] Slack/Discord notifications
- [ ] Preview analytics and metrics
- [ ] Custom preview themes
- [ ] Preview export functionality

---

## Support

For issues or questions:
1. Check the logs: `node scripts/preview-manager.js logs`
2. Verify server status: `node scripts/preview-manager.js status`
3. Restart the server: `node scripts/preview-manager.js restart`
4. Check the troubleshooting section above

The preview system is designed to be robust and user-friendly while providing comprehensive logging for debugging when needed. 