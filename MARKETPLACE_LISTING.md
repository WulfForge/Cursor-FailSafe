# FailSafe - Chat Content Validator

A VS Code/Cursor extension that validates AI chat responses for hallucinations and false claims. Provides post-processing validation of code blocks, file references, and implementation claims in chat content.

## What This Extension Does

FailSafe validates existing chat content after AI responses are generated. It does **NOT** intercept, block, or modify AI responses in real-time, nor does it enforce or guarantee safety, quality, or performance. These are not possible in VS Code/Cursor extensions.

## Features

- Validate AI chat responses for hallucinations and false claims (after the fact)
- Detect code blocks with syntax errors, placeholder content, and security issues
- Verify file references mentioned in chat content actually exist
- Heuristically check command and implementation claims (cannot guarantee execution or correctness)
- Identify common hallucination patterns in AI responses

## Project Management

- Simple dashboard with project status and progress tracking
- Basic task management with linear progression
- Progress monitoring with task completion tracking
- Status bar integration with project status

## Development Safeguards

- Code validation for security, quality, and performance issues (static analysis only)
- Version management with consistency checking
- Session logging for development accountability (not immutable)
- Problem reporting with GitHub integration

## Quick Start

1. Install the extension from the VS Code marketplace
2. Open a chat file or select chat content in any editor
3. Run "Validate Chat Content" from the command palette
4. Review validation results in the webview panel

## Commands

- Validate Chat Content: Validate AI chat responses for hallucinations
- FailSafe: Validate Code: Validate current file or selection
- FailSafe: Show Dashboard: Open project dashboard
- FailSafe: Report a Problem: Report issues to GitHub
- FailSafe: Suggest Failsafe: Suggest custom failsafes
- FailSafe: Check Version Consistency: Check version across files

## Configuration

Configure FailSafe in your workspace settings:

```
{
    "failsafe.enabled": true,
    "failsafe.validation.strictMode": false,
    "failsafe.validation.focusAreas": ["security", "quality", "performance"]
}
```

## Important Limitations

- **Cannot intercept, block, or modify AI responses in real-time**
- **Cannot guarantee safety, quality, or performance**
- **Cannot enforce accountability or provide immutable logs**
- **Cannot automatically enforce or create failsafes**
- **Cannot monitor AI model outputs directly**
- **Cannot provide real-time AI safety enforcement**
- **Can only validate and analyze after the fact**

## What This Extension CAN Do

- Validate existing chat content for hallucinations and false claims (after the fact)
- Check if code blocks are syntactically valid and not placeholders
- Verify if files referenced in chat content exist in the workspace
- Heuristically check for the presence of claimed commands or implementations
- Prompt the user to create new failsafes based on feedback or errors

## Use Cases

- Code Review: Validate AI-generated code in chat responses
- Documentation Review: Check file references and implementation claims
- Quality Assurance: Ensure AI responses don't contain false information
- Learning Aid: Understand common AI hallucination patterns
- Project Management: Basic task tracking and accountability

## Future Plans: Cursorrules and Advanced Features

Some features are not possible in a VS Code/Cursor extension, but may be enabled in the future by a companion tool called **Cursorrules**. This would allow:
- Real-time interception and blocking of unsafe AI responses
- Automatic enforcement of safety and compliance rules
- Immutable, centralized logging and audit trails
- Real-time monitoring and analytics
- Centralized policy management
- Automated failsafe creation and enforcement
- Integration with external systems

**These features are not part of the current extension, but are planned for future releases as part of a separate Cursorrules system.**

## Links

- Repository: https://github.com/WulfForge/Cursor-FailSafe
- Issues: https://github.com/WulfForge/Cursor-FailSafe/issues
- Documentation: https://github.com/WulfForge/Cursor-FailSafe#readme

---

Made for the Cursor community

This extension focuses on what's actually possible within VS Code extension limitations.

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