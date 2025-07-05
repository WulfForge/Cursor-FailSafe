# FailSafe UI Snapshot - January 15, 2024

## Current UI State from fastify-preview.ts

### Main Template Structure
- Header with FailSafe branding and icon
- Tab navigation: Dashboard, Console, Sprint, Cursor Rules, Logs
- Status bar with project info and controls
- JavaScript functions for navigation and interactions

### Tab Content

#### Dashboard Tab
- Workspace health score with circular progress indicator
- Metrics grid with 6 cards:
  - Chat Validation (91.0% rate)
  - User Drift (13.5% rate)
  - AI Drift (3.4% rate)
  - Ambiguous Requests (14.7% rate)
  - Hallucinations (2.1% rate)
  - Cursor Rules (38/45 active)

#### Console Tab
- Quick Actions Panel with 4 action buttons:
  - Validate Chat
  - Build & Test
  - Version Bump
  - Create Save Point
- Command Input section
- Command History
- System Status cards

#### Sprint Tab
- Sprint Controls with dropdown selector and action buttons
- Sprint Overview with progress bar
- Sprint Metrics (4 cards: Velocity, Burndown, Completion, Quality Score)
- Task Management with filters and task list
- Task items with status icons, descriptions, and action buttons

#### Cursor Rules Tab
- Rules Controls with search and filter
- Rules Statistics (4 cards: Active Rules, Triggered Today, Success Rate, Issues Blocked)
- Rules Categories with tabs (Security, Quality, Performance, Workflow)
- Rule items with status badges and action buttons

#### Logs Tab
- Log Controls with filters and search
- Log Statistics (4 cards: Total Logs, Errors, Warnings, Info)
- Logs Container with log entries
- Log entries with timestamps, levels, messages, and details

### CSS Styling
- Dark theme (#1e1e1e background)
- VS Code-like color scheme
- Consistent card layouts and spacing
- Hover effects and transitions
- Responsive grid layouts

### JavaScript Functions
- `switchTab()` - Navigation between tabs
- `refreshPreview()` - Refresh with cache busting
- `showInstanceStatus()` - Show server status
- `failSafeAlert()` - Custom alert function
- Tab-specific functions for each module

## Notes
- All UI code is currently embedded in fastify-preview.ts
- Should be moved to separate component files
- fastify-preview.ts should serve static content from actual application files
- Navigation and core functionality should be preserved when restructuring 