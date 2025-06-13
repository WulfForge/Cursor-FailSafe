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