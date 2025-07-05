# FailSafe Preview System Guide

## Overview

The FailSafe Preview System allows you to test and develop UI components without reloading the extension. This is one of the most powerful features of the Fastify integration, enabling rapid UI development and testing with **automatic workspace tracking**.

## Quick Start

### 1. Start Preview with Auto-Tracking (Recommended)

Use the command palette (`Ctrl+Shift+P`) and run:
```
FailSafe: Start Preview (Auto-Tracking)
```

This will:
- Start the Fastify preview server for your current workspace
- **Automatically track workspace changes** - when you switch workspaces, the preview updates automatically
- Enable hot-reload functionality
- Provide access to all UI components

### 2. Manual Workspace Selection

For multi-root workspaces or manual control, use:
```
FailSafe: Start Preview for Workspace
```

This allows you to:
- Select a specific workspace from a list
- Start preview for any workspace folder
- Maintain manual control over which workspace is previewed

### 3. Open Preview in VS Code

Use the command palette (`Ctrl+Shift+P`) and run:
```
FailSafe: Open Preview Window
```

This opens a dedicated preview panel in VS Code with:
- Tab navigation between different UI components
- Real-time updates
- Auto-refresh every 30 seconds

### 4. Access via Browser

Open your browser and navigate to:
```
http://localhost:3001/preview
```

## Auto-Tracking Features

### Automatic Workspace Switching
- **Seamless Experience**: When you change workspaces in VS Code, the preview automatically switches to the new workspace
- **No Manual Restart**: No need to manually stop and start previews when switching projects
- **Smart Management**: Automatically stops the previous workspace preview and starts the new one

### Toggle Auto-Tracking
Use the command palette (`Ctrl+Shift+P`) and run:
```
FailSafe: Toggle Preview Auto-Tracking
```

This allows you to:
- Enable/disable automatic workspace tracking
- Manually control when previews start and stop
- Maintain multiple workspace previews simultaneously

### Current Workspace Indicator
When viewing active instances, the current workspace is clearly marked:
- `[Current]` indicator shows which preview is for the active workspace
- Auto-tracking status is displayed in the instance list
- Easy identification of which preview corresponds to your current work

## Available Preview Tabs

### Dashboard Tab
- **URL**: `http://localhost:3001/preview?tab=dashboard`
- **Content**: Real-time dashboard with current task, progress, and recommendations
- **Features**: 
  - Live progress tracking
  - Task status updates
  - Recommendation engine output

### Console Tab
- **URL**: `http://localhost:3001/preview?tab=console`
- **Content**: Interactive command center with quick actions and system status
- **Features**:
  - Quick action buttons for common tasks
  - Command input and history
  - System status cards
  - Real-time command execution

### Sprint Tab
- **URL**: `http://localhost:3001/preview?tab=sprint`
- **Content**: Sprint planning and management interface
- **Features**:
  - Sprint controls and progress visualization
  - Task management with filtering
  - Velocity metrics and risk assessment
  - Interactive task actions

### Cursor Rules Tab
- **URL**: `http://localhost:3001/preview?tab=cursorrules`
- **Content**: Cursor rules management and monitoring
- **Features**:
  - Rule management with categories and search
  - Rule statistics and metrics
  - Interactive rule actions
  - Security and quality rule monitoring

### Logs Tab
- **URL**: `http://localhost:3001/preview?tab=logs`
- **Content**: Advanced log management interface
- **Features**:
  - Advanced filtering and searching
  - Log statistics and metrics
  - Export functionality
  - Action buttons for log management

## Development Workflow

### 1. Make UI Changes
Edit your UI components in the source code:
- `src/ui.ts` - Main UI components
- `src/plugins/fastify-preview.ts` - Preview generation logic
- `src/commands.ts` - Command handlers

### 2. Auto-Refresh
The preview automatically refreshes every 30 seconds, or you can:
- Click the "🔄 Refresh" button
- Use the browser refresh button
- The VS Code preview panel updates automatically

### 3. Hot-Reload
For even faster development:
- The preview server watches for file changes
- Some changes trigger immediate updates
- No need to restart the server for most changes

### 4. Workspace Switching
When working on multiple projects:
- Simply switch workspaces in VS Code
- Preview automatically updates to the new workspace
- No manual intervention required

## Advanced Features

