<p align="center">
  <img src="images/icon.png" width="128" alt="FailSafe Logo"/>
</p>

# FailSafe: AI Development Extension

**Version 1.4.1** - Time-aware, validation-driven AI development assistant, by MythologIQ. **Beta**

[![License: MIT](https://img.shields.io/badge/License-Mit-green.svg)](LICENSE)

## 🎯 What is FailSafe?

FailSafe is a comprehensive development assistant that enhances AI-powered coding in Cursor by providing:

- **⏰ Timeout Detection**: Prevents AI stalls and infinite loops
- **🔍 Output Validation**: Validates AI-generated code for safety and quality
- **📋 Project Planning**: Tracks development progress with linear task progression
- **🧪 Test Integration**: Automatically runs tests to verify code changes
- **🛡️ Extension Detection**: Prevents hallucination of unavailable extensions
- **📊 Real-time Visibility**: Provides project status and accountability tracking

## 🚀 Features

### Core Functionality
- **Proactive Status Bar**: Real-time workspace status with color-coded indicators
- **Unified Dashboard**: Single webview with organized tabs for all functionality
  - **Dashboard Tab**: Main overview with status cards, current task, progress tracking
  - **Project Plan Tab**: Full project plan management with workspace association
  - **Testing Tab**: Development and testing commands with purple theme
  - **Configuration Tab**: Failsafe configuration and project management tools
  - **Status Tab**: Detailed status information and deviation tracking
- **Simplified Sidebar**: Essential status information at a glance
  - FailSafe Status with color-coded indicators
  - Project State showing current task
  - Plan Status with validation state
  - Quick access to Dashboard
- **Project Plan Validation**: Rule-based and LLM-based plan validation
- **Linear Progression Tracking**: Ensures tasks are completed in order
- **Action Logging**: Comprehensive logging of all development activities
- **Failsafe Configuration**: Built-in and user-defined failsafes
- **Testing Integration**: Built-in testing commands and simulation tools
- **Problem Reporting**: Direct GitHub issue integration for bug reports and feature requests
- **Custom Failsafe Suggestions**: Intelligent suggestion system for user-defined failsafes
- **Suggest Failsafe to Core**: Users can now propose their custom failsafes for inclusion in the core extension. This feature allows you to select one of your user-defined failsafes, fill out a rationale and details, and submit a pre-filled GitHub issue to the FailSafe repository for review by the maintainers.

### Dashboard Features
- **Status Cards**: Visual overview of system status, project state, plan status, and progress
- **Current Task Display**: Real-time task information with status indicators
- **Progress Tracking**: Visual progress bars and completion statistics
- **Smart Recommendations**: Context-aware recommendations based on project state
- **Quick Actions**: One-click access to common development tasks
- **Report a Problem**: Integrated form for submitting issues directly to GitHub
- **Failsafe Suggestions**: Context-aware suggestions for custom failsafes with relevance scoring

### Project Plan Management
- **Workspace Association**: Project plans are automatically associated with the current workspace
- **Full Plan View**: Complete project plan display with task details and status
- **Plan Validation**: Real-time validation with rule-based and AI-powered checks
- **Plan Statistics**: Comprehensive statistics including task counts and progress
- **Edit Integration**: Direct editing of project plans through the extension

### Development Tools
- **Simulation Commands**: Test FailSafe events and functionality
- **Plan Validation**: AI-powered project plan validation
- **Code Validation**: Automated code quality checks
- **Refactoring Tools**: AI-assisted code refactoring
- **Session Logging**: Comprehensive development session tracking
- **Hangup Detection**: Intelligent detection of productivity blocks with proactive intervention
- **Custom Failsafe Intelligence**: Smart suggestions based on current context and usage patterns

## ✨ Key Features

### 🛡️ **Validation & Enforcement**
- **LLM-Guided Validation**: Uses the same AI to validate its own output
- **Environment Detection**: Prevents emulation/mock environment usage
- **Extension Validation**: Ensures only available extensions are referenced
- **Security Scanning**: Detects potential security vulnerabilities
- **Quality Assurance**: Enforces coding standards and best practices

### ⏰ **Timeout Management**
- **Dynamic Timeouts**: Adjusts based on request complexity
- **Stall Detection**: Identifies when AI requests hang
- **Auto-Recovery**: Automatically retries failed requests
- **Progress Tracking**: Monitors long-running operations

### 📋 **Project Management**
- **Linear Progression**: Enforces structured task completion
- **Blocker Identification**: Detects and resolves development blockers
- **Feasibility Analysis**: Validates task requirements before execution
- **Accountability Tracking**: Maintains development history and decisions

### 🧪 **Testing Integration**
- **Auto-Test Execution**: Runs tests after code changes
- **Coverage Analysis**: Tracks test coverage improvements
- **Failure Detection**: Identifies and reports test failures
- **Framework Support**: Works with Jest, Mocha, and other test runners

### 📊 **Enhanced Dashboard & Status System**
- **Modern Webview Dashboard**: Beautiful, responsive dashboard with CSS styling
- **Real-time Project Status**: Live view with color-coded status indicators
- **Dynamic Recommendations**: Smart recommendations based on actual project state
- **Testing & Development Section**: Dedicated section for testing and development tools
- **MythologIQ Branding**: Professional branding with logos and styling
- **Functional Quick Actions**: All dashboard buttons execute actual VS Code commands
- **Total Task Tracking**: Comprehensive task counting and progress monitoring
- **Plan Status Integration**: Plan validation status integrated into dashboard flow

## 🚀 Installation

### From Cursor Extensions Marketplace
1. Open Cursor
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "FailSafe"
4. Click Install

### From Source
```bash
git clone https://github.com/WulfForge/Cursor-FailSafe.git
cd Cursor-FailSafe
npm install
npm run compile
```

## 📖 Usage

### Basic Setup
1. **Activate FailSafe**: The extension activates automatically when you open a project
2. **Configure Settings**: Adjust validation strictness and timeout settings
3. **Start Developing**: Use Cursor's AI features normally - FailSafe works in the background

### Commands
- `failsafe.askAI` - Ask AI with FailSafe validation
- `failsafe.refactor` - Refactor code with safety checks
- `failsafe.validate` - Validate current file
- `failsafe.showPlan` - Show project dashboard
- `failsafe.retryLastTask` - Retry the last failed task
- `failsafe.viewSessionLog` - View development session logs
- `failsafe.markTaskComplete` - Mark current task as completed
- `failsafe.showDashboard` - Show comprehensive project dashboard
- `failsafe.validatePlanWithAI` - Validate project plan with AI
- `failsafe.showFailsafeConfig` - Configure failsafe settings
- `failsafe.showProgress` - Detailed progress view
- `failsafe.showAccountability` - Accountability details
- `failsafe.showFeasibility` - Feasibility analysis
- `failsafe.simulateEvent` - Simulate FailSafe events for testing
- `failsafe.forceLinearProgression` - Force advance to next task
- `failsafe.autoAdvance` - Auto-advance if ready
- `failsafe.showActionLog` - Show action log
- `failsafe.suggestToCore` - Suggest a custom failsafe for inclusion in the core extension (opens a form and submits to GitHub)

### Configuration
```json
{
  "failsafe.validationEnabled": true,
  "failsafe.timeoutEnabled": true,
  "failsafe.testRunner": "npm test",
  "failsafe.validation.strictMode": false,
  "failsafe.validation.focusAreas": ["security", "performance"],
  "failsafe.timeout.baseTimeout": 30000,
  "failsafe.timeout.complexityMultiplier": 2.0
}
```

## 🔧 How It Works

### 1. **Request Interception**
FailSafe intercepts AI requests and applies validation before execution:
```typescript
// Intercepts commands like:
// - cursor.chat
// - cursor.generate
// - cursor.edit
// - cursor.explain
```

### 2. **Environment Validation**
Validates the development environment to prevent emulation issues:
```typescript
// Detects:
// - Test vs production environments
// - Mocked VS Code APIs
// - Available extensions and commands
// - Real vs simulated contexts
```

### 3. **Output Validation**
Uses LLM-guided validation to ensure code quality:
```typescript
// Validates:
// - Code safety and security
// - Performance implications
// - Maintainability and readability
// - Extension compatibility
```

### 4. **Project Tracking**
Maintains linear development progression:
```typescript
// Tracks:
// - Current task status
// - Blockers and dependencies
// - Feasibility analysis
// - Accountability metrics
```

## 🛠️ Architecture

```
FailSafe Extension
├── TimeoutWatchdog ⏰
│   ├── Dynamic timeout calculation
│   ├── Stall detection
│   └── Auto-recovery
├── Validator 🔍
│   ├── LLM-guided validation
│   ├── Environment detection
│   ├── Extension validation
│   └── Security scanning
├── ProjectPlan 📋
│   ├── Linear progression
│   ├── Blocker identification
│   ├── Feasibility analysis
│   └── Accountability tracking
├── TaskEngine ⚙️
│   ├── Task execution
│   ├── Workflow automation
│   ├── Auto-advance
│   └── Recommendations
├── TestRunner 🧪
│   ├── Auto-test execution
│   ├── Coverage analysis
│   ├── Framework detection
│   └── Failure reporting
└── UI 📊
    ├── Real-time dashboard
    ├── Status indicators
    ├── Progress tracking
    └── Command integration
```

## 🎯 Use Cases

### **Preventing AI Hallucination**
```typescript
// FailSafe detects when AI tries to use unavailable extensions
const request = "use github.copilot to generate code";
// ❌ BLOCKED: "Extension 'github.copilot' is not available"
// ✅ SUGGESTION: "Use available AI features in Cursor"
```

### **Environment Validation**
```typescript
// FailSafe prevents emulation/mock usage
const request = "mock VS Code API for testing";
// ❌ BLOCKED: "Request involves emulated/mock environment"
// ✅ SUGGESTION: "Use real VS Code extension environment"
```

### **Code Quality Enforcement**
```typescript
// FailSafe validates generated code
const code = "eval(userInput); // Security risk";
// ❌ BLOCKED: "Security vulnerability detected"
// ✅ SUGGESTION: "Use safe input validation instead"
```

## 🔍 Validation Examples

### **Extension Detection**
```typescript
// Validates TypeScript extension usage
const request = "use typescript.restartTsServer";
// ✅ ALLOWED: Extension and command are available

const request = "use github.copilot";
// ❌ BLOCKED: Extension not installed
// 💡 SUGGESTION: Install GitHub Copilot extension
```

### **Environment Safety**
```typescript
// Prevents test environment confusion
const request = "run in production environment";
// ✅ ALLOWED: Real environment detected

const request = "mock API responses";
// ❌ BLOCKED: Mock data patterns detected
// 💡 SUGGESTION: Use real APIs and data
```

## 📊 Performance Metrics

FailSafe provides real-time metrics on:
- **Validation Success Rate**: Percentage of passed validations
- **Timeout Frequency**: How often requests timeout
- **Test Pass Rate**: Success rate of automated tests
- **Task Completion Rate**: Linear progression efficiency
- **Extension Usage**: Available vs requested extensions

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
git clone https://github.com/WulfForge/Cursor-FailSafe.git
cd Cursor-FailSafe
npm install
npm run compile
npm test
```

### Running Tests
```bash
npm test                    # Run all tests
npm run test:validator      # Test validation logic
npm run test:timeout        # Test timeout detection
npm run test:extensions     # Test extension detection
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Cursor Team**: For the excellent AI-powered development environment
- **VS Code Community**: For the robust extension API
- **Open Source Contributors**: For the tools and libraries that make this possible

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/WulfForge/Cursor-FailSafe/issues)
- **Discussions**: [GitHub Discussions](https://github.com/WulfForge/Cursor-FailSafe/discussions)
- **Documentation**: [Wiki](https://github.com/WulfForge/Cursor-FailSafe/wiki)

## 🧪 Demo & Testing: Simulate FailSafe Events

FailSafe includes a built-in simulation command for easy testing and demonstration of its logging and sidebar features.

### How to Use
1. Open the Command Palette (`Ctrl+Shift+P`).
2. Type `FailSafe: Simulate Event` and select it.
3. Choose an event to simulate (Validation Passed, Validation Failed, Block, Enforcement, Timeout).
4. The event will be logged and appear in the FailSafe sidebar under "Recent Actions".
5. The status bar will update to reflect the simulated state.

This feature is ideal for demos, testing, and verifying that FailSafe's passive monitoring and UI are working as expected.

---

**Made with ❤️ for the Cursor community**

*FailSafe: Making AI-assisted development more reliable, one validation at a time.*

> All UI elements in FailSafe are built using standard VS Code extension APIs. There are no Cursor-specific UI elements; everything works in both VS Code and Cursor. 