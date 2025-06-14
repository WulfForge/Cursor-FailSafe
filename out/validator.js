"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validator = void 0;
const vscode = __importStar(require("vscode"));
const extensionDetector_1 = require("./extensionDetector");
class Validator {
    constructor(logger, projectPlan) {
        this.safetyKeywords = [
            'password', 'secret', 'key', 'token', 'api_key', 'auth', 'credential',
            'rm -rf', 'format', 'eval', 'exec', 'child_process', 'fs', 'process.env'
        ];
        this.qualityKeywords = [
            'TODO', 'FIXME', 'lorem', 'mock', 'placeholder', 'example', 'dummy',
            'foo', 'bar', 'baz', 'abc', '1234', 'test', 'sample'
        ];
        this.datePatterns = [
            /## \[[\d.]+\] - \d{4}-\d{2}-\d{2}/g,
            /\d{4}-\d{2}-\d{2}/g,
            /Start Date.*\d{4}-\d{2}-\d{2}/g,
            /Date.*\d{4}-\d{2}-\d{2}/g // Any date references
        ];
        this.performanceAntiPatterns = [
            'O(n²)', 'O(n³)', 'nested loops', 'recursion without base case',
            'memory leak', 'infinite loop', 'blocking operation'
        ];
        this.securityAntiPatterns = [
            'SQL injection', 'XSS', 'CSRF', 'insecure random', 'weak crypto',
            'hardcoded credentials', 'debug mode in production'
        ];
        this.validationHistory = new Map();
        this.currentDate = new Date();
        this.maxFutureDays = 365; // Allow up to 1 year in future
        this.maxPastDays = 3650; // Allow up to 10 years in past
        this.logger = logger;
        this.projectPlan = projectPlan;
        this.extensionDetector = new extensionDetector_1.ExtensionDetector(logger);
    }
    async validateCodeWithLLM(content, context) {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        // Build dynamic prompt based on context
        const dynamicPrompt = this.buildDynamicPrompt(content, context);
        // Use LLM to analyze the code for comprehensive validation
        const analysis = await this.analyzeWithLLM(content, dynamicPrompt, context);
        // Process LLM analysis results
        if (analysis.safetyIssues) {
            analysis.safetyIssues.forEach(issue => {
                errors.push({
                    type: 'safety',
                    message: issue.description,
                    line: issue.line,
                    severity: 'error'
                });
            });
        }
        if (analysis.qualityIssues) {
            analysis.qualityIssues.forEach(issue => {
                if (issue.severity === 'error') {
                    errors.push({
                        type: 'hallucination',
                        message: issue.description,
                        line: issue.line,
                        severity: 'error'
                    });
                }
                else {
                    warnings.push({
                        type: 'style',
                        message: issue.description,
                        line: issue.line
                    });
                }
            });
        }
        if (analysis.performanceIssues) {
            analysis.performanceIssues.forEach(issue => {
                warnings.push({
                    type: 'performance',
                    message: issue.description,
                    line: issue.line
                });
            });
        }
        if (analysis.securityIssues) {
            analysis.securityIssues.forEach(issue => {
                errors.push({
                    type: 'security',
                    message: issue.description,
                    line: issue.line,
                    severity: 'error'
                });
            });
        }
        if (analysis.suggestions) {
            suggestions.push(...analysis.suggestions);
        }
        // Store result for future reference
        this.storeValidationResult(content, {
            isValid: (errors.length || 0) === 0 && (warnings.length || 0) === 0,
            errors,
            warnings,
            suggestions
        });
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions
        };
    }
    buildDynamicPrompt(content, context) {
        const projectContext = this.getProjectContext(context);
        const codeAnalysis = this.analyzeCodeComplexity(content);
        const focusAreas = this.determineFocusAreas(context, codeAnalysis);
        const previousIssues = this.getPreviousIssues(content);
        return `Analyze the following code with enhanced context awareness:

**Code to Analyze:**
\`\`\`
${content}
\`\`\`

**Project Context:**
${projectContext}

**Code Analysis:**
- Complexity: ${codeAnalysis.complexity}
- Lines of code: ${codeAnalysis.lines}
- Functions/classes: ${codeAnalysis.structures}
- Dependencies: ${codeAnalysis.dependencies.join(', ')}

**Focus Areas:**
${focusAreas.map(area => `- ${area}`).join('\n')}

**Previous Issues to Watch:**
${previousIssues.length > 0 ? previousIssues.map(issue => `- ${issue}`).join('\n') : '- None detected'}

**Enhanced Validation Requirements:**

1. **Security Analysis:**
   - Check for hardcoded secrets, tokens, or credentials
   - Identify potential injection vulnerabilities
   - Verify secure coding practices
   - Check for proper input validation

2. **Performance Analysis:**
   - Identify performance anti-patterns
   - Check for memory leaks or inefficient algorithms
   - Verify proper async/await usage
   - Check for blocking operations

3. **Code Quality Analysis:**
   - Detect hallucinations, placeholders, or incomplete code
   - Verify proper error handling
   - Check for code duplication
   - Verify naming conventions and readability

4. **Maintainability Analysis:**
   - Check for proper documentation
   - Verify separation of concerns
   - Check for testability
   - Verify proper abstraction levels

5. **Context-Specific Analysis:**
   - Ensure code aligns with current project task
   - Verify consistency with existing codebase
   - Check for proper integration patterns

Please provide a JSON response with the following structure:
{
  "safetyIssues": [
    {
      "description": "Detailed description of the safety issue",
      "line": line_number_if_applicable,
      "severity": "error",
      "category": "security|performance|quality"
    }
  ],
  "qualityIssues": [
    {
      "description": "Description of the quality issue",
      "line": line_number_if_applicable,
      "severity": "error" or "warning",
      "category": "hallucination|style|maintainability"
    }
  ],
  "performanceIssues": [
    {
      "description": "Performance concern description",
      "line": line_number_if_applicable,
      "severity": "warning",
      "category": "algorithm|memory|async"
    }
  ],
  "securityIssues": [
    {
      "description": "Security vulnerability description",
      "line": line_number_if_applicable,
      "severity": "error",
      "category": "injection|credentials|validation"
    }
  ],
  "suggestions": [
    "Specific improvement suggestions with actionable steps"
  ],
  "confidence": 0.95,
  "analysisSummary": "Brief summary of the analysis"
}`;
    }
    getProjectContext(context) {
        if (!context?.projectState) {
            return 'No project context available';
        }
        const { currentTask, projectType, techStack, dependencies } = context.projectState;
        const parts = [];
        if (currentTask)
            parts.push(`Current task: ${currentTask}`);
        if (projectType)
            parts.push(`Project type: ${projectType}`);
        if (techStack?.length)
            parts.push(`Tech stack: ${techStack.join(', ')}`);
        if (dependencies?.length)
            parts.push(`Dependencies: ${dependencies.join(', ')}`);
        return parts.length > 0 ? parts.join(' | ') : 'Basic project context';
    }
    analyzeCodeComplexity(content) {
        const lines = content.split('\n').length;
        const structures = this.calculateNestingLevel(content);
        const complexity = this.calculateCyclomaticComplexity(content);
        const dependencies = this.extractDependencies(content);
        let complexityLevel = 'low';
        if (complexity > 10 || structures > 5)
            complexityLevel = 'high';
        else if (complexity > 5 || structures > 3)
            complexityLevel = 'medium';
        return {
            complexity: complexityLevel,
            lines,
            structures,
            dependencies
        };
    }
    calculateNestingLevel(content) {
        const lines = content.split('\n');
        let maxNesting = 0;
        let currentNesting = 0;
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.includes('{')) {
                currentNesting++;
                maxNesting = Math.max(maxNesting, currentNesting);
            }
            if (trimmed.includes('}')) {
                currentNesting = Math.max(0, currentNesting - 1);
            }
        });
        return maxNesting;
    }
    calculateCyclomaticComplexity(content) {
        const patterns = [
            /\bif\b/g,
            /\belse\b/g,
            /\bfor\b/g,
            /\bwhile\b/g,
            /\bcase\b/g,
            /\bcatch\b/g,
            /\b&&\b/g,
            /\b\|\|\b/g,
            /\?\s*\w+\s*:/g
        ];
        let complexity = 1; // Base complexity
        patterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                complexity += matches.length;
            }
        });
        return complexity;
    }
    extractDependencies(content) {
        const dependencyPatterns = [
            /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,
            /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
            /from\s+['"]([^'"]+)['"]/g
        ];
        const dependencies = [];
        dependencyPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const dep = match.replace(pattern, '$1');
                    if (dep && !dependencies.includes(dep)) {
                        dependencies.push(dep);
                    }
                });
            }
        });
        return dependencies;
    }
    determineFocusAreas(context, codeAnalysis) {
        const defaultAreas = ['security', 'quality'];
        const userAreas = context?.userPreferences?.focusAreas || [];
        if (userAreas.length > 0) {
            return userAreas;
        }
        if (codeAnalysis) {
            if (codeAnalysis.complexity === 'high' || codeAnalysis.structures > 5) {
                defaultAreas.push('performance');
            }
            if (codeAnalysis.dependencies.length > 5) {
                defaultAreas.push('security');
            }
        }
        return defaultAreas;
    }
    getPreviousIssues(content) {
        const hash = this.hashContent(content);
        const previousResult = this.validationHistory.get(hash);
        if (previousResult) {
            return [
                ...previousResult.errors.map(e => e.message),
                ...previousResult.warnings.map(w => w.message)
            ];
        }
        return [];
    }
    hashContent(content) {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }
    storeValidationResult(content, result) {
        const hash = this.hashContent(content);
        this.validationHistory.set(hash, result);
    }
    async analyzeWithLLM(content, prompt, context) {
        try {
            // Since we can't actually call LLM APIs from VS Code extensions,
            // we'll use the fallback pattern analysis
            return this.fallbackPatternAnalysis(content, context);
        }
        catch (error) {
            this.logger.error('LLM analysis failed, using fallback', error);
            return this.fallbackPatternAnalysis(content, context);
        }
    }
    async callLLMForAnalysis(prompt) {
        // This method is a placeholder since we can't make external API calls
        // from VS Code extensions without user consent and proper configuration
        throw new Error('LLM analysis not available in VS Code extension context');
    }
    fallbackPatternAnalysis(content, context) {
        const safetyIssues = [];
        const qualityIssues = [];
        const performanceIssues = [];
        const securityIssues = [];
        const suggestions = [];
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            const lowerLine = line.toLowerCase();
            // Enhanced safety checks
            this.safetyKeywords.forEach(keyword => {
                if (lowerLine.includes(keyword.toLowerCase())) {
                    safetyIssues.push({
                        description: `Potential security issue: "${keyword}" detected`,
                        line: lineNum,
                        severity: 'error',
                        category: 'security'
                    });
                }
            });
            // Enhanced quality checks
            this.qualityKeywords.forEach(keyword => {
                if (lowerLine.includes(keyword.toLowerCase())) {
                    qualityIssues.push({
                        description: `Code quality issue: "${keyword}" detected - may be placeholder or hallucination`,
                        line: lineNum,
                        severity: 'error',
                        category: 'hallucination'
                    });
                }
            });
            // Performance checks
            this.performanceAntiPatterns.forEach(pattern => {
                if (lowerLine.includes(pattern.toLowerCase())) {
                    performanceIssues.push({
                        description: `Performance concern: "${pattern}" detected`,
                        line: lineNum,
                        severity: 'warning',
                        category: 'algorithm'
                    });
                }
            });
            // Security checks
            this.securityAntiPatterns.forEach(pattern => {
                if (lowerLine.includes(pattern.toLowerCase())) {
                    securityIssues.push({
                        description: `Security vulnerability: "${pattern}" detected`,
                        line: lineNum,
                        severity: 'error',
                        category: 'injection'
                    });
                }
            });
        });
        // Add context-specific suggestions
        if (context?.projectState?.currentTask) {
            suggestions.push(`Ensure this code aligns with the current task: ${context.projectState.currentTask}`);
        }
        if (content.length > 1000) {
            suggestions.push('Consider breaking down large code blocks into smaller, more manageable functions');
        }
        return { safetyIssues, qualityIssues, performanceIssues, securityIssues, suggestions };
    }
    shouldAllowOverride(validationResult, config) {
        if (!config || !config.allowOverride)
            return false;
        if (validationResult.errors.length === 0)
            return true;
        return validationResult.errors.every(e => e.type !== 'safety' && e.type !== 'security');
    }
    /**
     * Enhanced validation to detect emulation and mock environments
     */
    validateEnvironmentContext() {
        const errors = [];
        const warnings = [];
        // Check if we're in a real VS Code environment
        if (typeof vscode === 'undefined') {
            errors.push({
                type: 'hallucination',
                message: 'VS Code API not available - running in non-extension environment',
                severity: 'error',
                category: 'environment'
            });
        }
        else {
            // Check for mocked VS Code APIs
            if (this.isVSCodeMocked()) {
                errors.push({
                    type: 'mock_data',
                    message: 'VS Code APIs appear to be mocked - not in real extension environment',
                    severity: 'error',
                    category: 'environment'
                });
            }
            // Check for test environment indicators
            if (this.isTestEnvironment()) {
                warnings.push({
                    type: 'quality',
                    message: 'Running in test environment - VS Code integration may be limited',
                    category: 'environment'
                });
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions: errors.length > 0 ? [
                'Ensure code runs in real VS Code extension environment',
                'Verify VS Code APIs are not mocked',
                'Test in actual Cursor/VS Code workspace'
            ] : []
        };
    }
    /**
     * Check if VS Code APIs are mocked
     */
    isVSCodeMocked() {
        try {
            // Check for common mocking indicators
            const mockIndicators = [
                'mockVscode',
                'proxyquire',
                'test-workspace',
                'mocha',
                'jest'
            ];
            // Check stack trace for test indicators
            const stack = new Error().stack || '';
            if (mockIndicators.some(indicator => stack.includes(indicator))) {
                return true;
            }
            // Check if VS Code APIs return expected behavior
            if (vscode.workspace && typeof vscode.workspace.workspaceFolders === 'undefined') {
                return true;
            }
            if (vscode.window && typeof vscode.window.showInformationMessage !== 'function') {
                return true;
            }
            return false;
        }
        catch {
            return true; // If we can't check, assume mocked
        }
    }
    /**
     * Check if running in test environment
     */
    isTestEnvironment() {
        return !!(process.env.NODE_ENV === 'test' ||
            process.env.MOCHA_TEST ||
            process.env.JEST_WORKER_ID ||
            process.argv.some(arg => arg.includes('mocha') || arg.includes('jest')));
    }
    /**
     * Enhanced feasibility checking for environment issues
     */
    validateEnvironmentFeasibility(request) {
        const blockers = [];
        const recommendations = [];
        // Check for emulation/mock patterns in the request
        const emulationPatterns = [
            /mock.*vscode/i,
            /emulate.*environment/i,
            /fake.*extension/i,
            /simulate.*api/i,
            /test.*environment/i,
            /mock.*api/i,
            /fake.*api/i,
            /fake.*response/i,
            /mock.*data/i
        ];
        if (emulationPatterns.some(pattern => pattern.test(request))) {
            blockers.push('Request involves emulated/mock environment');
            recommendations.push('Use real VS Code extension environment');
        }
        // Check current environment
        if (this.isTestEnvironment()) {
            blockers.push('Running in test environment');
            recommendations.push('Verify functionality in production VS Code environment');
        }
        if (this.isVSCodeMocked()) {
            blockers.push('VS Code APIs are mocked');
            recommendations.push('Ensure real VS Code extension context');
        }
        return {
            isFeasible: blockers.length === 0,
            blockers,
            recommendations
        };
    }
    /**
     * Enhanced validation that includes extension detection
     */
    async validateRequest(request) {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        // 1. Environment validation
        const environmentResult = this.validateEnvironmentContext();
        errors.push(...environmentResult.errors);
        warnings.push(...environmentResult.warnings);
        // 2. Mock data detection
        const mockDataResult = this.detectMockData(request);
        errors.push(...mockDataResult.errors);
        warnings.push(...mockDataResult.warnings);
        // 3. Date validation
        const dateResult = this.validateDates(request);
        errors.push(...dateResult.errors);
        warnings.push(...dateResult.warnings);
        // 4. Feasibility check
        const feasibility = this.validateEnvironmentFeasibility(request);
        if (!feasibility.isFeasible) {
            errors.push({
                type: 'safety',
                message: `Request not feasible: ${feasibility.blockers.join(', ')}`,
                severity: 'error',
                category: 'feasibility'
            });
            suggestions.push(...feasibility.recommendations);
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions
        };
    }
    /**
     * Detect mock data patterns in requests
     */
    detectMockData(request) {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        const mockPatterns = [
            /mock.*data/i,
            /fake.*api/i,
            /simulate.*response/i,
            /test.*with.*dummy/i,
            /mock.*vscode/i,
            /emulate.*environment/i,
            /fake.*extension/i,
            /simulate.*api/i,
            /test.*environment/i,
            /mock.*api/i,
            /fake.*api/i,
            /fake.*response/i,
            /mock.*data/i
        ];
        if (mockPatterns.some(pattern => pattern.test(request))) {
            errors.push({
                type: 'mock_data',
                message: 'Request contains mock/fake data patterns',
                severity: 'error',
                category: 'mock_data'
            });
            suggestions.push('Use real data and APIs instead of mock implementations');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions
        };
    }
    /**
     * Validate dates in content
     */
    validateDates(content) {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        this.datePatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const dateStr = match.replace(/[^\d\-]/g, '');
                    const date = new Date(dateStr);
                    if (isNaN(date.getTime())) {
                        errors.push({
                            type: 'hallucination',
                            message: `Invalid date format: ${match}`,
                            severity: 'error',
                            category: 'date_validation'
                        });
                    }
                    else {
                        const now = new Date();
                        const diffDays = Math.abs((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        if (date > now && diffDays > this.maxFutureDays) {
                            warnings.push({
                                type: 'quality',
                                message: `Date is too far in the future: ${match}`,
                                category: 'date_validation'
                            });
                        }
                        else if (date < now && diffDays > this.maxPastDays) {
                            warnings.push({
                                type: 'quality',
                                message: `Date is too far in the past: ${match}`,
                                category: 'date_validation'
                            });
                        }
                    }
                });
            }
        });
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions
        };
    }
    /**
     * Validates AI-generated code for safety and quality
     */
    validateCode(code, context) {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        try {
            // Check for hallucination patterns
            const hallucinationResult = this.detectHallucination(code, context);
            errors.push(...hallucinationResult.errors);
            warnings.push(...hallucinationResult.warnings);
            // Check for mock data patterns
            const mockDataResult = this.detectMockData(code);
            errors.push(...mockDataResult.errors);
            warnings.push(...mockDataResult.warnings);
            // Check for security issues
            const securityResult = this.detectSecurityIssues(code);
            errors.push(...securityResult.errors);
            warnings.push(...securityResult.warnings);
            // Check for syntax issues
            const syntaxResult = this.detectSyntaxIssues(code);
            errors.push(...syntaxResult.errors);
            warnings.push(...syntaxResult.warnings);
            // Check for performance issues
            const performanceResult = this.detectPerformanceIssues(code);
            warnings.push(...performanceResult.warnings);
            suggestions.push(...performanceResult.suggestions);
            const isValid = errors.length === 0;
            return {
                isValid,
                errors,
                warnings,
                suggestions
            };
        }
        catch (error) {
            this.logger.error('Error during code validation', error);
            return {
                isValid: false,
                errors: [{
                        type: 'safety',
                        message: 'Validation failed due to internal error',
                        severity: 'error',
                        category: 'validation_error'
                    }],
                warnings: [],
                suggestions: []
            };
        }
    }
    /**
     * NEW: Detect AI hallucination patterns
     * This is the core feature to prevent exactly the issue we just experienced
     */
    detectHallucination(code, context) {
        const errors = [];
        const warnings = [];
        // Patterns that indicate AI hallucination
        const hallucinationPatterns = [
            // False claims about implementation
            /\b(?:I have|I've|I just|I created|I implemented|I added|I fixed)\s+(?:the|a|an)\s+(?:feature|function|class|method|file|script|tool)\b/gi,
            // Vague implementation claims
            /\b(?:implemented|created|added|fixed|built|developed)\s+(?:successfully|properly|correctly|fully)\b/gi,
            // Claims about files that may not exist
            /\b(?:created|added|implemented)\s+(?:file|script|class|module)\s+(?:at|in)\s+[\w/.-]+\b/gi,
            // Claims about functionality without evidence
            /\b(?:now|currently|already)\s+(?:supports|includes|has|provides|offers)\s+[\w\s]+\b/gi,
            // Claims about testing or validation
            /\b(?:tested|verified|validated|confirmed)\s+(?:and|that|it)\s+(?:works|functions|operates)\b/gi,
            // Claims about integration
            /\b(?:integrated|connected|linked|bound)\s+(?:with|to|into)\s+[\w\s]+\b/gi,
            // Claims about performance improvements
            /\b(?:improved|enhanced|optimized|boosted)\s+(?:performance|speed|efficiency)\b/gi,
            // Claims about user experience
            /\b(?:improved|enhanced|better)\s+(?:user\s+)?(?:experience|interface|ux|ui)\b/gi
        ];
        hallucinationPatterns.forEach(pattern => {
            const matches = code.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    errors.push({
                        type: 'hallucination',
                        message: `Potential hallucination detected: "${match.trim()}" - Verify this claim`,
                        severity: 'error',
                        category: 'ai_hallucination',
                        line: this.findLineNumber(code, match)
                    });
                });
            }
        });
        return { errors, warnings };
    }
    /**
     * Detect security issues in code
     */
    detectSecurityIssues(code) {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        this.securityAntiPatterns.forEach(pattern => {
            const matches = code.match(new RegExp(pattern, 'gi'));
            if (matches) {
                matches.forEach(match => {
                    errors.push({
                        type: 'security',
                        message: `Security vulnerability detected: "${match.trim()}"`,
                        severity: 'error',
                        category: 'security_issue',
                        line: this.findLineNumber(code, match)
                    });
                });
            }
        });
        return { isValid: errors.length === 0, errors, warnings, suggestions };
    }
    /**
     * Detect syntax issues in code
     */
    detectSyntaxIssues(code) {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        // Basic syntax checks
        const lines = code.split('\n');
        lines.forEach((line, index) => {
            // Check for common syntax issues
            if (line.includes('TODO') || line.includes('FIXME')) {
                warnings.push({
                    type: 'quality',
                    message: `Placeholder content detected: ${line.trim()}`,
                    category: 'placeholder_content',
                    line: index + 1
                });
            }
        });
        return { isValid: errors.length === 0, errors, warnings, suggestions };
    }
    /**
     * Detect performance issues in code
     */
    detectPerformanceIssues(code) {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        this.performanceAntiPatterns.forEach(pattern => {
            const matches = code.match(new RegExp(pattern, 'gi'));
            if (matches) {
                matches.forEach(match => {
                    warnings.push({
                        type: 'performance',
                        message: `Performance concern detected: "${match.trim()}"`,
                        category: 'performance_issue',
                        line: this.findLineNumber(code, match)
                    });
                });
            }
        });
        return { isValid: errors.length === 0, errors, warnings, suggestions };
    }
    /**
     * Validate context match between code and context
     */
    validateContextMatch(code, context) {
        // Simple context validation - could be enhanced
        const codeKeywords = code.toLowerCase().split(/\s+/);
        const contextKeywords = context.toLowerCase().split(/\s+/);
        const commonKeywords = codeKeywords.filter(keyword => contextKeywords.includes(keyword) && keyword.length > 3);
        return commonKeywords.length > 0;
    }
    /**
     * Find line number for a given text in content
     */
    findLineNumber(text, searchText) {
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(searchText)) {
                return i + 1;
            }
        }
        return undefined;
    }
    /**
     * Validate implementation claims against actual files
     */
    validateImplementationClaims(claims, actualFiles) {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        claims.forEach(claim => {
            // Extract file references from claim
            const fileMatches = claim.match(/[\w/.-]+\.(?:ts|js|json|md|txt|yml|yaml)/g);
            if (fileMatches) {
                fileMatches.forEach(fileRef => {
                    if (!actualFiles.includes(fileRef)) {
                        errors.push({
                            type: 'hallucination',
                            message: `File referenced but doesn't exist: ${fileRef}`,
                            severity: 'error',
                            category: 'missing_file'
                        });
                        suggestions.push(`Verify that ${fileRef} exists in the workspace`);
                    }
                });
            }
        });
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions
        };
    }
    /**
     * NEW: Comprehensive AI response validation
     * This is the main entry point for validating AI-generated responses
     */
    validateAIResponse(response, context, actualFiles) {
        // Extract claims from the response
        const claims = this.extractClaims(response);
        // Validate implementation claims
        const claimValidation = this.validateImplementationClaims(claims, actualFiles);
        // Validate code content
        const codeValidation = this.validateCode(response, context);
        // Combine results
        return {
            isValid: claimValidation.isValid && codeValidation.isValid,
            errors: [...claimValidation.errors, ...codeValidation.errors],
            warnings: [...claimValidation.warnings, ...codeValidation.warnings],
            suggestions: [...claimValidation.suggestions, ...codeValidation.suggestions]
        };
    }
    /**
     * Extract implementation claims from AI response
     */
    extractClaims(response) {
        const claims = [];
        // Patterns that indicate implementation claims
        const claimPatterns = [
            /(?:I have|I've|I just|I created|I implemented|I added|I fixed)\s+([^.!?]+)/gi,
            /(?:created|added|implemented)\s+([^.!?]+)/gi,
            /(?:in|at)\s+([\w/.-]+\.(?:ts|js|json|md))/gi
        ];
        claimPatterns.forEach(pattern => {
            const matches = response.match(pattern);
            if (matches) {
                claims.push(...matches);
            }
        });
        return claims;
    }
}
exports.Validator = Validator;
//# sourceMappingURL=validator.js.map