### Multiple Workspace Support
- **Concurrent Previews**: Run multiple preview instances for different workspaces
- **Instance Management**: View and manage all active preview instances
- **Selective Control**: Stop specific instances or all instances at once

### Custom Preview Components

You can add custom preview components by extending the `generateDashboardHTML()` function in `src/plugins/fastify-preview.ts`:

```typescript
async function generateCustomComponentHTML(): Promise<string> {
    return `
        <div class="custom-component">
            <h2>Custom Component</h2>
            <p>Your custom content here</p>
        </div>
        <style>
            .custom-component { 
                background: #2d2d30; 
                padding: 20px; 
                border-radius: 8px; 
            }
        </style>
    `;
}
```

### Real-Time Data Integration

The preview system integrates with your extension's real data:
- Dashboard shows actual project progress
- Console displays real log output
- All data is live and current
- Workspace-specific data is automatically loaded

### Styling and Theming

The preview uses the same styling as your extension:
- Dark theme matching VS Code
- Consistent color scheme
- Responsive design
- Branding integration

## Troubleshooting

### Preview Server Won't Start
1. Ensure the extension is compiled: `npm run compile`
2. Check if port 3001 is available
3. Verify all dependencies are installed: `npm install`
4. Use "FailSafe: List Preview Instances" to check for conflicts

### Preview Not Updating
1. Check the auto-refresh is enabled (toggle in preview header)
2. Manually refresh the page
3. Restart the preview server
4. Verify workspace auto-tracking is enabled

### Missing Data
1. Ensure the extension is properly initialized
2. Check that required services (UI, ProjectPlan, TaskEngine) are available
3. Verify the Fastify server is running
4. Confirm you're previewing the correct workspace

### Workspace Switching Issues
1. Check auto-tracking is enabled: "FailSafe: Toggle Preview Auto-Tracking"
2. Verify workspace folders are properly configured
3. Check the output panel for workspace change logs
4. Manually restart preview if needed

## API Endpoints

The preview server provides several API endpoints:

- `GET /preview` - Main preview interface
- `GET /preview?tab=dashboard` - Dashboard tab
- `GET /preview?tab=console` - Console tab
- `GET /preview?tab=logs` - Logs tab
- `GET /preview?tab=sprint` - Sprint tab
- `GET /preview?tab=cursorrules` - Cursor Rules tab
- `GET /health` - Health check endpoint

## Benefits

1. **Rapid Development**: Test UI changes instantly without reloading
2. **Automatic Workspace Tracking**: Seamless switching between projects
3. **Real Data**: Preview with actual extension data
4. **Multiple Views**: Test different UI components simultaneously
5. **Hot-Reload**: Automatic updates as you develop
6. **Browser Access**: Test in different environments
7. **VS Code Integration**: Seamless development experience
8. **Multi-Workspace Support**: Manage multiple project previews

## Best Practices

1. **Use Auto-Tracking**: Enable auto-tracking for seamless workspace switching
2. **Keep Preview Open**: Leave the preview window open while developing
3. **Use Multiple Tabs**: Test different components simultaneously
4. **Monitor Console**: Watch for errors in the console tab
5. **Regular Refreshes**: Use the refresh button for immediate updates
6. **Browser Testing**: Test in different browsers for compatibility
7. **Instance Management**: Use "List Preview Instances" to manage multiple previews

## Commands Reference

### Core Commands
- `FailSafe: Start Preview (Auto-Tracking)` - Start preview with automatic workspace tracking
- `FailSafe: Start Preview for Workspace` - Manually select workspace for preview
- `FailSafe: Open Preview Window` - Open preview in VS Code panel
- `FailSafe: Toggle Preview Auto-Tracking` - Enable/disable automatic workspace tracking

### Management Commands
- `FailSafe: List Preview Instances` - View all active preview instances
- `FailSafe: Stop Preview Instance` - Stop a specific preview instance
- `FailSafe: Stop All Preview Instances` - Stop all active preview instances
- `FailSafe: Open Preview in Browser` - Open preview in default browser

## Future Enhancements

Planned improvements for the preview system:
- Component-specific preview URLs
- Interactive component testing
- Performance metrics display
- Custom preview themes
- Export functionality for screenshots
- Integration with design tools
- Enhanced workspace switching with preview state preservation
- Collaborative preview sharing

---

This preview system transforms your development workflow, making UI development faster and more efficient than ever before! The automatic workspace tracking feature ensures you always have the right preview for your current project. 