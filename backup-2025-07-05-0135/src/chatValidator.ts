import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from './logger';
import { ExtensionDetector } from './extensionDetector';

export interface ChatValidationContext {
    workspaceRoot: string;
    fileSystem: typeof fs;
    path: typeof path;
    currentFile?: string;
    projectType?: string;
    techStack?: string[];
}

export interface ValidationError {
    type: 'safety' | 'syntax' | 'hallucination' | 'mock_data' | 'security' | 'performance' | 'quality';
    message: string;
    severity: 'error' | 'warning';
    category: string;
    line?: number;
    timestamp: Date;
}

export interface ValidationWarning {
    type: 'security' | 'performance' | 'quality' | 'style' | 'maintainability';
    message: string;
    category: string;
    line?: number;
    timestamp: Date;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    suggestions: string[];
    timestamp: Date;
}

export interface FileClaim {
    type: 'CREATION' | 'EXISTENCE' | 'MODIFICATION' | 'CONTENT';
    filePath: string;
    line: number;
    context: string;
    timestamp: string;
}

export class ChatValidator {
    private readonly logger: Logger;
    private readonly workspaceRoot: string;
    private readonly extensionDetector: ExtensionDetector;

    constructor(logger: Logger, workspaceRoot: string) {
        this.logger = logger;
        this.workspaceRoot = workspaceRoot;
        this.extensionDetector = new ExtensionDetector(logger);
    }

    /**
     * Validates chat content for potential AI hallucinations
     */
    async validateChat(documentOrContent: vscode.TextDocument | string): Promise<ValidationResult> {
        if (typeof documentOrContent === 'string') {
            // Handle string content
            const chatContent = documentOrContent;
            const lines = chatContent.split('\n');
            
            const result: ValidationResult = {
                isValid: true,
                errors: [],
                warnings: [],
                suggestions: [],
                timestamp: new Date()
            };

            try {
                // Basic content validation
                if (!chatContent.trim()) {
                    result.errors.push({
                        type: 'hallucination',
                        message: 'Document is empty or contains only whitespace',
                        line: 1,
                        severity: 'error',
                        category: 'empty_content',
                        timestamp: new Date()
                    });
                    result.isValid = false;
                    return result;
                }

                // Check for chat-like patterns
                const chatPatterns = this.detectChatPatterns(lines);
                if (!chatPatterns.isChat) {
                    result.warnings.push({
                        type: 'quality',
                        message: 'Content does not appear to be chat content. Consider using a different validation method.',
                        line: 1,
                        category: 'not_chat_content',
                        timestamp: new Date()
                    });
                }

                // Validate AI responses
                const aiValidation = this.validateAIResponses(lines);
                result.errors.push(...aiValidation.errors);
                result.warnings.push(...aiValidation.warnings);
                result.suggestions.push(...aiValidation.suggestions);

                // Validate code blocks
                const codeValidation = this.validateCodeBlocks(lines);
                result.errors.push(...codeValidation.errors);
                result.warnings.push(...codeValidation.warnings);
                result.suggestions.push(...codeValidation.suggestions);

                // Validate file references
                const fileValidation = await this.validateFileReferences(lines);
                result.errors.push(...fileValidation.errors);
                result.warnings.push(...fileValidation.warnings);
                result.suggestions.push(...fileValidation.suggestions);

                // Validate command claims
                const commandValidation = await this.validateCommandClaims(lines);
                result.errors.push(...commandValidation.errors);
                result.warnings.push(...commandValidation.warnings);
                result.suggestions.push(...commandValidation.suggestions);

                // Proactive file validation
                const proactiveValidation = await this.performProactiveFileValidation(lines);
                result.errors.push(...proactiveValidation.errors);
                result.warnings.push(...proactiveValidation.warnings);
                result.suggestions.push(...proactiveValidation.suggestions);

                // Update overall validity
                result.isValid = result.errors.length === 0;

            } catch (error) {
                result.errors.push({
                    type: 'safety',
                    message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    line: 1,
                    severity: 'error',
                    category: 'validation_error',
                    timestamp: new Date()
                });
                result.isValid = false;
            }

            return result;
        } else {
            // Handle vscode.TextDocument
            const document = documentOrContent;
            const content = document.getText();
            const lines = content.split('\n');
            
            const result: ValidationResult = {
                isValid: true,
                errors: [],
                warnings: [],
                suggestions: [],
                timestamp: new Date()
            };

            try {
                // Basic content validation
                if (!content.trim()) {
                    result.errors.push({
                        type: 'hallucination',
                        message: 'Document is empty or contains only whitespace',
                        line: 1,
                        severity: 'error',
                        category: 'empty_content',
                        timestamp: new Date()
                    });
                    result.isValid = false;
                    return result;
                }

                // Check for chat-like patterns
                const chatPatterns = this.detectChatPatterns(lines);
                if (!chatPatterns.isChat) {
                    result.warnings.push({
                        type: 'quality',
                        message: 'Content does not appear to be chat content. Consider using a different validation method.',
                        line: 1,
                        category: 'not_chat_content',
                        timestamp: new Date()
                    });
                }

                // Validate AI responses
                const aiValidation = this.validateAIResponses(lines);
                result.errors.push(...aiValidation.errors);
                result.warnings.push(...aiValidation.warnings);
                result.suggestions.push(...aiValidation.suggestions);

                // Validate code blocks
                const codeValidation = this.validateCodeBlocks(lines);
                result.errors.push(...codeValidation.errors);
                result.warnings.push(...codeValidation.warnings);
                result.suggestions.push(...codeValidation.suggestions);

                // Validate file references
                const fileValidation = await this.validateFileReferences(lines);
                result.errors.push(...fileValidation.errors);
                result.warnings.push(...fileValidation.warnings);
                result.suggestions.push(...fileValidation.suggestions);

                // Validate command claims
                const commandValidation = await this.validateCommandClaims(lines);
                result.errors.push(...commandValidation.errors);
                result.warnings.push(...commandValidation.warnings);
                result.suggestions.push(...commandValidation.suggestions);

                // Proactive file validation
                const proactiveValidation = await this.performProactiveFileValidation(lines);
                result.errors.push(...proactiveValidation.errors);
                result.warnings.push(...proactiveValidation.warnings);
                result.suggestions.push(...proactiveValidation.suggestions);

                // Update overall validity
                result.isValid = result.errors.length === 0;

            } catch (error) {
                result.errors.push({
                    type: 'safety',
                    message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    line: 1,
                    severity: 'error',
                    category: 'validation_error',
                    timestamp: new Date()
                });
                result.isValid = false;
            }

            return result;
        }
    }

