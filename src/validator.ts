import * as vscode from 'vscode';
import { ValidationResult, ValidationError, ValidationWarning } from './types';
import { ProjectPlan } from './projectPlan';
import { Logger } from './logger';
import { ExtensionDetector } from './extensionDetector';

export interface ValidationContext {
    projectState?: {
        currentTask?: string;
        projectType?: string;
        techStack?: string[];
        dependencies?: string[];
    };
    codeContext?: {
        fileType?: string;
        complexity?: 'low' | 'medium' | 'high';
        size?: number;
        purpose?: string;
    };
    userPreferences?: {
        strictMode?: boolean;
        focusAreas?: string[];
        ignorePatterns?: string[];
    };
    previousResults?: {
        successRate?: number;
        commonIssues?: string[];
        lastValidation?: Date;
    };
}

export class Validator {
    private readonly safetyKeywords = [
        'password', 'secret', 'key', 'token', 'api_key', 'auth', 'credential',
        'rm -rf', 'format', 'eval', 'exec', 'child_process', 'fs', 'process.env'
    ];

    private readonly qualityKeywords = [
        'TODO', 'FIXME', 'lorem', 'mock', 'placeholder', 'example', 'dummy',
        'foo', 'bar', 'baz', 'abc', '1234', 'test', 'sample'
    ];

    private readonly datePatterns = [
        /## \[[\d.]+\] - \d{4}-\d{2}-\d{2}/g, // CHANGELOG date format
        /\d{4}-\d{2}-\d{2}/g, // General date format
        /Start Date.*\d{4}-\d{2}-\d{2}/g, // Project plan dates
        /Date.*\d{4}-\d{2}-\d{2}/g // Any date references
    ];

    private readonly performanceAntiPatterns = [
        'O(n²)', 'O(n³)', 'nested loops', 'recursion without base case',
        'memory leak', 'infinite loop', 'blocking operation'
    ];

    private readonly securityAntiPatterns = [
        'SQL injection', 'XSS', 'CSRF', 'insecure random', 'weak crypto',
        'hardcoded credentials', 'debug mode in production'
    ];

    private logger: Logger;
    private projectPlan: ProjectPlan;
    private extensionDetector: ExtensionDetector;
    private validationHistory: Map<string, ValidationResult> = new Map();
    private readonly currentDate = new Date();
    private readonly maxFutureDays = 365; // Allow up to 1 year in future
    private readonly maxPastDays = 3650; // Allow up to 10 years in past

    constructor(logger: Logger, projectPlan: ProjectPlan) {
        this.logger = logger;
        this.projectPlan = projectPlan;
        this.extensionDetector = new ExtensionDetector(logger);
    }

