# Cursorrules - Custom AI Validation Rules

Cursorrules is a powerful feature in FailSafe that allows you to create custom validation rules for AI responses. These rules help ensure AI-generated content meets your specific security, quality, compliance, and workflow requirements.

## Features

- **Custom Rule Creation**: Create rules using a simple 3-step wizard
- **Multiple Pattern Types**: Support for regex, keyword, and semantic patterns
- **Flexible Responses**: Block, warn, log, or suggest actions
- **Rule Management**: View, edit, enable/disable, and delete rules
- **Override System**: Allow rule overrides with justification tracking
- **Usage Statistics**: Track rule triggers and overrides
- **Integration**: Seamlessly integrated into VS Code/Cursor workflow

## Getting Started

### Creating Your First Rule

1. Open the FailSafe sidebar (🔒 icon in the activity bar)
2. Expand the "Cursorrules" section
3. Click "✨ Create New Rule"
4. Follow the 3-step wizard:
   - **Step 1**: Define the rule purpose and basic information
   - **Step 2**: Configure the detection pattern
   - **Step 3**: Set up response behavior and testing

### Managing Rules

1. In the FailSafe sidebar, click "📋 Manage Rules"
2. View all your rules with statistics
3. Enable/disable rules as needed
4. Edit rule details or delete rules
5. Monitor usage statistics

### Validating Content

1. Open any file in your editor
2. Use "🔍 Validate with Rules" from the sidebar
3. Or use the command palette: `FailSafe: Validate with Cursorrules`
4. View detailed violation reports with suggestions

## Rule Types

### Security Rules
- Detect hardcoded credentials
- Identify potential security vulnerabilities
- Flag insecure coding practices

**Example**: Detect hardcoded passwords
```
Pattern: password\s*=\s*["'][^"']+["']
Response: block
Message: Hardcoded password detected! Use environment variables instead.
```

### Quality Rules
- Identify placeholder content
- Detect incomplete implementations
- Flag poor coding practices

**Example**: Detect TODO comments
```
Pattern: TODO|FIXME|HACK
Response: warn
Message: Incomplete implementation detected. Please complete before production.
```

### Compliance Rules
- Ensure coding standards
- Validate documentation requirements
- Check for required patterns

**Example**: Require function documentation
```
Pattern: function\s+\w+\s*\([^)]*\)\s*\{
Response: suggest
Message: Function lacks JSDoc documentation. Consider adding comments.
```

### Workflow Rules
- Enforce project-specific patterns
- Validate naming conventions
- Check for required imports

**Example**: Enforce naming conventions
```
Pattern: const\s+[a-z][a-zA-Z0-9]*\s*=
Response: warn
Message: Variable should use camelCase naming convention.
```

## Pattern Types

### Regex Patterns
Use regular expressions for precise pattern matching:
```
Pattern: \b\d{4}-\d{2}-\d{2}\b
Description: Match date patterns (YYYY-MM-DD)
```

### Keyword Patterns
Use comma-separated keywords for simple matching:
```
Pattern: password, secret, key, token
Description: Match any of these security-related keywords
```

### Semantic Patterns
Advanced pattern matching based on purpose:
- **Security**: Detects security anti-patterns
- **Quality**: Identifies quality issues
- **Compliance**: Validates compliance requirements
- **Workflow**: Enforces workflow patterns

## Response Types

### Block
Prevents the content from being used and shows an error:
- Use for critical security issues
- Requires explicit override with justification

### Warn
Shows a warning but allows the content:
- Use for quality issues that should be addressed
- Provides suggestions for improvement

### Log
Records the issue without user interaction:
- Use for monitoring and analytics
- Helps track patterns over time

### Suggest
Provides suggestions for improvement:
- Use for best practices and recommendations
- Non-intrusive guidance

## Override System

When a rule is triggered, you can:

1. **View Details**: See the full violation report
2. **Override All**: Override all violations with justification
3. **Override Individual**: Override specific rules
4. **Dismiss**: Ignore the violations

All overrides are tracked with:
- Timestamp
- Justification provided
- Rule that was overridden
- User who performed the override

## Usage Statistics

Track rule effectiveness with:
- **Total Triggers**: How many times each rule was triggered
- **Total Overrides**: How many times rules were overridden
- **Last Triggered**: When the rule was last activated
- **Success Rate**: Percentage of violations that weren't overridden

## Best Practices

### Rule Creation
1. **Start Simple**: Begin with basic patterns and refine over time
2. **Test Thoroughly**: Use the pattern testing feature before saving
3. **Clear Messages**: Provide actionable error messages
4. **Appropriate Severity**: Match severity to the actual risk level

### Rule Management
1. **Regular Review**: Periodically review rule effectiveness
2. **Monitor Overrides**: High override rates may indicate rule issues
3. **Update Patterns**: Refine patterns based on usage data
4. **Archive Unused**: Disable or delete rules that aren't effective

### Integration
1. **Team Alignment**: Share rules with your team
2. **Documentation**: Document complex rules for team understanding
3. **Gradual Rollout**: Start with a few rules and expand gradually
4. **Feedback Loop**: Collect feedback and iterate on rules

## Examples

### Security Rule Example
```json
{
  "name": "Hardcoded API Keys",
  "description": "Detect hardcoded API keys and tokens",
  "purpose": "security",
  "severity": "critical",
  "patternType": "regex",
  "pattern": "(api[_-]?key|token|secret)\\s*=\\s*[\"'][^\"']+[\"']",
  "message": "Hardcoded API key detected! Use environment variables for sensitive data.",
  "response": "block",
  "override": {
    "allowed": true,
    "requiresJustification": true
  }
}
```

### Quality Rule Example
```json
{
  "name": "Incomplete Functions",
  "description": "Detect functions with placeholder implementations",
  "purpose": "quality",
  "severity": "medium",
  "patternType": "keyword",
  "pattern": "throw new Error, TODO, FIXME, NotImplemented",
  "message": "Incomplete implementation detected. Please complete before production.",
  "response": "warn",
  "override": {
    "allowed": true,
    "requiresJustification": false
  }
}
```

## Troubleshooting

### Rule Not Triggering
1. Check if the rule is enabled
2. Verify the pattern syntax
3. Test the pattern with sample content
4. Check file type and project type scope

### Too Many False Positives
1. Refine the pattern to be more specific
2. Add context-specific conditions
3. Consider using semantic patterns
4. Review and adjust severity levels

### Performance Issues
1. Avoid overly complex regex patterns
2. Limit the number of active rules
3. Use appropriate pattern types for the use case
4. Monitor rule execution times

## Support

For issues or questions about Cursorrules:
1. Check the FailSafe documentation
2. Review existing rules for examples
3. Test patterns thoroughly before deployment
4. Report bugs through the FailSafe GitHub repository

## Future Enhancements

Planned features for future versions:
- **Rule Templates**: Pre-built rule templates for common scenarios
- **Advanced Patterns**: More sophisticated pattern matching
- **Rule Sharing**: Share rules between team members
- **Analytics Dashboard**: Advanced usage analytics
- **Integration APIs**: Programmatic rule management
- **Machine Learning**: AI-powered rule suggestions 