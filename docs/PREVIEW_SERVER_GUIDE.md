# FailSafe Preview Server Management

This guide explains how to use the batch files and scripts to manage the FailSafe preview server.

## Quick Start

### Windows (Batch Files)
```bash
# Start the preview server (automatically finds available port)
start-preview.bat

# Stop the preview server
stop-preview.bat
```

### Windows (PowerShell)
```powershell
# Start the preview server (automatically finds available port)
.\start-preview.ps1

# Stop the preview server
.\stop-preview.ps1
```

### Manual (Node.js)
```bash
# Start with npm script (uses default port 3001)
npm run preview

# Start with custom port
node scripts/start-preview.js [workspace-path] [port]
```

## Features

### Automatic Port Detection
- Starts with port 3001 by default
- Automatically finds the next available port if 3001 is in use
- Tries ports 3001-3010 before giving up
- Displays the actual port being used

### Process Management
- **Start scripts**: Check port availability and start the server
- **Stop scripts**: Find and kill Node.js processes on preview ports
- **Cleanup**: Removes any remaining Node.js processes

### Error Handling
- Graceful handling of port conflicts
- Clear error messages and status updates
- Automatic fallback to alternate ports

## Port Range
- **Default start port**: 3001
- **Fallback range**: 3001-3010
- **Customizable**: Edit the scripts to change the port range

## Server Information
When the server starts, you'll see:
```
🚀 Starting FailSafe Preview Server...
✅ Port 3001 is available
🎯 Starting server on port 3001...
📱 Preview will be available at: http://localhost:3001/preview
🎯 Project: FailSafe
🆔 Instance: preview-1751394130906-7xz0vg0no
🔄 Press Ctrl+C to stop the server
```

## Troubleshooting

### Port Already in Use
If you see "Port X is already in use":
1. The script will automatically try the next port
2. If all ports 3001-3010 are busy, run `stop-preview.bat` first
3. Or manually kill processes using those ports

### Server Won't Start
1. Check if Node.js is installed and in PATH
2. Ensure all dependencies are installed (`npm install`)
3. Check if the TypeScript is compiled (`npm run compile`)
4. Look for error messages in the console

### Can't Stop Server
1. Run `stop-preview.bat` or `stop-preview.ps1`
2. If that doesn't work, manually kill Node.js processes:
   ```bash
   taskkill /IM node.exe /F
   ```

## File Structure
```
FailSafe/
├── start-preview.bat          # Windows batch file to start server
├── stop-preview.bat           # Windows batch file to stop server
├── start-preview.ps1          # PowerShell script to start server
├── stop-preview.ps1           # PowerShell script to stop server
├── scripts/
│   └── start-preview.js       # Main preview server script
└── PREVIEW_SERVER_GUIDE.md    # This guide
```

## Advanced Usage

### Custom Port Range
Edit the batch files to change the port range:
```batch
:: In start-preview.bat
set PORT=4001
set MAX_ATTEMPTS=20
```

### Custom Workspace
```bash
# Start preview for specific workspace
node scripts/start-preview.js "C:\path\to\workspace" 3001
```

### Environment Variables
The scripts support these environment variables:
- `PREVIEW_PORT`: Override the default port
- `PREVIEW_WORKSPACE`: Override the workspace path 