    public async validateCodeWithLLM(content: string, context?: ValidationContext): Promise<ValidationResult> {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: string[] = [];

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
                } else {
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

    private buildDynamicPrompt(content: string, context?: ValidationContext): string {
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

    private getProjectContext(context?: ValidationContext): string {
        let projectContext = 'No specific project context available.';

        if (this.projectPlan) {
            const currentTask = this.projectPlan.getCurrentTask();
            const allTasks = this.projectPlan.getAllTasks();
            const progress = this.projectPlan.getProjectProgress();

            projectContext = `
- Current Task: ${currentTask?.name || 'None'}
- Project Progress: ${progress.progressPercentage.toFixed(1)}%
- Total Tasks: ${progress.totalTasks}
- Completed Tasks: ${progress.completedTasks}
- Active Tasks: ${progress.inProgressTasks}
- Blocked Tasks: ${progress.blockedTasks}
- Estimated Remaining Time: ${Math.round(progress.estimatedRemainingTime)} minutes`;
        }

        if (context?.projectState) {
            projectContext += `
- Project Type: ${context.projectState.projectType || 'Unknown'}
- Tech Stack: ${context.projectState.techStack?.join(', ') || 'Unknown'}
- Dependencies: ${context.projectState.dependencies?.join(', ') || 'None'}`;
        }

        return projectContext;
    }

    private analyzeCodeComplexity(content: string): {
        complexity: 'low' | 'medium' | 'high';
        lines: number;
        structures: number;
        dependencies: string[];
    } {
        const lines = content.split('\n').length;
        const functions = (content.match(/function\s+\w+|=>|class\s+\w+/g) || []).length;
        const imports = (content.match(/import\s+.*from|require\(/g) || []).length;
        const nestedLevels = this.calculateNestingLevel(content);
        const cyclomaticComplexity = this.calculateCyclomaticComplexity(content);

        let complexity: 'low' | 'medium' | 'high' = 'low';
        if (lines > 200 || functions > 20 || nestedLevels > 4 || cyclomaticComplexity > 10) {
            complexity = 'high';
        } else if (lines > 50 || functions > 5 || nestedLevels > 2 || cyclomaticComplexity > 5) {
            complexity = 'medium';
        }

        const dependencies = this.extractDependencies(content);

        return {
            complexity,
            lines,
            structures: functions,
            dependencies
        };
    }

    private calculateNestingLevel(content: string): number {
        let maxNesting = 0;
        let currentNesting = 0;
        
        for (const char of content) {
            if (char === '{') {
                currentNesting++;
                maxNesting = Math.max(maxNesting, currentNesting);
            } else if (char === '}') {
                currentNesting = Math.max(0, currentNesting - 1);
            }
        }
        
        return maxNesting;
    }

    private calculateCyclomaticComplexity(content: string): number {
        const conditions = [
            /if\s*\(/g,
            /else\s+if\s*\(/g,
            /for\s*\(/g,
            /while\s*\(/g,
            /switch\s*\(/g,
            /case\s+/g,
            /catch\s*\(/g,
            /\|\||&&/g
        ];

        let complexity = 1; // Base complexity
        conditions.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                complexity += matches.length;
            }
        });

        return complexity;
    }

    private extractDependencies(content: string): string[] {
        const dependencies: string[] = [];
        
        // Extract import statements
        const importMatches = content.match(/import\s+.*from\s+['"]([^'"]+)['"]/g);
        if (importMatches) {
            importMatches.forEach(match => {
                const module = match.match(/from\s+['"]([^'"]+)['"]/)?.[1];
                if (module && !module.startsWith('.')) {
                    dependencies.push(module);
                }
            });
        }

        // Extract require statements
        const requireMatches = content.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
        if (requireMatches) {
            requireMatches.forEach(match => {
                const module = match.match(/['"]([^'"]+)['"]/)?.[1];
                if (module && !module.startsWith('.')) {
                    dependencies.push(module);
                }
            });
        }

        return [...new Set(dependencies)]; // Remove duplicates
    }

    private determineFocusAreas(context?: ValidationContext, codeAnalysis?: any): string[] {
        const focusAreas: string[] = [];

        // Always include core areas
        focusAreas.push('Security validation');
        focusAreas.push('Code quality assessment');

        // Add context-specific focus areas
        if (context?.projectState?.currentTask) {
            focusAreas.push('Task alignment verification');
        }

        if (codeAnalysis?.complexity === 'high') {
            focusAreas.push('Performance optimization');
            focusAreas.push('Complexity reduction');
        }

        if (codeAnalysis?.dependencies.length > 5) {
            focusAreas.push('Dependency management');
        }

        if (context?.userPreferences?.focusAreas) {
            focusAreas.push(...context.userPreferences.focusAreas);
        }

        return focusAreas;
    }

    private getPreviousIssues(content: string): string[] {
        const contentHash = this.hashContent(content);
        const previousResult = this.validationHistory.get(contentHash);
        
        if (!previousResult) {
            return [];
        }

        // Extract common issues from previous validation
        const issues: string[] = [];
        previousResult.errors.forEach(error => {
            issues.push(`${error.type}: ${error.message.substring(0, 50)}`);
        });

        return issues.slice(0, 5); // Top 5 issues
    }

    private hashContent(content: string): string {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    private storeValidationResult(content: string, result: ValidationResult): void {
        const contentHash = this.hashContent(content);
        this.validationHistory.set(contentHash, result);
    }

    private async analyzeWithLLM(content: string, prompt: string, context?: ValidationContext): Promise<{
        safetyIssues?: Array<{ description: string; line?: number; severity: string; category: string }>;
        qualityIssues?: Array<{ description: string; line?: number; severity: string; category: string }>;
        performanceIssues?: Array<{ description: string; line?: number; severity: string; category: string }>;
        securityIssues?: Array<{ description: string; line?: number; severity: string; category: string }>;
        suggestions?: string[];
        confidence?: number;
        analysisSummary?: string;
    }> {
        try {
            // This would call the actual LLM API with the enhanced prompt
            const response = await this.callLLMForAnalysis(prompt);
            return JSON.parse(response);
        } catch (error) {
            this.logger?.error('LLM analysis failed, falling back to pattern analysis', error);
            return this.fallbackPatternAnalysis(content, context);
        }
    }

    private async callLLMForAnalysis(prompt: string): Promise<string> {
        // Placeholder for actual LLM API call
        // In production, this would call the same LLM that generated the code
        return new Promise((resolve) => {
            setTimeout(() => {
                // Simulated LLM response with enhanced analysis
                resolve(JSON.stringify({
                    safetyIssues: [],
                    qualityIssues: [],
                    performanceIssues: [],
                    securityIssues: [],
                    suggestions: [
                        "Consider adding input validation for user-provided data",
                        "Implement proper error handling for async operations",
                        "Add JSDoc comments for better documentation"
                    ],
                    confidence: 0.95,
                    analysisSummary: "Code appears to be well-structured with minor improvement opportunities"
                }));
            }, 1000);
        });
    }

    private fallbackPatternAnalysis(content: string, context?: ValidationContext): {
        safetyIssues?: Array<{ description: string; line?: number; severity: string; category: string }>;
        qualityIssues?: Array<{ description: string; line?: number; severity: string; category: string }>;
        performanceIssues?: Array<{ description: string; line?: number; severity: string; category: string }>;
        securityIssues?: Array<{ description: string; line?: number; severity: string; category: string }>;
        suggestions?: string[];
    } {
        const safetyIssues: Array<{ description: string; line?: number; severity: string; category: string }> = [];
        const qualityIssues: Array<{ description: string; line?: number; severity: string; category: string }> = [];
        const performanceIssues: Array<{ description: string; line?: number; severity: string; category: string }> = [];
        const securityIssues: Array<{ description: string; line?: number; severity: string; category: string }> = [];
        const suggestions: string[] = [];

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

    // Legacy method for backward compatibility
    public validateCode(content: string, filePath?: string): ValidationResult {
        const result = this.fallbackPatternAnalysis(content);
        
        return {
            isValid: (result.safetyIssues?.length || 0) === 0 && (result.qualityIssues?.length || 0) === 0,
            errors: [
                ...(result.safetyIssues?.map(issue => ({
                    type: 'safety' as const,
                    message: issue.description,
                    line: issue.line,
                    severity: 'error' as const
                })) || []),
                ...(result.qualityIssues?.filter(issue => issue.severity === 'error').map(issue => ({
                    type: 'hallucination' as const,
                    message: issue.description,
                    line: issue.line,
                    severity: 'error' as const
                })) || [])
            ],
            warnings: result.qualityIssues?.filter(issue => issue.severity === 'warning').map(issue => ({
                type: 'style' as const,
                message: issue.description,
                line: issue.line
            })) || [],
            suggestions: result.suggestions || []
        };
    }

    public validateResponse(response: string): ValidationResult {
        return this.validateCode(response);
    }

    public shouldAllowOverride(validationResult: ValidationResult, config?: any): boolean {
        if (!config || !config.allowOverride) return false;
        if (validationResult.errors.length === 0) return true;
        return validationResult.errors.every(e => e.type !== 'safety' && e.type !== 'security');
    }

    public getValidationHistory(): Map<string, ValidationResult> {
        return new Map(this.validationHistory);
    }

    public clearValidationHistory(): void {
        this.validationHistory.clear();
    }

    /**
     * Enhanced validation to detect emulation and mock environments
     */
    private validateEnvironmentContext(): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // Check if we're in a real VS Code environment
        if (typeof vscode === 'undefined') {
            errors.push({
                type: 'hallucination',
                message: 'VS Code API not available - running in non-extension environment',
                severity: 'error',
                category: 'environment'
            });
        } else {
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
    private isVSCodeMocked(): boolean {
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
        } catch {
            return true; // If we can't check, assume mocked
        }
    }

    /**
     * Check if running in test environment
     */
    private isTestEnvironment(): boolean {
        return !!(process.env.NODE_ENV === 'test' || 
                 process.env.MOCHA_TEST || 
                 process.env.JEST_WORKER_ID ||
                 process.argv.some(arg => arg.includes('mocha') || arg.includes('jest')));
    }

    /**
     * Enhanced feasibility checking for environment issues
     */
    public validateEnvironmentFeasibility(request: string): {
        isFeasible: boolean;
        blockers: string[];
        recommendations: string[];
    } {
        const blockers: string[] = [];
        const recommendations: string[] = [];

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
    public async validateRequest(request: string, context?: string): Promise<ValidationResult> {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: string[] = [];

        // 1. Environment validation
        const envResult = this.validateEnvironmentContext();
        errors.push(...envResult.errors);
        warnings.push(...envResult.warnings);
        suggestions.push(...envResult.suggestions);

        // 2. Extension validation
        const extensionResult = this.extensionDetector.validateExtensionUsage(request);
        if (!extensionResult.isValid) {
            extensionResult.issues.forEach(issue => {
                errors.push({
                    type: 'hallucination',
                    message: issue,
                    severity: 'error',
                    category: 'extension'
                });
            });
            suggestions.push(...extensionResult.suggestions);
        }

        // 3. Date validation
        const dateResult = this.validateDates(request);
        errors.push(...dateResult.errors);
        warnings.push(...dateResult.warnings);
        suggestions.push(...dateResult.suggestions);

        // 4. Existing validation logic
        const feasibility = this.validateEnvironmentFeasibility(request);
        if (!feasibility.isFeasible) {
            feasibility.blockers.forEach(blocker => {
                errors.push({
                    type: 'hallucination',
                    message: blocker,
                    severity: 'error',
                    category: 'hallucination'
                });
            });
            suggestions.push(...feasibility.recommendations);
        }

        // 5. Mock data detection
        const mockResult = this.detectMockData(request);
        if (!mockResult.isValid) {
            errors.push(...mockResult.errors);
            warnings.push(...mockResult.warnings);
            suggestions.push(...mockResult.suggestions);
        }

        const result: ValidationResult = {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions
        };

        // Cache result
        this.validationHistory.set(request, result);
        
        return result;
    }

    /**
     * Detect mock data patterns in requests
     */
    private detectMockData(request: string): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: string[] = [];

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

    private validateDates(content: string): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: string[] = [];

        for (const pattern of this.datePatterns) {
            const matches = content.match(pattern);
            if (matches) {
                for (const match of matches) {
                    const dateMatch = match.match(/\d{4}-\d{2}-\d{2}/);
                    if (dateMatch) {
                        const dateStr = dateMatch[0];
                        const date = new Date(dateStr);
                        
                        // Check if date is valid
                        if (isNaN(date.getTime())) {
                            errors.push({
                                type: 'syntax',
                                message: `Invalid date format: ${dateStr}`,
                                severity: 'error',
                                category: 'date'
                            });
                            suggestions.push(`Fix the date format: ${dateStr} should be in YYYY-MM-DD format`);
                            continue;
                        }

                        // Check if date is in reasonable range
                        const daysDiff = Math.floor((date.getTime() - this.currentDate.getTime()) / (1000 * 60 * 60 * 24));
                        
                        if (daysDiff > this.maxFutureDays) {
                            errors.push({
                                type: 'hallucination',
                                message: `Date too far in future: ${dateStr} (${daysDiff} days ahead)`,
                                severity: 'error',
                                category: 'date'
                            });
                            suggestions.push(`Consider using a more realistic date for ${dateStr}`);
                        } else if (daysDiff < -this.maxPastDays) {
                            warnings.push({
                                type: 'quality',
                                message: `Date very far in past: ${dateStr} (${Math.abs(daysDiff)} days ago)`,
                                category: 'date'
                            });
                        } else if (daysDiff < -30) { // More than 30 days in past
                            errors.push({
                                type: 'hallucination',
                                message: `Date too far in past: ${dateStr} (${Math.abs(daysDiff)} days ago)`,
                                severity: 'error',
                                category: 'date'
                            });
                            suggestions.push(`Consider using a more recent date for ${dateStr}`);
                        }

                        // Check for common date errors (like month > 12, day > 31)
                        const [year, month, day] = dateStr.split('-').map(Number);
                        if (month > 12 || month < 1) {
                            errors.push({
                                type: 'syntax',
                                message: `Invalid month in date: ${dateStr}`,
                                severity: 'error',
                                category: 'date'
                            });
                            suggestions.push(`Month should be between 01-12 in ${dateStr}`);
                        }
                        if (day > 31 || day < 1) {
                            errors.push({
                                type: 'syntax',
                                message: `Invalid day in date: ${dateStr}`,
                                severity: 'error',
                                category: 'date'
                            });
                            suggestions.push(`Day should be between 01-31 in ${dateStr}`);
                        }
                    }
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions
        };
    }
} 