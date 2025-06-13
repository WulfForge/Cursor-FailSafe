<p align="center">
  <img src="images/icon.png" width="128" alt="FailSafe Logo"/>
</p>

# FailSafe: AI Development Extension for Cursor

**by [MythologIQ](https://www.MythologIQ.studio)**

> Time-aware, validation-driven AI development assistant for Cursor.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Website](https://img.shields.io/badge/MythologIQ-Website-blue)](https://www.MythologIQ.studio)

## 🎯 What is FailSafe?

FailSafe is a comprehensive development assistant that enhances AI-powered coding in Cursor by providing:

- **⏰ Timeout Detection**: Prevents AI stalls and infinite loops
- **🔍 Output Validation**: Validates AI-generated code for safety and quality
- **📋 Project Planning**: Tracks development progress with linear task progression
- **🧪 Test Integration**: Automatically runs tests to verify code changes
- **🛡️ Extension Detection**: Prevents hallucination of unavailable extensions
- **📊 Real-time Visibility**: Provides project status and accountability tracking

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

### 📊 **Real-time Dashboard**
- **Project Status**: Live view of development progress
- **Task Overview**: Current task and next steps
- **Validation Results**: Recent validation outcomes
- **Performance Metrics**: Success rates and timing data

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