    /**
     * Evaluates technical debt in code content
     */
    async evaluateTechDebt(document: vscode.TextDocument): Promise<ValidationResult> {
        const content = document.getText();
        const lines = content.split('\n');
        
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            timestamp: new Date()
        };

        try {
            // Extract code blocks for analysis
            const codeBlocks = this.extractCodeBlocks(content);
            
            for (const codeBlock of codeBlocks) {
                const techDebtAnalysis = this.analyzeCodeForTechDebt(codeBlock);
                result.errors.push(...techDebtAnalysis.errors);
                result.warnings.push(...techDebtAnalysis.warnings);
                result.suggestions.push(...techDebtAnalysis.suggestions);
            }

            // Analyze overall file structure and patterns
            const fileAnalysis = this.analyzeFileStructure(lines);
            result.errors.push(...fileAnalysis.errors);
            result.warnings.push(...fileAnalysis.warnings);
            result.suggestions.push(...fileAnalysis.suggestions);

            // Update overall validity
            result.isValid = result.errors.length === 0;

        } catch (error) {
            result.errors.push({
                type: 'quality',
                message: `Tech debt evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                line: 1,
                severity: 'error',
                category: 'tech_debt_evaluation_error',
                timestamp: new Date()
            });
            result.isValid = false;
        }

        return result;
    }

    /**
     * MINIMAL: Lightweight validation for common hallucination patterns
     */
    public validateMinimal(chatContent: string): ValidationResult {
        const timestamp = new Date();
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: string[] = [];

        try {
            // Critical patterns (high confidence)
            const criticalPatterns = [
                {
                    pattern: /\b(?:There are|There is|There were)\s+(?:currently|now|currently)\s+(?:no|missing)\s+(?:files?|directories?)\s+(?:in|at)\s+([\w/.-]+)/gi,
                    message: 'File existence claim without verification',
                    category: 'unverified_existence_claim',
                    severity: 'error'
                },
                {
                    pattern: /\b(?:I have|I've|I just)\s+(?:successfully|properly|correctly|fully)\s+(?:implemented|created|added|fixed)\b/gi,
                    message: 'Unverified implementation claim',
                    category: 'unverified_implementation_claim',
                    severity: 'warning'
                },
                {
                    pattern: /\b(?:tested|verified|validated|confirmed)\s+(?:and|that|it)\s+(?:works|functions|operates)\b/gi,
                    message: 'Unverified testing claim',
                    category: 'unverified_testing_claim',
                    severity: 'warning'
                }
            ];

            // Medium-confidence patterns (require context)
            const mediumPatterns = [
                {
                    pattern: /\b(?:I can provide|I can show|I can list)\s+(?:a|the)\s+(?:list|script|solution)\b/gi,
                    message: 'Vague offer without specific details',
                    category: 'vague_offer',
                    severity: 'warning'
                },
                {
                    pattern: /\b(?:all|every|each)\s+(?:file|component|module)\s+(?:is|are)\s+(?:missing|deleted|corrupted)\b/gi,
                    message: 'Broad negative claim without evidence',
                    category: 'broad_negative_claim',
                    severity: 'warning'
                }
            ];

            // Check critical patterns first (high priority)
            criticalPatterns.forEach(({ pattern, message, category, severity }) => {
                const matches = chatContent.match(pattern);
                if (matches) {
                    const error: ValidationError = {
                        type: 'hallucination',
                        message: `${message}: "${matches[0].trim()}"`,
                        severity: severity as 'error' | 'warning',
                        category,
                        line: this.findLineNumber(chatContent, matches[0]),
                        timestamp
                    };
                    errors.push(error);
                }
            });

            // Check medium patterns (lower priority)
            mediumPatterns.forEach(({ pattern, message, category }) => {
                const matches = chatContent.match(pattern);
                if (matches) {
                    const warning: ValidationWarning = {
                        type: 'quality',
                        message: `${message}: "${matches[0].trim()}"`,
                        category,
                        line: this.findLineNumber(chatContent, matches[0]),
                        timestamp
                    };
                    warnings.push(warning);
                }
            });

            // Add contextual suggestions based on detected patterns
            if (errors.length > 0 || warnings.length > 0) {
                suggestions.push(
                    'Consider requesting specific evidence or verification steps',
                    'Ask for file listings, code snippets, or test results',
                    'Verify claims manually before proceeding with implementation'
                );
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                suggestions,
                timestamp
            };

        } catch (error) {
            this.logger.error('Error in minimal validation', error);
            return {
                isValid: false,
                errors: [{
                    type: 'safety',
                    message: 'Minimal validation failed due to internal error',
                    severity: 'error',
                    category: 'validation_error',
                    timestamp: new Date()
                }],
                warnings: [],
                suggestions: [],
                timestamp
            };
        }
    }

    /**
     * Detects if content appears to be chat content
     */
    private detectChatPatterns(lines: string[]): { isChat: boolean; patterns: string[] } {
        const patterns: string[] = [];
        let chatIndicators = 0;
        let totalLines = 0;

        for (const line of lines) {
            totalLines++;
            const trimmed = line.trim();
            
            // Check for role indicators
            if (/^(user|assistant|system|human|ai|bot|gpt|claude|bard|perplexity|anthropic|openai):/i.test(trimmed)) {
                chatIndicators++;
                patterns.push('role_indicator');
            }
            
            // Check for message markers
            if (/^[-#>*]\s/.test(trimmed)) {
                chatIndicators++;
                patterns.push('message_marker');
            }
            
            // Check for timestamp patterns
            if (/\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?/i.test(trimmed)) {
                chatIndicators++;
                patterns.push('timestamp');
            }
            
            // Check for conversation flow indicators
            if (/^(me:|you:|i said:|you said:)/i.test(trimmed)) {
                chatIndicators++;
                patterns.push('conversation_flow');
            }
        }

        const isChat = chatIndicators > 0 && (chatIndicators / totalLines) > 0.1;
        return { isChat, patterns: [...new Set(patterns)] };
    }

    /**
     * Validates AI responses for potential hallucinations
     */
    private validateAIResponses(lines: string[]): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            timestamp: new Date()
        };

        const hallucinationPatterns = [
            {
                pattern: /i (have|will|can|did|am going to) (created|created|modified|updated|added|implemented|fixed|built|developed|generated)/gi,
                type: 'hallucination' as const,
                message: 'AI claims to have performed actions that may not be verifiable'
            },
            {
                pattern: /(file|folder|directory|project) (exists|is present|has been created|was created)/gi,
                type: 'hallucination' as const,
                message: 'AI claims about file/folder existence without verification'
            },
            {
                pattern: /(successfully|successfully completed|finished|done|completed) (creating|modifying|updating|adding|implementing|fixing)/gi,
                type: 'hallucination' as const,
                message: 'AI claims task completion without evidence'
            },
            {
                pattern: /(here is|here's|i've created|i created) (the|a|an) (file|code|implementation|solution)/gi,
                type: 'hallucination' as const,
                message: 'AI claims to have created files or code without verification'
            },
            {
                pattern: /(let me|i'll|i will) (create|generate|build|implement|develop) (a|an|the)/gi,
                type: 'hallucination' as const,
                message: 'AI promises future actions that may not be completed'
            },
            {
                pattern: /(i can|i could|i would|i might) (help|assist|create|generate|build)/gi,
                type: 'hallucination' as const,
                message: 'AI makes capability claims without demonstration'
            },
            {
                pattern: /(the file|this file|the code|this code) (contains|includes|has|shows)/gi,
                type: 'hallucination' as const,
                message: 'AI makes claims about file content without verification'
            },
            {
                pattern: /(i have|i've) (checked|verified|confirmed|validated|tested)/gi,
                type: 'hallucination' as const,
                message: 'AI claims to have verified something without evidence'
            },
            {
                pattern: /(the project|this project|the workspace) (has|contains|includes)/gi,
                type: 'hallucination' as const,
                message: 'AI makes claims about project structure without verification'
            },
            {
                pattern: /(i found|i discovered|i located|i identified)/gi,
                type: 'hallucination' as const,
                message: 'AI claims to have discovered something without evidence'
            }
        ];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            for (const pattern of hallucinationPatterns) {
                if (pattern.pattern.test(line)) {
                    result.warnings.push({
                        type: 'quality',
                        message: pattern.message,
                        line: i + 1,
                        category: pattern.type,
                        timestamp: new Date()
                    });
                }
            }
        }

        return result;
    }

    /**
     * Validates code blocks for potential issues
     */
    private validateCodeBlocks(lines: string[]): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            timestamp: new Date()
        };

        let inCodeBlock = false;
        let codeBlockStart = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for code block start
            const codeBlockMatch = line.match(/^```(\w+)?$/);
            if (codeBlockMatch) {
                if (!inCodeBlock) {
                    inCodeBlock = true;
                    codeBlockStart = i + 1;
                } else {
                    // Code block end
                    inCodeBlock = false;
                    
                    // Validate code block content
                    const codeLines = lines.slice(codeBlockStart, i);
                    const codeValidation = this.validateCodeContent(codeLines);
                    result.errors.push(...codeValidation.errors);
                    result.warnings.push(...codeValidation.warnings);
                    result.suggestions.push(...codeValidation.suggestions);
                }
            }
        }

        return result;
    }

