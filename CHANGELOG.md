# Changelog

All notable changes to FailSafe will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Extension detection and validation
- Enhanced environment validation
- Comprehensive test suite
- Real-time project dashboard
- Linear task progression enforcement

### Changed
- Improved validation accuracy
- Enhanced timeout detection
- Better error handling and reporting

### Fixed
- Compilation errors and type issues
- Test environment detection
- Extension integration bugs

## [1.4.1] - 2025-06-13

### Added
- **Custom Failsafe Suggestions**: Intelligent suggestion system for user-defined custom failsafes
  - Context-aware analysis based on file type, current task, selected text, and workspace
  - Relevance scoring algorithm that considers multiple factors
  - Smart prioritization of less recently used failsafes
  - Integration with Configuration tab in dashboard
  - Detailed failsafe information display with usage statistics
- **Failsafe Usage Tracking**: Automatic tracking of failsafe usage patterns
  - Usage count and last used timestamps
  - Preference for suggesting unused or rarely used failsafes
  - Action logging for applied suggestions
- **Suggest Failsafe to Core**: Users can now propose their custom failsafes for inclusion in the core extension
  - Accessible via the Configuration tab or the command palette
  - Opens a form to provide rationale, use cases, and implementation notes
  - Submits a pre-filled GitHub issue to the FailSafe repository for review

### Changed
- **Version Update**: Updated to version 1.4.1 to reflect new custom failsafe features
- **Configuration Tab**: Added "Suggest Custom Failsafe" button for easy access

### Technical
- **Relevance Algorithm**: Multi-factor scoring system for failsafe suggestions
- **Context Analysis**: Real-time analysis of current development context
- **UI Integration**: Seamless integration with existing dashboard and command system
- **Data Access**: Added public getter for user failsafes to support external access

## [1.4.0] - 2025-06-13

### Added
- **Unified Webview with Tabs**: Consolidated all functionality into a single webview with organized tabs
  - Dashboard tab: Main overview with status cards, current task, progress, and recommendations
  - **Project Plan tab: Full project plan management with workspace association**
  - Testing tab: Development and testing commands with purple theme
  - Configuration tab: Failsafe configuration and project management tools
  - Status tab: Detailed status information and deviation tracking
- **Simplified Sidebar**: Streamlined sidebar to show only essential information
  - FailSafe Status with color-coded indicators
  - Project State showing current task
  - Plan Status with validation state
  - Launch Dashboard link for quick access
- **Enhanced Status Cards**: Visual status overview with icons and descriptions
- **Improved Tab Navigation**: Clean tab interface with smooth transitions
- **Project Plan Management**: Complete project plan system with workspace association
  - Full plan view with task details and status
  - Plan validation with rule-based and AI-powered checks
  - Plan statistics and progress tracking
  - Direct editing integration

### Changed
- **App Name**: Updated to "FailSafe: AI Development Extension"
- **Description**: Updated to "Time-aware, validation-driven AI development assistant, by MythologIQ. **Beta**"
- **Dashboard Redesign**: Complete overhaul of dashboard layout and functionality
- **Sidebar Simplification**: Removed redundant sections, focused on core status information
- **Version Update**: Updated to version 1.4.0 to reflect major UI redesign

### Technical
- **Webview Architecture**: Unified webview approach for better user experience
- **CSS Improvements**: Enhanced styling with better visual hierarchy
- **JavaScript Enhancements**: Improved tab switching and command execution
- **Workspace Integration**: Project plans now associated with current workspace
- **Command Integration**: Added create and edit project plan commands
- **Date Validation**: Added comprehensive date format validation to catch errors like incorrect dates in documentation
- **Hangup Detection**: Added intelligent hangup detection for documentation and general tasks with proactive intervention
- **Problem Reporting**: Added integrated GitHub issue reporting with pre-filled system information and structured forms
- **Threshold Optimization**: Reduced hangup detection thresholds to 5 minutes for documentation tasks and 2-minute check intervals

## [1.3.8] - 2025-01-13

### Added
- **Modern Webview Dashboard**: Complete redesign with CSS styling and responsive layout
- **Testing & Development Section**: Dedicated section with testing-specific actions
- **Dynamic Recommendations**: Smart recommendations based on actual project state
- **MythologIQ Branding**: Professional logos and branding in dashboard header
- **Functional Quick Actions**: All dashboard buttons now execute actual VS Code commands
- **Total Task Tracking**: Comprehensive task counting in progress overview
- **Command Registration Fix**: All missing commands now properly registered in package.json
- **Webview Message Handling**: Proper command execution from dashboard to VS Code

### Changed
- **Dashboard Layout**: Plan Status moved below Current Task as requested
- **Visual Design**: Professional CSS styling with gradients, shadows, and modern design
- **Recommendation Logic**: Replaced static recommendations with dynamic state-based suggestions
- **Header Design**: Added FailSafe icon and MythologIQ logo with proper styling
- **Testing Section**: Purple-themed section with distinct styling for development tools

### Fixed
- **Command Availability**: Fixed missing command registrations in package.json
- **Progress Calculation**: Improved progress display with realistic values
- **Current Task Display**: Updated to reflect actual development state (v1.3.8)
- **Recommendation Accuracy**: Recommendations now reflect actual project state instead of outdated suggestions

