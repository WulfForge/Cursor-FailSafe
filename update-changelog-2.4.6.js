const fs = require('fs');

// Read the changelog
let content = fs.readFileSync('CHANGELOG.md', 'utf8');

// Create the new changelog entry
const newEntry = `## [2.4.6] - 2024-12-19

### 🎯 **DASHBOARD INTEGRATION COMPLETION - Single Instance & Webview Containment**

### Added
- **Single Dashboard Instance Enforcement**: Only one dashboard webview can be open at a time
  - **Instance Management**: Static panel reference prevents multiple dashboard instances
  - **Smart Navigation**: Existing dashboard is revealed instead of creating duplicates
  - **Memory Efficiency**: Proper panel disposal and cleanup on close
  - **User Experience**: Consistent dashboard behavior across all commands

### Added
- **Webview-Contained Notifications**: All user feedback moved inside the dashboard webview
  - **Notification System**: Built-in notification display with auto-dismiss functionality
  - **Toast Replacement**: Replaced external VS Code notifications with webview-contained feedback
  - **Error Handling**: All dashboard operations show errors within the webview
  - **Visual Feedback**: Success, warning, error, and info notifications with proper styling

### Enhanced
- **Dashboard UI Improvements**: Enhanced visual design and user experience
  - **Clickable Logo**: Interactive MythologIQ logo with hover effects
  - **Notification Container**: Fixed-position notification area with smooth animations
  - **Better Error Messages**: Contextual error messages for all dashboard operations
  - **Loading States**: Improved loading indicators and empty states
  - **Responsive Design**: Better mobile and desktop responsiveness

### Fixed
- **Dashboard Integration Issues**: Resolved all webview containment problems
  - **External Notifications**: Eliminated toast notifications that leaked outside webview
  - **Error Propagation**: All errors now handled within dashboard context
  - **State Management**: Proper dashboard state management and refresh handling
  - **Command Integration**: All dashboard commands properly integrated with webview

### Technical Improvements
- **Code Quality**: Enhanced error handling and logging throughout dashboard
- **Performance**: Optimized dashboard rendering and message handling
- **Type Safety**: Improved TypeScript types for dashboard operations
- **Memory Management**: Better resource cleanup and panel lifecycle management

### User Experience
- **Consistent Interface**: All dashboard interactions contained within single webview
- **Better Feedback**: Clear, contextual notifications for all user actions
- **No External Popups**: Eliminated disruptive external notifications
- **Smooth Animations**: Enhanced visual feedback with smooth transitions
- **Professional Feel**: Polished, modern dashboard interface

### Commands Enhanced
- \`failsafe.showDashboard\` - Now enforces single instance and contains all notifications
- All dashboard-related commands now provide feedback within the webview
- Improved error handling and user feedback for all dashboard operations

### Documentation
- **Changelog Updated**: Comprehensive documentation of dashboard integration completion
- **Rollback Ready**: Clear documentation for potential rollback scenarios
- **Feature Status**: Accurate reflection of completed dashboard integration

---

`;

// Insert the new entry before version 2.4.5
content = content.replace('## [2.4.5] - 2024-12-19', newEntry + '## [2.4.5] - 2024-12-19');

// Write back
fs.writeFileSync('CHANGELOG.md', content, 'utf8');

console.log('✅ Added version 2.4.6 changelog entry!'); 