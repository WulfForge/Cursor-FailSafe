import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ValidationResult, ValidationError, ValidationWarning } from './types';
import { Logger } from './logger';

export interface ChatValidationContext {
    workspaceRoot: string;
    currentFile?: string;
    projectType?: string;
    techStack?: string[];
}

export class ChatValidator {
    private logger: Logger;
    private workspaceRoot: string;

    constructor(logger: Logger, workspaceRoot: string) {
        this.logger = logger;
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Main entry point for validating chat content
     */
    public validateChatContent(chatContent: string, context?: ChatValidationContext): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: string[] = [];

        try {
            // 1. Validate code blocks in chat
            const codeValidation = this.validateCodeBlocks(chatContent);
            errors.push(...codeValidation.errors);
            warnings.push(...codeValidation.warnings);

            // 2. Validate file references
            const fileValidation = this.validateFileReferences(chatContent, context);
            errors.push(...fileValidation.errors);
            warnings.push(...fileValidation.warnings);

            // 3. Validate command claims
            const commandValidation = this.validateCommandClaims(chatContent);
            errors.push(...commandValidation.errors);
            warnings.push(...commandValidation.warnings);

            // 4. Validate implementation claims
            const implementationValidation = this.validateImplementationClaims(chatContent, context);
            errors.push(...implementationValidation.errors);
            warnings.push(...implementationValidation.warnings);

            // 5. Validate testing claims
            const testingValidation = this.validateTestingClaims(chatContent);
            errors.push(...testingValidation.errors);
            warnings.push(...testingValidation.warnings);

            // 6. Detect hallucination patterns
            const hallucinationValidation = this.detectHallucinationPatterns(chatContent);
            errors.push(...hallucinationValidation.errors);
            warnings.push(...hallucinationValidation.warnings);

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                suggestions
            };

        } catch (error) {
            this.logger.error('Error validating chat content', error);
            return {
                isValid: false,
                errors: [{
                    type: 'safety',
                    message: 'Chat validation failed due to internal error',
                    severity: 'error',
                    category: 'validation_error'
                }],
                warnings: [],
                suggestions: []
            };
        }
    }

    /**
     * Validate code blocks found in chat content
     */
    private validateCodeBlocks(chatContent: string): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: string[] = [];

        const codeBlocks = this.extractCodeBlocks(chatContent);
        
        codeBlocks.forEach((block, index) => {
            // Check for placeholder content
            if (this.containsPlaceholderContent(block)) {
                warnings.push({
                    type: 'quality',
                    message: `Code block ${index + 1} contains placeholder content`,
                    category: 'placeholder_content',
                    line: this.findLineNumber(chatContent, block)
                });
            }

            // Check for syntax errors
            if (this.hasSyntaxErrors(block)) {
                errors.push({
                    type: 'syntax',
                    message: `Code block ${index + 1} has syntax errors`,
                    severity: 'error',
                    category: 'syntax_error',
                    line: this.findLineNumber(chatContent, block)
                });
            }

            // Check for security issues
            const securityIssues = this.detectSecurityIssues(block);
            errors.push(...securityIssues);
        });

        return { isValid: errors.length === 0, errors, warnings, suggestions };
    }

    /**
     * Validate file references mentioned in chat
     */
    private validateFileReferences(chatContent: string, context?: ChatValidationContext): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: string[] = [];

        const fileReferences = this.extractFileReferences(chatContent);
        
        fileReferences.forEach(fileRef => {
            const fullPath = path.resolve(this.workspaceRoot, fileRef);
            
            if (!fs.existsSync(fullPath)) {
                errors.push({
                    type: 'hallucination',
                    message: `File referenced but doesn't exist: ${fileRef}`,
                    severity: 'error',
                    category: 'missing_file'
                });
                suggestions.push(`Verify that ${fileRef} exists in the workspace`);
            } else {
                // File exists, check if it's relevant to current context
                if (context?.currentFile && !this.isFileRelevant(fileRef, context.currentFile)) {
                    warnings.push({
                        type: 'quality',
                        message: `File reference may not be relevant to current context: ${fileRef}`,
                        category: 'context_mismatch'
                    });
                }
            }
        });

        return { isValid: errors.length === 0, errors, warnings, suggestions };
    }

    /**
     * Validate claims about commands being executed
     */
    private validateCommandClaims(chatContent: string): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: string[] = [];

        const commandClaims = this.extractCommandClaims(chatContent);
        
        commandClaims.forEach(claim => {
            // Check if command actually exists
            if (!this.isCommandAvailable(claim.command)) {
                errors.push({
                    type: 'hallucination',
                    message: `Command claimed but not available: ${claim.command}`,
                    severity: 'error',
                    category: 'invalid_command'
                });
            }

            // Check for execution claims without evidence
            if (claim.executed && !this.hasExecutionEvidence(claim)) {
                warnings.push({
                    type: 'quality',
                    message: `Command execution claimed but no evidence provided: ${claim.command}`,
                    category: 'unverified_execution'
                });
                suggestions.push('Verify command execution with output or logs');
            }
        });

        return { isValid: errors.length === 0, errors, warnings, suggestions };
    }

    /**
     * Validate claims about implementations
     */
    private validateImplementationClaims(chatContent: string, context?: ChatValidationContext): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: string[] = [];

        const implementationClaims = this.extractImplementationClaims(chatContent);
        
        implementationClaims.forEach(claim => {
            // Check if implementation actually exists
            if (claim.filePath && !fs.existsSync(path.resolve(this.workspaceRoot, claim.filePath))) {
                errors.push({
                    type: 'hallucination',
                    message: `Implementation claimed but file doesn't exist: ${claim.filePath}`,
                    severity: 'error',
                    category: 'false_implementation'
                });
            }

            // Check for vague implementation claims
            if (this.isVagueImplementationClaim(claim.description)) {
                warnings.push({
                    type: 'quality',
                    message: `Vague implementation claim: ${claim.description}`,
                    category: 'vague_claim'
                });
                suggestions.push('Provide specific implementation details');
            }
        });

        return { isValid: errors.length === 0, errors, warnings, suggestions };
    }

    /**
     * Validate claims about testing
     */
    private validateTestingClaims(chatContent: string): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: string[] = [];

        const testingClaims = this.extractTestingClaims(chatContent);
        
        testingClaims.forEach(claim => {
            // Check for test execution claims without evidence
            if (claim.executed && !this.hasTestEvidence(claim)) {
                warnings.push({
                    type: 'quality',
                    message: `Test execution claimed but no evidence provided: ${claim.description}`,
                    category: 'unverified_testing'
                });
                suggestions.push('Provide test output or logs to verify execution');
            }

            // Check for test result claims
            if (claim.result && !this.verifyTestResult(claim)) {
                errors.push({
                    type: 'hallucination',
                    message: `Test result claim not verified: ${claim.result}`,
                    severity: 'error',
                    category: 'false_test_result'
                });
            }
        });

        return { isValid: errors.length === 0, errors, warnings, suggestions };
    }

    /**
     * Detect hallucination patterns in chat content
     */
    private detectHallucinationPatterns(chatContent: string): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: string[] = [];

        // Patterns that indicate potential hallucination
        const hallucinationPatterns = [
            // False claims about implementation
            /\b(?:I have|I've|I just|I created|I implemented|I added|I fixed)\s+(?:the|a|an)\s+(?:feature|function|class|method|file|script|tool)\b/gi,
            
            // Vague success claims
            /\b(?:successfully|properly|correctly|fully)\s+(?:implemented|created|added|fixed|built|developed)\b/gi,
            
            // Claims about files that may not exist
            /\b(?:created|added|implemented)\s+(?:file|script|class|module)\s+(?:at|in)\s+[\w\/\.-]+\b/gi,
            
            // Claims about functionality without evidence
            /\b(?:now|currently|already)\s+(?:supports|includes|has|provides|offers)\s+[\w\s]+\b/gi,
            
            // Claims about testing or validation
            /\b(?:tested|verified|validated|confirmed)\s+(?:and|that|it)\s+(?:works|functions|operates)\b/gi,
            
            // Claims about integration
            /\b(?:integrated|connected|linked|bound)\s+(?:with|to|into)\s+[\w\s]+\b/gi
        ];

        hallucinationPatterns.forEach(pattern => {
            const matches = chatContent.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    errors.push({
                        type: 'hallucination',
                        message: `Potential hallucination detected: "${match.trim()}" - Verify this claim`,
                        severity: 'error',
                        category: 'ai_hallucination',
                        line: this.findLineNumber(chatContent, match)
                    });
                });
            }
        });

        return { isValid: errors.length === 0, errors, warnings, suggestions };
    }

    // Helper methods
    private extractCodeBlocks(content: string): string[] {
        const codeBlockRegex = /```[\w]*\n([\s\S]*?)\n```/g;
        const matches = [...content.matchAll(codeBlockRegex)];
        return matches.map(match => match[1]);
    }

    private extractFileReferences(content: string): string[] {
        const filePatterns = [
            /`([\w\/\.-]+\.(?:ts|js|json|md|txt|yml|yaml))`/g,
            /file:\s*([\w\/\.-]+)/gi,
            /in\s+([\w\/\.-]+\.(?:ts|js|json|md|txt|yml|yaml))/gi
        ];

        const files = new Set<string>();
        filePatterns.forEach(pattern => {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
                files.add(match[1]);
            }
        });

        return Array.from(files);
    }

    private extractCommandClaims(content: string): Array<{command: string, executed: boolean}> {
        const commandPatterns = [
            /(?:ran|executed|ran)\s+`([^`]+)`/gi,
            /command:\s*`([^`]+)`/gi,
            /`([^`]+)`\s+(?:was|has been)\s+(?:executed|ran)/gi
        ];

        const claims: Array<{command: string, executed: boolean}> = [];
        commandPatterns.forEach(pattern => {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
                claims.push({
                    command: match[1],
                    executed: true
                });
            }
        });

        return claims;
    }

    private extractImplementationClaims(content: string): Array<{description: string, filePath?: string}> {
        const implementationPatterns = [
            /(?:implemented|created|added)\s+([^.!?]+)/gi,
            /(?:in|at)\s+([\w\/\.-]+\.(?:ts|js|json|md))/gi
        ];

        const claims: Array<{description: string, filePath?: string}> = [];
        implementationPatterns.forEach(pattern => {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
                claims.push({
                    description: match[1],
                    filePath: match[1].includes('.') ? match[1] : undefined
                });
            }
        });

        return claims;
    }

    private extractTestingClaims(content: string): Array<{description: string, executed: boolean, result?: string}> {
        const testingPatterns = [
            /(?:tested|verified|validated)\s+([^.!?]+)/gi,
            /test\s+(?:result|output):\s*([^.!?]+)/gi
        ];

        const claims: Array<{description: string, executed: boolean, result?: string}> = [];
        testingPatterns.forEach(pattern => {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
                claims.push({
                    description: match[1],
                    executed: true,
                    result: match[1]
                });
            }
        });

        return claims;
    }

    private containsPlaceholderContent(code: string): boolean {
        const placeholderPatterns = [
            /\b(?:TODO|FIXME|XXX|HACK|NOTE|BUG)\b/gi,
            /\b(?:placeholder|stub|mock|fake|dummy|example)\b/gi,
            /\b(?:lorem|ipsum|dolor|sit|amet)\b/gi
        ];

        return placeholderPatterns.some(pattern => pattern.test(code));
    }

    private hasSyntaxErrors(code: string): boolean {
        // Basic syntax checking - could be enhanced with proper parsers
        const syntaxPatterns = [
            /function\s+\w+\s*\([^)]*\)\s*\{[^}]*\}/g, // Missing closing brace
            /if\s*\([^)]*\)\s*\{[^}]*\}/g, // Missing closing brace
            /for\s*\([^)]*\)\s*\{[^}]*\}/g // Missing closing brace
        ];

        return syntaxPatterns.some(pattern => !pattern.test(code));
    }

    private detectSecurityIssues(code: string): ValidationError[] {
        const securityPatterns = [
            { pattern: /eval\s*\(/, message: 'Use of eval() is dangerous' },
            { pattern: /exec\s*\(/, message: 'Use of exec() is dangerous' },
            { pattern: /password\s*=\s*['"][^'"]+['"]/, message: 'Hardcoded password detected' },
            { pattern: /api_key\s*=\s*['"][^'"]+['"]/, message: 'Hardcoded API key detected' }
        ];

        const errors: ValidationError[] = [];
        securityPatterns.forEach(({ pattern, message }) => {
            if (pattern.test(code)) {
                errors.push({
                    type: 'security',
                    message,
                    severity: 'error',
                    category: 'security_issue'
                });
            }
        });

        return errors;
    }

    private isCommandAvailable(command: string): boolean {
        // Check if command exists in VS Code
        try {
            // Since this returns a Promise, we need to handle it properly
            // For now, return false as a placeholder - this would need async handling
            return false;
        } catch {
            return false;
        }
    }

    private hasExecutionEvidence(claim: {command: string, executed: boolean}): boolean {
        // This would need to be enhanced with actual execution tracking
        return false; // Placeholder
    }

    private isFileRelevant(fileRef: string, currentFile: string): boolean {
        const currentDir = path.dirname(currentFile);
        const refDir = path.dirname(fileRef);
        return currentDir === refDir || refDir.startsWith(currentDir);
    }

    private isVagueImplementationClaim(description: string): boolean {
        const vaguePatterns = [
            /\b(?:implemented|created|added)\s+(?:the|a|an)\s+(?:feature|function|class)\b/gi,
            /\b(?:successfully|properly|correctly)\s+(?:implemented|created|added)\b/gi
        ];

        return vaguePatterns.some(pattern => pattern.test(description));
    }

    private hasTestEvidence(claim: {description: string, executed: boolean, result?: string}): boolean {
        // This would need to be enhanced with actual test tracking
        return false; // Placeholder
    }

    private verifyTestResult(claim: {description: string, executed: boolean, result?: string}): boolean {
        // This would need to be enhanced with actual test result verification
        return false; // Placeholder
    }

    private findLineNumber(content: string, searchText: string): number | undefined {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(searchText)) {
                return i + 1;
            }
        }
        return undefined;
    }
} 