### Technical Improvements
- Webview-based dashboard with proper message passing
- Dynamic recommendation generation based on project state
- Enhanced CSS styling with responsive design
- Proper icon integration from images directory
- Improved error handling for command execution

## [1.3.7] - 2025-01-13

### Added
- **Command Registration**: Added all missing commands to package.json
- **Simulate Event Command**: Added failsafe.simulateEvent command for testing
- **Complete Command Set**: All UI commands now properly registered and available

### Fixed
- **Missing Commands**: Fixed issue where commands were registered in code but not in package.json
- **Command Palette**: All FailSafe commands now appear in Command Palette

## [1.3.6] - 2025-01-13

### Added
- **Icon Integrity Check**: Prepackage script to verify icon.png integrity
- **Corruption Prevention**: Blocks packaging if icon is corrupted or empty

### Fixed
- **Icon Corruption**: Prevents recurring icon corruption issues during build process

## [1.3.5] - 2025-01-13

### Added
- **Enhanced Status Icons**: Added proper color-coded status indicators throughout the UI
- **Improved Plan Status Logic**: Fixed flawed "Plan In Progress" logic with better state handling
- **Smart Status System**: Replaced "On Track" with meaningful status values (BLOCKED, ATTENTION NEEDED, ACTIVE, READY)
- **Organized Sidebar**: Reorganized sidebar with Project Setup section and logical grouping
- **Enhanced Visual Design**: Improved dashboard formatting and user experience
- **Comprehensive Status Tracking**: System-wide status monitoring and reporting

### Changed
- **Dashboard Appearance**: Significantly improved visual layout with better formatting and icons
- **Status Bar Logic**: Updated to use new system status logic with better tooltips
- **Plan Validation Display**: Enhanced plan status with better color coding and AI validation tracking
- **Sidebar Organization**: Plan status now appears under Project Setup section for better organization
- **Status Determination**: Improved logic for determining system status based on project state

### Fixed
- **Plan Status Logic**: Fixed flawed "Plan In Progress" determination
- **Status Display**: Removed problematic "On Track" status in favor of more meaningful indicators
- **Visual Consistency**: Improved consistency of status icons and indicators throughout the UI
- **User Experience**: Enhanced overall user experience with clearer status communication

### Technical Improvements
- Better status determination logic
- Improved visual hierarchy
- Enhanced error handling and status reporting
- More robust plan validation display
- Better integration between status systems

## [0.1.0] - 2025-01-13

### Added
- **Core Extension Framework**
  - Main extension entry point with activation/deactivation
  - Command registration and handling
  - Configuration management
  - Logging system

- **Timeout Watchdog**
  - Dynamic timeout calculation based on request complexity
  - Stall detection and auto-recovery
  - Progress tracking for long-running operations
  - Configurable timeout settings

- **Output Validator**
  - LLM-guided validation using the same AI for self-validation
  - Environment detection to prevent emulation/mock usage
  - Extension validation to prevent hallucination of unavailable extensions
  - Security scanning for potential vulnerabilities
  - Quality assurance and coding standards enforcement

- **Project Plan Tracker**
  - Linear task progression with enforced completion order
  - Blocker identification and resolution
  - Feasibility analysis for task requirements
  - Accountability tracking and development history
  - Real-time project status visibility

- **Task Engine**
  - Task execution with workflow automation
  - Auto-advance functionality for completed tasks
  - Workflow recommendations based on project state
  - Integration with project plan and validation systems

- **Test Runner Integration**
  - Automatic test execution after code changes
  - Support for Jest, Mocha, and other test frameworks
  - Test result parsing and failure detection
  - Coverage analysis and reporting

- **UI Components**
  - Real-time project dashboard
  - Status bar indicators for project state
  - Progress tracking and visualization
  - Command palette integration
  - Session log viewing

- **Extension Detection**
  - Installed extension discovery and validation
  - Command availability checking
  - Extension usage validation
  - Prevention of hallucinated extension references

### Features
- **AI Request Interception**: Automatically intercepts and validates AI requests
- **Environment Safety**: Prevents usage of emulated or mock environments
- **Extension Validation**: Ensures only available extensions are referenced
- **Project Management**: Maintains structured development progression
- **Real-time Monitoring**: Provides live project status and metrics
- **Comprehensive Logging**: Tracks all activities for debugging and analysis

### Configuration
- Validation strictness settings
- Timeout configuration options
- Test runner customization
- Focus areas for validation
- Logging level control

### Commands
- `failsafe.askAI` - Ask AI with FailSafe validation
- `failsafe.refactor` - Refactor code with safety checks
- `failsafe.validate` - Validate current file
- `failsafe.showPlan` - Show project dashboard
- `failsafe.retryLastTask` - Retry the last failed task
- `failsafe.viewSessionLog` - View development session logs
- `failsafe.markTaskComplete` - Mark current task as completed

### Technical Details
- **Language**: TypeScript
- **Framework**: VS Code Extension API
- **Testing**: Mocha with comprehensive test suite
- **Build**: TypeScript compilation with watch mode
- **Packaging**: VSCE for marketplace distribution

---

## Version History

### 0.1.0 (Initial Release)
- Complete extension framework
- All core features implemented
- Comprehensive test coverage
- Ready for marketplace submission

---

**For detailed information about each release, see the [GitHub releases page](https://github.com/WulfForge/Cursor-FailSafe/releases).** 