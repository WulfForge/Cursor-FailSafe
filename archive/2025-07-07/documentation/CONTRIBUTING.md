# Contributing to FailSafe 🛡️

Thank you for your interest in contributing to FailSafe! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### **Reporting Issues**
- Use the [GitHub Issues](https://github.com/WulfForge/Cursor-FailSafe/issues) page
- Include detailed steps to reproduce the problem
- Provide system information (OS, Cursor version, etc.)
- Include error messages and logs when possible

### **Feature Requests**
- Check existing issues to avoid duplicates
- Describe the feature and its benefits clearly
- Consider the impact on existing functionality
- Provide use cases and examples

### **Code Contributions**
1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes**
4. **Add tests** for new functionality
5. **Run the test suite**: `npm test`
6. **Commit your changes**: Use conventional commit messages
7. **Push to your fork**
8. **Create a Pull Request**

## 🛠️ Development Setup

### **Prerequisites**
- Node.js 16+ 
- npm or yarn
- Cursor Editor
- Git

### **Local Development**
```bash
# Clone the repository
git clone https://github.com/WulfForge/Cursor-FailSafe.git
cd Cursor-FailSafe

# Install dependencies
npm install

# Compile the extension
npm run compile

# Run tests
npm test

# Watch for changes
npm run watch
```

### **Testing**
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:validator
npm run test:timeout
npm run test:extensions
npm run test:projectPlan
npm run test:taskEngine
npm run test:ui

# Run tests in watch mode
npm run test:watch
```

## 📋 Code Standards

### **TypeScript**
- Use TypeScript for all new code
- Follow strict type checking
- Use interfaces for object shapes
- Prefer `const` over `let` when possible

### **Code Style**
- Use 2-space indentation
- Use semicolons
- Use single quotes for strings
- Use camelCase for variables and functions
- Use PascalCase for classes and interfaces

### **Documentation**
- Add JSDoc comments for public methods
- Update README.md for new features
- Include examples in documentation
- Document configuration options

### **Testing**
- Write tests for all new functionality
- Use descriptive test names
- Test both success and failure cases
- Mock external dependencies

## 🏗️ Architecture Guidelines

### **Component Structure**
- Keep components focused and single-purpose
- Use dependency injection for testability
- Follow the existing module structure
- Maintain clear separation of concerns

### **Error Handling**
- Use proper error types
- Provide meaningful error messages
- Log errors appropriately
- Handle edge cases gracefully

### **Performance**
- Avoid blocking operations in the main thread
- Use async/await for I/O operations
- Minimize memory usage
- Profile performance-critical code

## 🔧 Extension Development

### **VS Code API**
- Use the latest VS Code API features
- Follow VS Code extension guidelines
- Test in different VS Code versions
- Handle workspace state properly

### **Configuration**
- Use workspace settings for configuration
- Provide sensible defaults
- Validate configuration values
- Document all configuration options

### **Commands**
- Use descriptive command names
- Provide clear command titles
- Handle command errors gracefully
- Support command arguments properly

## 📝 Commit Guidelines

Use conventional commit messages:

```
type(scope): description

[optional body]

[optional footer]
```

### **Types**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

### **Examples**
```
feat(validator): add extension detection
fix(timeout): resolve race condition in watchdog
docs(readme): update installation instructions
test(projectPlan): add linear progression tests
```

## 🚀 Release Process

### **Versioning**
- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Update version in package.json
- Update CHANGELOG.md
- Tag releases in Git

### **Publishing**
1. Update version number
2. Update CHANGELOG.md
3. Run full test suite
4. Create release branch
5. Submit pull request
6. Merge and tag release
7. Publish to marketplace

## 🐛 Debugging

### **Extension Development**
- Use `console.log` for debugging
- Check the Developer Console in Cursor
- Use the Extension Development Host
- Enable verbose logging

### **Test Debugging**
- Use `console.log` in tests
- Run individual test files
- Use `--inspect` for Node.js debugging
- Check test output carefully

## 📞 Getting Help

- **Issues**: [GitHub Issues](https://github.com/WulfForge/Cursor-FailSafe/issues)
- **Discussions**: [GitHub Discussions](https://github.com/WulfForge/Cursor-FailSafe/discussions)
- **Documentation**: [Wiki](https://github.com/WulfForge/Cursor-FailSafe/wiki)

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page
- Project documentation

---

**Thank you for contributing to FailSafe!** 🛡️

*Together, we're making AI-assisted development more reliable and productive.* 