# 🔍 FailSafe - Chat Content Validator

A VS Code/Cursor extension that validates AI chat responses for hallucinations and false claims. Provides post-processing validation of code blocks, file references, and implementation claims in chat content.

## ⚠️ **What This Extension Does**

FailSafe validates **existing chat content** after AI responses are generated. It does **NOT** intercept, block, or modify AI responses in real-time, nor does it enforce or guarantee safety, quality, or performance. These are not possible in VS Code/Cursor extensions.

## ✨ **Features**

### 🔍 **Chat Content Validation**
- **Validate AI chat responses** for hallucinations and false claims
- **Detect code blocks** with syntax errors, placeholder content, and security issues
- **Verify file references** mentioned in chat content actually exist
- **Heuristically check command and implementation claims** (cannot guarantee execution or correctness)
- **Identify common hallucination patterns** in AI responses

### 📊 **Basic Project Management**
- **Simple dashboard** with project status and progress tracking
- **Basic task management** with linear progression
- **Progress monitoring** with task completion tracking
- **Status bar integration** with real-time project status

### 🛡️ **Development Safeguards**
- **Code validation** for security, quality, and performance issues (static analysis only)
- **Version management** with consistency checking
- **Session logging** for development accountability (not immutable)
- **Problem reporting** with GitHub integration

## �� **Quick Start**

1. **Install the extension** from the VS Code marketplace
2. **Open a chat file** or **select chat content** in any editor
3. **Run `Validate Chat Content`** from the command palette
4. **Review validation results** in the webview panel

## 📋 **Commands**

### Core Commands
- `Validate Chat Content` - Validate AI chat responses for hallucinations
- `FailSafe: Validate Code` - Validate current file or selection
- `FailSafe: Show Dashboard` - Open project dashboard

### Utility Commands
- `FailSafe: Report a Problem` - Report issues to GitHub
- `FailSafe: Suggest Failsafe` - Suggest custom failsafes
- `FailSafe: Check Version Consistency` - Check version across files

## 🔍 **Chat Content Validation**

### **What It Validates:**
- **Code Blocks**: Syntax errors, placeholder content, security issues
- **File References**: Verifies mentioned files actually exist in workspace
- **Command Claims**: Checks if claimed commands are available
- **Implementation Claims**: Validates claims about code implementations
- **Testing Claims**: Verifies test execution and result claims
- **Hallucination Patterns**: Detects common AI hallucination language

### **How to Use:**
1. Open a chat file or select chat content in any editor
2. Run `Validate Chat Content` from the command palette
3. Review the validation results in the webview panel

### **Example Validation Results:**
```
🚨 Errors (2)
- File referenced but doesn't exist: src/nonexistent.ts
- Potential hallucination detected: "I have implemented the feature"

⚠️ Warnings (1)  
- Command execution claimed but no evidence provided: npm install

💡 Suggestions (1)
- Verify that src/nonexistent.ts exists in the workspace
```

## ⚙️ **Configuration**

Configure FailSafe in your workspace settings:

```json
{
    "failsafe.enabled": true,
    "failsafe.validation.strictMode": false,
    "failsafe.validation.focusAreas": ["security", "quality", "performance"]
}
```

## 🏗️ **Project Management**

FailSafe provides basic project management capabilities:

### **Dashboard Features**
- **Project status** with visual progress indicators
- **Task tracking** with completion monitoring
- **Status bar integration** with real-time updates
- **Basic accountability** with time tracking

### **Limitations**
- **Basic task management** only (no complex dependencies)
- **Simple project planning** (no PMP-compliant features)
- **Post-processing validation** only (no real-time interception)

## 🔧 **Development**

### **Building**
```bash
npm install
npm run compile
```

### **Testing**
```bash
npm run test
```

### **Publishing**
```bash
npm run package
npm run publish
```

## 📝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 **Support**

- **Issues**: [GitHub Issues](https://github.com/WulfForge/Cursor-FailSafe/issues)
- **Discussions**: [GitHub Discussions](https://github.com/WulfForge/Cursor-FailSafe/discussions)

## 🔗 **Related Projects**

- **Professional Project Manager** - Full PMP-compliant project management (coming soon)
- **Cursor AI Safety** - Enhanced AI safety features for Cursor (future project)

## ⚠️ **Important Notes**

### **What This Extension CANNOT Do:**
- ❌ **Intercept AI requests** in real-time
- ❌ **Validate AI responses** as they're generated
- ❌ **Block unsafe AI responses** automatically
- ❌ **Monitor AI model outputs** directly
- ❌ **Provide real-time AI safety** enforcement
- ❌ **Enforce accountability or provide immutable logs**
- ❌ **Automatically enforce or create failsafes**

### **What This Extension CAN Do:**
- ✅ **Validate existing chat content** for hallucinations
- ✅ **Check file references** mentioned in chat
- ✅ **Detect code quality issues** in chat responses
- ✅ **Identify false claims** about implementations
- ✅ **Provide post-processing validation** with detailed reports
- ✅ **Prompt the user to create new failsafes** based on feedback or errors

## 🎯 **Use Cases**

- **Code Review**: Validate AI-generated code in chat responses
- **Documentation Review**: Check file references and implementation claims
- **Quality Assurance**: Ensure AI responses don't contain false information
- **Learning Aid**: Understand common AI hallucination patterns
- **Project Management**: Basic task tracking and accountability

## 🎯 **Future Plans: Cursorrules and Advanced Features**

Some features are not possible in a VS Code/Cursor extension, but may be enabled in the future by a companion tool called **Cursorrules**. This would allow:
- Real-time interception and blocking of unsafe AI responses
- Automatic enforcement of safety and compliance rules
- Immutable, centralized logging and audit trails
- Real-time monitoring and analytics
- Centralized policy management
- Automated failsafe creation and enforcement
- Integration with external systems

**These features are not part of the current extension, but are planned for future releases as part of a separate Cursorrules system.**

## 📄 **Links**

- **Repository**: https://github.com/WulfForge/Cursor-FailSafe
- **Issues**: https://github.com/WulfForge/Cursor-FailSafe/issues
- **Documentation**: https://github.com/WulfForge/Cursor-FailSafe#readme

---

**Made with ❤️ for the Cursor community**

*This extension focuses on what's actually possible within VS Code extension limitations.*
