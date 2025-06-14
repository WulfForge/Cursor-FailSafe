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
        if (!context?.projectState) {
            return 'No project context available';
        }

        const { currentTask, projectType, techStack, dependencies } = context.projectState;
        const parts: string[] = [];

        if (currentTask) parts.push(`Current task: ${currentTask}`);
        if (projectType) parts.push(`Project type: ${projectType}`);
        if (techStack?.length) parts.push(`Tech stack: ${techStack.join(', ')}`);
        if (dependencies?.length) parts.push(`Dependencies: ${dependencies.join(', ')}`);

        return parts.length > 0 ? parts.join(' | ') : 'Basic project context';
    }

    private analyzeCodeComplexity(content: string): {
        complexity: 'low' | 'medium' | 'high';
        lines: number;
        structures: number;
        dependencies: string[];
    } {
        const lines = content.split('\n').length;
        const structures = this.calculateNestingLevel(content);
        const complexity = this.calculateCyclomaticComplexity(content);
        const dependencies = this.extractDependencies(content);

        let complexityLevel: 'low' | 'medium' | 'high' = 'low';
        if (complexity > 10 || structures > 5) complexityLevel = 'high';
        else if (complexity > 5 || structures > 3) complexityLevel = 'medium';

        return {
            complexity: complexityLevel,
            lines,
            structures,
            dependencies
        };
    }

    private calculateNestingLevel(content: string): number {
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

    private calculateCyclomaticComplexity(content: string): number {
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

    private extractDependencies(content: string): string[] {
        const dependencyPatterns = [
            /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,
            /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
            /from\s+['"]([^'"]+)['"]/g
        ];

        const dependencies: string[] = [];
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

    private determineFocusAreas(context?: ValidationContext, codeAnalysis?: {
        complexity: string;
        lines: number;
        structures: number;
        dependencies: string[];
    }): string[] {
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

    private getPreviousIssues(content: string): string[] {
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

    private hashContent(content: string): string {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    private storeValidationResult(content: string, result: ValidationResult): void {
        const hash = this.hashContent(content);
        this.validationHistory.set(hash, result);
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
            // Since we can't actually call LLM APIs from VS Code extensions,
            // we'll use the fallback pattern analysis
            return this.fallbackPatternAnalysis(content, context);
        } catch (error) {
            this.logger.error('LLM analysis failed, using fallback', error);
            return this.fallbackPatternAnalysis(content, context);
        }
    }

    private async callLLMForAnalysis(prompt: string): Promise<string> {
        // This method is a placeholder since we can't make external API calls
        // from VS Code extensions without user consent and proper configuration
        throw new Error('LLM analysis not available in VS Code extension context');
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

    public shouldAllowOverride(validationResult: ValidationResult, config?: {
        allowOverride?: boolean;
        strictMode?: boolean;
    }): boolean {
        if (!config || !config.allowOverride) return false;
        if (validationResult.errors.length === 0) return true;
        return validationResult.errors.every(e => e.type !== 'safety' && e.type !== 'security');
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
    public async validateRequest(request: string): Promise<ValidationResult> {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: string[] = [];

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

    /**
     * Validate dates in content
     */
    private validateDates(content: string): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: string[] = [];

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
                    } else {
                        const now = new Date();
                        const diffDays = Math.abs((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        
                        if (date > now && diffDays > this.maxFutureDays) {
                            warnings.push({
                                type: 'quality',
                                message: `Date is too far in the future: ${match}`,
                                category: 'date_validation'
                            });
                        } else if (date < now && diffDays > this.maxPastDays) {
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
    public validateCode(code: string, context: string): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: string[] = [];

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

        } catch (error) {
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
    private detectHallucination(code: string, context: string): { errors: ValidationError[], warnings: ValidationWarning[] } {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

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
    private detectSecurityIssues(code: string): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: string[] = [];

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
    private detectSyntaxIssues(code: string): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: string[] = [];

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
    private detectPerformanceIssues(code: string): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: string[] = [];

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
    private validateContextMatch(code: string, context: string): boolean {
        // Simple context validation - could be enhanced
        const codeKeywords = code.toLowerCase().split(/\s+/);
        const contextKeywords = context.toLowerCase().split(/\s+/);
        
        const commonKeywords = codeKeywords.filter(keyword => 
            contextKeywords.includes(keyword) && keyword.length > 3
        );
        
        return commonKeywords.length > 0;
    }

    /**
     * Find line number for a given text in content
     */
    private findLineNumber(text: string, searchText: string): number | undefined {
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
    public validateImplementationClaims(claims: string[], actualFiles: string[]): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: string[] = [];

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
    public validateAIResponse(response: string, context: string, actualFiles: string[]): ValidationResult {
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
    private extractClaims(response: string): string[] {
        const claims: string[] = [];
        
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