    /**
     * Validates code content within code blocks
     */
    private validateCodeContent(codeLines: string[]): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            timestamp: new Date()
        };

        // Check for suspicious patterns in code
        const suspiciousPatterns = [
            {
                pattern: /console\.log\(/g,
                message: 'Debug code detected - consider removing console.log statements',
                severity: 'warning' as const
            },
            {
                pattern: /TODO|FIXME|HACK|XXX/g,
                message: 'Code contains TODO/FIXME comments that need attention',
                severity: 'warning' as const
            },
            {
                pattern: /password|secret|key|token/gi,
                message: 'Potential sensitive information detected in code',
                severity: 'error' as const
            }
        ];

        for (let i = 0; i < codeLines.length; i++) {
            const line = codeLines[i];
            
            for (const pattern of suspiciousPatterns) {
                if (pattern.pattern.test(line)) {
                    const validationItem = {
                        type: 'CODE_ISSUE',
                        message: pattern.message,
                        line: i + 1,
                        severity: pattern.severity,
                        category: 'code_issue',
                        timestamp: new Date()
                    };
                    
                    if (pattern.severity === 'error') {
                        result.errors.push(validationItem as ValidationError);
                    } else {
                        result.warnings.push(validationItem as ValidationWarning);
                    }
                }
            }
        }

        return result;
    }

    /**
     * Validates file references mentioned in chat
     */
    private async validateFileReferences(lines: string[]): Promise<ValidationResult> {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            timestamp: new Date()
        };

        const filePatterns = [
            /`([^`]+\.(js|ts|jsx|tsx|py|java|cpp|c|h|json|xml|yaml|yml|md|txt|css|html))`/g,
            /"([^"]+\.(js|ts|jsx|tsx|py|java|cpp|c|h|json|xml|yaml|yml|md|txt|css|html))"/g,
            /'([^']+\.(js|ts|jsx|tsx|py|java|cpp|c|h|json|xml|yaml|yml|md|txt|css|html))'/g
        ];

        const mentionedFiles = new Set<string>();

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            for (const pattern of filePatterns) {
                let match;
                while ((match = pattern.exec(line)) !== null) {
                    mentionedFiles.add(match[1]);
                }
            }
        }

        // Check if mentioned files actually exist
        for (const filePath of mentionedFiles) {
            try {
                const exists = await vscode.workspace.fs.stat(vscode.Uri.file(filePath)).then(
                    () => true,
                    () => false
                );
                
                if (!exists) {
                    result.warnings.push({
                        type: 'quality',
                        message: `File mentioned but not found: ${filePath}`,
                        line: 1,
                        category: 'file_not_found',
                        timestamp: new Date()
                    });
                }
            } catch (error) {
                result.warnings.push({
                    type: 'quality',
                    message: `Error checking file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    line: 1,
                    category: 'file_check_error',
                    timestamp: new Date()
                });
            }
        }

        return result;
    }

    /**
     * Validates command claims mentioned in chat
     */
    private async validateCommandClaims(lines: string[]): Promise<ValidationResult> {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            timestamp: new Date()
        };

        const commandPatterns = [
            /`([^`]+)`/g,
            /"([^"]+)"/g,
            /'([^']+)'/g
        ];

        const mentionedCommands = new Set<string>();

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            for (const pattern of commandPatterns) {
                let match;
                while ((match = pattern.exec(line)) !== null) {
                    const command = match[1].trim();
                    if (command.includes(' ') || command.includes('/') || command.includes('\\')) {
                        mentionedCommands.add(command);
                    }
                }
            }
        }

        // For now, just warn about command validation
        for (const command of mentionedCommands) {
            result.warnings.push({
                type: 'quality',
                message: `Command may be invalid or unavailable: ${command}`,
                line: 1,
                category: 'invalid_command',
                timestamp: new Date()
            });
        }

        return result;
    }

    /**
     * Performs proactive file validation to detect filesystem-related hallucinations
     */
    private async performProactiveFileValidation(lines: string[]): Promise<ValidationResult> {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            timestamp: new Date()
        };

        try {
            // Extract file claims from chat content
            const fileClaims = this.extractFileClaims(lines);
            
            // Validate each claim against the actual filesystem
            for (const claim of fileClaims) {
                const validation = await this.validateFileClaim(claim);
                result.errors.push(...validation.errors);
                result.warnings.push(...validation.warnings);
                result.suggestions.push(...validation.suggestions);
            }

            // Check for suspicious filesystem patterns
            const suspiciousPatterns = this.detectSuspiciousFilesystemPatterns(lines);
            result.warnings.push(...suspiciousPatterns);

        } catch (error) {
            result.errors.push({
                type: 'quality',
                message: `Proactive validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                line: 1,
                severity: 'error',
                category: 'proactive_validation_error',
                timestamp: new Date()
            });
        }

        return result;
    }

    /**
     * Extracts file claims from chat content
     */
    private extractFileClaims(lines: string[]): FileClaim[] {
        const claims: FileClaim[] = [];
        
        const claimPatterns = [
            {
                pattern: /(i have|i've|i created|i made|i generated) (a|an|the) (file|folder|directory) (called|named|at) ["`']([^"`']+)["`']/gi,
                type: 'CREATION' as const
            },
            {
                pattern: /(the file|this file|the folder|this folder) ["`']([^"`']+)["`'] (exists|is present|has been created|was created)/gi,
                type: 'EXISTENCE' as const
            },
            {
                pattern: /(i modified|i updated|i changed|i edited) (the file|this file) ["`']([^"`']+)["`']/gi,
                type: 'MODIFICATION' as const
            },
            {
                pattern: /(file|folder|directory) ["`']([^"`']+)["`'] (contains|includes|has) (the following|this content|these changes)/gi,
                type: 'CONTENT' as const
            }
        ];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            for (const pattern of claimPatterns) {
                let match;
                while ((match = pattern.pattern.exec(line)) !== null) {
                    const filePath = match[4] || match[2] || match[3];
                    claims.push({
                        type: pattern.type,
                        filePath: filePath.trim(),
                        line: i + 1,
                        context: line.trim(),
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }

        return claims;
    }

    /**
     * Validates a single file claim against the actual filesystem
     */
    private async validateFileClaim(claim: FileClaim): Promise<ValidationResult> {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            timestamp: new Date()
        };

        try {
            const fileUri = vscode.Uri.file(claim.filePath);
            const exists = await vscode.workspace.fs.stat(fileUri).then(
                () => true,
                () => false
            );

            if (claim.type === 'CREATION' || claim.type === 'EXISTENCE') {
                if (!exists) {
                    result.errors.push({
                        type: 'hallucination',
                        message: `AI claimed ${claim.type.toLowerCase()} of file "${claim.filePath}" but file does not exist`,
                        line: claim.line,
                        severity: 'error',
                        category: 'filesystem_hallucination',
                        timestamp: new Date()
                    });
                }
            }

            if (claim.type === 'MODIFICATION' && exists) {
                // Check if file was recently modified
                const stats = await vscode.workspace.fs.stat(fileUri);
                const lastModified = new Date(stats.mtime);
                const now = new Date();
                const timeDiff = now.getTime() - lastModified.getTime();
                
                if (timeDiff > 5 * 60 * 1000) { // 5 minutes
                    result.warnings.push({
                        type: 'quality',
                        message: `AI claimed to modify "${claim.filePath}" but file was last modified ${Math.round(timeDiff / 1000 / 60)} minutes ago`,
                        line: claim.line,
                        category: 'modification_timing',
                        timestamp: new Date()
                    });
                }
            }

        } catch (error) {
            result.warnings.push({
                type: 'quality',
                message: `Error validating file claim: ${error instanceof Error ? error.message : 'Unknown error'}`,
                line: claim.line,
                category: 'file_validation_error',
                timestamp: new Date()
            });
        }

        return result;
    }

    /**
     * Detects suspicious filesystem-related patterns
     */
    private detectSuspiciousFilesystemPatterns(lines: string[]): ValidationWarning[] {
        const warnings: ValidationWarning[] = [];
        
        const suspiciousPatterns = [
            {
                pattern: /(i can see|i can find|i found|i located) (the file|this file|the folder|this folder)/gi,
                message: 'AI claims to have found files without providing evidence'
            },
            {
                pattern: /(the file|this file|the folder|this folder) (should be|ought to be|must be) (at|in|under)/gi,
                message: 'AI makes assumptions about file locations without verification'
            },
            {
                pattern: /(i have|i've) (created|made|generated) (all|several|multiple) (files|folders)/gi,
                message: 'AI claims to have created multiple files without listing them'
            },
            {
                pattern: /(the project|this project|the workspace) (structure|layout|organization) (is|looks like|contains)/gi,
                message: 'AI makes claims about project structure without verification'
            }
        ];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            for (const pattern of suspiciousPatterns) {
                if (pattern.pattern.test(line)) {
                    warnings.push({
                        type: 'quality',
                        message: pattern.message,
                        line: i + 1,
                        category: 'suspicious_filesystem_pattern',
                        timestamp: new Date()
                    });
                }
            }
        }

        return warnings;
    }

    /**
     * Analyzes code for technical debt indicators
     */
    private analyzeCodeForTechDebt(code: string): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            timestamp: new Date()
        };

        // Analyze code complexity
        const complexityWarnings = this.checkCodeComplexity(code.split('\n'));
        result.warnings.push(...complexityWarnings);

        // Detect code smells
        const smellWarnings = this.detectCodeSmells(code.split('\n'));
        result.warnings.push(...smellWarnings);

        // Check maintainability
        const maintainabilityWarnings = this.checkMaintainability(code.split('\n'));
        result.warnings.push(...maintainabilityWarnings);

        // Check performance issues
        const performanceWarnings = this.checkPerformanceIssues(code.split('\n'));
        result.warnings.push(...performanceWarnings);

        // Check security debt
        const securityErrors = this.checkSecurityDebt(code.split('\n'));
        result.errors.push(...securityErrors);

        // Analyze file structure
        const structureResult = this.analyzeFileStructure(code.split('\n'));
        result.errors.push(...structureResult.errors);
        result.warnings.push(...structureResult.warnings);
        result.suggestions.push(...structureResult.suggestions);

        return result;
    }

    /**
     * Checks code complexity indicators
     */
    private checkCodeComplexity(lines: string[]): ValidationWarning[] {
        const warnings: ValidationWarning[] = [];
        let functionDepth = 0;
        let maxDepth = 0;
        let currentFunctionLines = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Track function depth
            if (line.includes('{') && !line.includes('}')) {
                functionDepth++;
                maxDepth = Math.max(maxDepth, functionDepth);
            }
            if (line.includes('}') && !line.includes('{')) {
                functionDepth--;
                if (functionDepth === 0) {
                    if (currentFunctionLines > 50) {
                        warnings.push({
                            type: 'maintainability',
                            message: `Long function detected (${currentFunctionLines} lines). Consider breaking it into smaller functions.`,
                            line: i + 1,
                            category: 'long_function',
                            timestamp: new Date()
                        });
                    }
                    currentFunctionLines = 0;
                }
            }

            if (functionDepth > 0) {
                currentFunctionLines++;
            }

            // Check for deeply nested conditions
            if (functionDepth > 4) {
                warnings.push({
                    type: 'maintainability',
                    message: `Deep nesting detected (depth: ${functionDepth}). Consider refactoring to reduce complexity.`,
                    line: i + 1,
                    category: 'deep_nesting',
                    timestamp: new Date()
                });
            }
        }

        if (maxDepth > 5) {
            warnings.push({
                type: 'maintainability',
                message: `High cyclomatic complexity detected. Consider simplifying the code structure.`,
                line: 1,
                category: 'high_complexity',
                timestamp: new Date()
            });
        }

        return warnings;
    }

    /**
     * Detects common code smells
     */
    private detectCodeSmells(lines: string[]): ValidationWarning[] {
        const warnings: ValidationWarning[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Duplicate code patterns
            if (line.includes('TODO') || line.includes('FIXME') || line.includes('HACK')) {
                warnings.push({
                    type: 'quality',
                    message: `Code smell: ${line.includes('TODO') ? 'TODO' : line.includes('FIXME') ? 'FIXME' : 'HACK'} comment indicates technical debt`,
                    line: i + 1,
                    category: 'code_smell',
                    timestamp: new Date()
                });
            }

            // Magic numbers
            if (/\b\d{3,}\b/.test(line) && !line.includes('//') && !line.includes('/*')) {
                warnings.push({
                    type: 'maintainability',
                    message: 'Magic number detected. Consider using named constants.',
                    line: i + 1,
                    category: 'magic_number',
                    timestamp: new Date()
                });
            }

            // Long lines
            if (line.length > 120) {
                warnings.push({
                    type: 'style',
                    message: `Long line detected (${line.length} characters). Consider breaking it into multiple lines.`,
                    line: i + 1,
                    category: 'long_line',
                    timestamp: new Date()
                });
            }

            // Dead code patterns
            if (line.includes('console.log') || line.includes('debugger')) {
                warnings.push({
                    type: 'quality',
                    message: 'Debug code detected. Remove before production.',
                    line: i + 1,
                    category: 'dead_code',
                    timestamp: new Date()
                });
            }
        }

        return warnings;
    }

    /**
     * Checks maintainability issues
     */
    private checkMaintainability(lines: string[]): ValidationWarning[] {
        const warnings: ValidationWarning[] = [];
        let commentRatio = 0;
        let codeLines = 0;
        let commentLines = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line && !line.startsWith('//') && !line.startsWith('/*') && !line.includes('*')) {
                codeLines++;
            } else if (line.startsWith('//') || line.startsWith('/*') || line.includes('*')) {
                commentLines++;
            }
        }

        commentRatio = commentLines / (codeLines + commentLines);

        if (commentRatio < 0.1) {
            warnings.push({
                type: 'maintainability',
                message: 'Low comment ratio detected. Consider adding more documentation.',
                line: 1,
                category: 'low_documentation',
                timestamp: new Date()
            });
        }

        if (commentRatio > 0.5) {
            warnings.push({
                type: 'maintainability',
                message: 'High comment ratio detected. Consider if code could be self-documenting.',
                line: 1,
                category: 'over_documentation',
                timestamp: new Date()
            });
        }

        return warnings;
    }

    /**
     * Checks for performance issues
     */
    private checkPerformanceIssues(lines: string[]): ValidationWarning[] {
        const warnings: ValidationWarning[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Inefficient patterns
            if (line.includes('innerHTML') && !line.includes('//')) {
                warnings.push({
                    type: 'performance',
                    message: 'innerHTML usage detected. Consider using textContent for better performance and security.',
                    line: i + 1,
                    category: 'inefficient_dom_manipulation',
                    timestamp: new Date()
                });
            }

            if (line.includes('eval(') || line.includes('Function(')) {
                warnings.push({
                    type: 'performance',
                    message: 'eval() or Function() constructor detected. These are performance and security risks.',
                    line: i + 1,
                    category: 'eval_usage',
                    timestamp: new Date()
                });
            }

            // Memory leaks
            if (line.includes('addEventListener') && !line.includes('removeEventListener')) {
                warnings.push({
                    type: 'performance',
                    message: 'Event listener added without removal. Potential memory leak.',
                    line: i + 1,
                    category: 'memory_leak',
                    timestamp: new Date()
                });
            }
        }

        return warnings;
    }

    /**
     * Checks for security debt
     */
    private checkSecurityDebt(lines: string[]): ValidationError[] {
        const errors: ValidationError[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // SQL injection patterns
            if (line.includes('SELECT') && line.includes('${') && !line.includes('//')) {
                errors.push({
                    type: 'security',
                    message: 'Potential SQL injection detected. Use parameterized queries.',
                    line: i + 1,
                    severity: 'error',
                    category: 'sql_injection',
                    timestamp: new Date()
                });
            }

            // XSS patterns
            if (line.includes('innerHTML') && line.includes('${') && !line.includes('//')) {
                errors.push({
                    type: 'security',
                    message: 'Potential XSS vulnerability detected. Sanitize user input.',
                    line: i + 1,
                    severity: 'error',
                    category: 'xss_vulnerability',
                    timestamp: new Date()
                });
            }

            // Hardcoded secrets
            if (line.includes('password') || line.includes('secret') || line.includes('key') || line.includes('token')) {
                if (line.includes('=') && line.includes('"') && !line.includes('//')) {
                    errors.push({
                        type: 'security',
                        message: 'Hardcoded secret detected. Use environment variables.',
                        line: i + 1,
                        severity: 'error',
                        category: 'hardcoded_secret',
                        timestamp: new Date()
                    });
                }
            }
        }

        return errors;
    }

    /**
     * Analyzes overall file structure for tech debt
     */
    private analyzeFileStructure(lines: string[]): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            timestamp: new Date()
        };

        // Check file size
        if (lines.length > 1000) {
            result.warnings.push({
                type: 'maintainability',
                message: `Large file detected (${lines.length} lines). Consider splitting into smaller modules.`,
                line: 1,
                category: 'large_file',
                timestamp: new Date()
            });
        }

        // Check for consistent formatting
        let inconsistentIndentation = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.length > 0 && !line.startsWith(' ') && !line.startsWith('\t')) {
                // Check if previous line was indented
                if (i > 0 && (lines[i-1].startsWith(' ') || lines[i-1].startsWith('\t'))) {
                    inconsistentIndentation++;
                }
            }
        }

        if (inconsistentIndentation > 5) {
            result.warnings.push({
                type: 'style',
                message: 'Inconsistent indentation detected. Consider using a formatter.',
                line: 1,
                category: 'inconsistent_formatting',
                timestamp: new Date()
            });
        }

        return result;
    }

    /**
     * Extracts code blocks from content
     */
    private extractCodeBlocks(content: string): string[] {
        const codeBlocks: string[] = [];
        const codeBlockRegex = /```[\s\S]*?```/g;
        let match;
        
        while ((match = codeBlockRegex.exec(content)) !== null) {
            codeBlocks.push(match[0]);
        }
        
        return codeBlocks;
    }

    /**
     * Finds line number for a given text in content
     */
    private findLineNumber(content: string, searchText: string): number | undefined {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(searchText)) {
                return i + 1;
            }
        }
        return undefined;
    }

    /**
     * Tracks command execution for validation purposes
     */
    public trackCommandExecution(command: string, output?: string, exitCode?: number): void {
        try {
            // Store command execution data for later validation
            const executionData = {
                command,
                output: output || '',
                exitCode: exitCode || 0,
                timestamp: new Date().toISOString(),
                success: exitCode === 0
            };

            // Log the execution for debugging
            this.logger.info(`Command executed: ${command} (exit code: ${exitCode})`);
            
            // In a real implementation, you might store this in a database or file
            // For now, we'll just log it
            this.logger.debug('Command execution data:', executionData);
            
        } catch (error) {
            this.logger.error('Error tracking command execution', error);
        }
    }
}
