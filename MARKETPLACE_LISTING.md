# VS Code Marketplace Listing

## Extension Name
FailSafe - Chat Content Validator

## Publisher
WulfForge

## Description
Validate AI chat responses for hallucinations and false claims. Provides post-processing validation of code blocks, file references, and implementation claims in chat content.

## Short Description
🔍 Validate AI chat responses for hallucinations and false claims with post-processing validation.

## Long Description
# 🔍 FailSafe - Chat Content Validator

A VS Code/Cursor extension that validates AI chat responses for hallucinations and false claims. Provides post-processing validation of code blocks, file references, and implementation claims in chat content.

## ⚠️ What This Extension Does

FailSafe validates **existing chat content** after AI responses are generated. It does **NOT** intercept AI requests or validate responses in real-time (this is not possible in VS Code extensions).

## ✨ Features

### 🔍 Chat Content Validation
- **Validate AI chat responses** for hallucinations and false claims
- **Detect code blocks** with syntax errors, placeholder content, and security issues
- **Verify file references** mentioned in chat content actually exist
- **Check command claims** and implementation assertions
- **Identify hallucination patterns** in AI responses

### 📊 Basic Project Management
- **Simple dashboard** with project status and progress tracking
- **Basic task management** with linear progression
- **Progress monitoring** with task completion tracking
- **Status bar integration** with real-time project status

### 🛡️ Development Safeguards
- **Code validation** for security, quality, and performance issues
- **Version management** with consistency checking
- **Session logging** for development accountability
- **Problem reporting** with GitHub integration

## 🚀 Quick Start

1. **Install the extension** from the VS Code marketplace
2. **Open a chat file** or **select chat content** in any editor
3. **Run `Validate Chat Content`** from the command palette
4. **Review validation results** in the webview panel

## 📋 Commands

### Core Commands
- `Validate Chat Content` - Validate AI chat responses for hallucinations
- `FailSafe: Validate Code` - Validate current file or selection
- `FailSafe: Show Dashboard` - Open project dashboard

### Utility Commands
- `FailSafe: Report a Problem` - Report issues to GitHub
- `FailSafe: Suggest Failsafe` - Suggest custom failsafes
- `FailSafe: Check Version Consistency` - Check version across files

## 🔍 Chat Content Validation

### What It Validates:
- **Code Blocks**: Syntax errors, placeholder content, security issues
- **File References**: Verifies mentioned files actually exist in workspace
- **Command Claims**: Checks if claimed commands are available
- **Implementation Claims**: Validates claims about code implementations
- **Testing Claims**: Verifies test execution and result claims
- **Hallucination Patterns**: Detects common AI hallucination language

### How to Use:
1. Open a chat file or select chat content in any editor
2. Run `Validate Chat Content` from the command palette
3. Review the validation results in the webview panel

### Example Validation Results:
```
🚨 Errors (2)
- File referenced but doesn't exist: src/nonexistent.ts
- Potential hallucination detected: "I have implemented the feature"

⚠️ Warnings (1)  
- Command execution claimed but no evidence provided: npm install

💡 Suggestions (1)
- Verify that src/nonexistent.ts exists in the workspace
```

## ⚙️ Configuration

Configure FailSafe in your workspace settings:

```json
{
    "failsafe.enabled": true,
    "failsafe.validation.strictMode": false,
    "failsafe.validation.focusAreas": ["security", "quality", "performance"]
}
```

## ⚠️ Important Notes

### What This Extension CANNOT Do:
- ❌ **Intercept AI requests** in real-time
- ❌ **Validate AI responses** as they're generated
- ❌ **Block unsafe AI responses** automatically
- ❌ **Monitor AI model outputs** directly
- ❌ **Provide real-time AI safety** enforcement

### What This Extension CAN Do:
- ✅ **Validate existing chat content** for hallucinations
- ✅ **Check file references** mentioned in chat
- ✅ **Detect code quality issues** in chat responses
- ✅ **Identify false claims** about implementations
- ✅ **Provide post-processing validation** with detailed reports

## 🎯 Use Cases

- **Code Review**: Validate AI-generated code in chat responses
- **Documentation Review**: Check file references and implementation claims
- **Quality Assurance**: Ensure AI responses don't contain false information
- **Learning Aid**: Understand common AI hallucination patterns
- **Project Management**: Basic task tracking and accountability

## 🔗 Links

- **Repository**: [GitHub](https://github.com/WulfForge/Cursor-FailSafe)
- **Issues**: [GitHub Issues](https://github.com/WulfForge/Cursor-FailSafe/issues)
- **Documentation**: [README](https://github.com/WulfForge/Cursor-FailSafe#readme)

---

**Made with ❤️ for the Cursor community**

*This extension focuses on what's actually possible within VS Code extension limitations.*

## Keywords
ai, validation, chat, hallucination, code-quality, cursor, failsafe, content-validation, safety, quality, post-processing

## Categories
Other, Programming Languages, Snippets

## Tags
ai, validation, chat, hallucination, code-quality, cursor, failsafe, content-validation, safety, quality, post-processing

## Icon
Use the existing icon.svg file

## Gallery Images
- Screenshot of chat validation results
- Screenshot of dashboard interface
- Screenshot of validation workflow

## Badges
- Version: 1.5.1
- License: MIT
- Build Status: Passing
- Downloads: [Shield.io badge]

## Repository
https://github.com/WulfForge/Cursor-FailSafe

## Homepage
https://github.com/WulfForge/Cursor-FailSafe#readme

## Bugs
https://github.com/WulfForge/Cursor-FailSafe/issues

## License
MIT 