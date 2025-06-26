/// <reference types="node" />
// ===============================
// INACTIVE/DEPRECATED MODULE
// This file is not used in the current sprint-based workflow.
// Kept for reference; may be reactivated in the future.
// ===============================
// PMP Project Plan Manager
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';
import { Task, TaskStatus, TaskPriority } from './types';

// Add Node.js types reference
/// <reference types="node" />

// Use built-in fetch or node-fetch as fallback
let fetch: any;
try {
    // Try to use global fetch first (available in newer Node.js versions)
    fetch = (globalThis as any).fetch;
} catch {
    // Fallback to node-fetch
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    fetch = require('node-fetch');
}

export interface PMPProjectPlan {
    id: string;
    name: string;
    description: string;
    projectManager: string;
    startDate: Date;
    endDate: Date;
    phases: PMPPhase[];
    stakeholders: string[];
    risks: PMPRisk[];
    constraints: string[];
    assumptions: string[];
    version: string;
    lastUpdated: Date;
}

export interface PMPPhase {
    id: string;
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    tasks: Task[];
    deliverables: string[];
    dependencies: string[];
    status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
}

export interface PMPRisk {
    id: string;
    description: string;
    probability: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
    owner: string;
    status: 'open' | 'mitigated' | 'closed';
}

export interface ImportSource {
    type: 'cursor_rule' | 'file' | 'ai_parsed' | 'extension';
    source: string;
    format?: string;
    confidence?: number;
}

export class PMPProjectPlanManager {
    private readonly logger: Logger;
    private readonly workspaceRoot: string;
    private readonly projectFile: string;

    constructor(logger: Logger) {
        this.logger = logger;
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        this.projectFile = path.join(this.workspaceRoot, '.failsafe', 'pmp-project.json');
    }

    /**
     * Main entry point for importing project plans
     */
    public async importProjectPlan(source: ImportSource): Promise<PMPProjectPlan | null> {
        try {
            switch (source.type) {
                case 'cursor_rule':
                    return await this.importFromCursorRule(source.source);
                case 'file':
                    return await this.importFromFile(source.source, source.format);
                case 'ai_parsed':
                    return await this.importFromAIParsed(source.source);
                case 'extension':
                    return await this.importFromExtension(source.source);
                default:
                    throw new Error(`Unsupported import source type: ${source.type}`);
            }
        } catch (error) {
            this.logger.error('Failed to import project plan', error);
            return null;
        }
    }

    /**
     * Import project plan using cursor rules
     */
    private async importFromCursorRule(ruleContent: string): Promise<PMPProjectPlan> {
        this.logger.info('Importing project plan from cursor rule');
        
        const planData = this.parseCursorRuleContent(ruleContent);
        const pmpPlan = this.structureAsPMPPlan(planData);
        await this.savePMPProject(pmpPlan);
        
        return pmpPlan;
    }

    /**
     * Import project plan from various file formats
     */
    private async importFromFile(filePath: string, format?: string): Promise<PMPProjectPlan> {
        this.logger.info(`Importing project plan from file: ${filePath}`);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf8');
        let planData: any;

        switch (format?.toLowerCase()) {
            case 'json':
                planData = JSON.parse(content);
                break;
            case 'yaml':
            case 'yml':
                planData = this.parseYAMLContent(content);
                break;
            case 'markdown':
            case 'md':
                planData = this.parseMarkdownContent(content);
                break;
            case 'csv':
                planData = this.parseCSVContent(content);
                break;
            default:
                planData = this.autoDetectAndParse(content);
        }

        const pmpPlan = this.structureAsPMPPlan(planData);
        await this.savePMPProject(pmpPlan);
        
        return pmpPlan;
    }

    /**
     * Import project plan using AI parsing
     */
    private async importFromAIParsed(content: string): Promise<PMPProjectPlan> {
        this.logger.info('Importing project plan using AI parsing');
        
        const aiParsedData = await this.parseWithAI(content);
        const pmpPlan = this.structureAsPMPPlan(aiParsedData);
        
        await this.savePMPProject(pmpPlan);
        return pmpPlan;
    }

    /**
     * Import project plan from external extension
     */
    private async importFromExtension(extensionId: string): Promise<PMPProjectPlan> {
        this.logger.info(`Importing project plan from extension: ${extensionId}`);
        
        const extension = vscode.extensions.getExtension(extensionId);
        if (!extension) {
            throw new Error(`Extension not found: ${extensionId}`);
        }

        const projectData = await this.requestFromExtension(extensionId);
        const pmpPlan = this.structureAsPMPPlan(projectData);
        
        await this.savePMPProject(pmpPlan);
        return pmpPlan;
    }

    /**
     * Parse cursor rule content to extract project plan
     */
    private parseCursorRuleContent(content: string): any {
        const planData: any = {
            name: '',
            description: '',
            tasks: [],
            phases: []
        };

        const nameMatch = content.match(/project[:\s]+([^\n]+)/i);
        if (nameMatch) {
            planData.name = nameMatch[1].trim();
        }

        const taskMatches = content.matchAll(/-?\s*(\w+)[:\s]+([^\n]+)/g);
        for (const match of taskMatches) {
            const taskName = match[1].trim();
            const taskDesc = match[2].trim();
            
            if (taskName.toLowerCase().includes('task') || 
                taskName.toLowerCase().includes('feature') ||
                taskName.toLowerCase().includes('requirement')) {
                planData.tasks.push({
                    id: this.generateTaskId(taskName),
                    name: taskName,
                    description: taskDesc,
                    status: TaskStatus.notStarted,
                    startTime: new Date(),
                    endTime: undefined,
                    estimatedDuration: 60,
                    dependencies: [],
                    blockers: [],
                    priority: TaskPriority.medium
                });
            }
        }

        return planData;
    }

    /**
     * Parse YAML content (basic implementation)
     */
    private parseYAMLContent(content: string): any {
        const lines = content.split('\n');
        const data: any = {};
        let currentKey = '';
        let currentValue = '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('#') || trimmed === '') continue;

            const colonIndex = trimmed.indexOf(':');
            if (colonIndex > 0) {
                if (currentKey && currentValue) {
                    data[currentKey] = currentValue.trim();
                }
                currentKey = trimmed.substring(0, colonIndex).trim();
                currentValue = trimmed.substring(colonIndex + 1).trim();
            } else if (currentKey) {
                currentValue += ' ' + trimmed;
            }
        }

        if (currentKey && currentValue) {
            data[currentKey] = currentValue.trim();
        }

        return data;
    }

    /**
     * Parse Markdown content
     */
    private parseMarkdownContent(content: string): any {
        const data: any = {
            name: '',
            description: '',
            tasks: [],
            phases: []
        };

        const lines = content.split('\n');
        let currentSection = '';

        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('# ')) {
                data.name = trimmed.substring(2).trim();
            }
            else if (trimmed.startsWith('## ')) {
                currentSection = trimmed.substring(3).trim().toLowerCase();
            }
            else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const taskText = trimmed.substring(2).trim();
                if (taskText) {
                    data.tasks.push({
                        id: this.generateTaskId(taskText),
                        name: taskText,
                        description: taskText,
                        status: TaskStatus.notStarted,
                        startTime: new Date(),
                        endTime: undefined,
                        estimatedDuration: 60,
                        dependencies: [],
                        blockers: [],
                        priority: TaskPriority.medium
                    });
                }
            }
        }

        return data;
    }

    /**
     * Parse CSV content
     */
    private parseCSVContent(content: string): any {
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const data: any = {
            name: 'Imported Project',
            tasks: []
        };

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length >= headers.length) {
                const task: any = {
                    id: this.generateTaskId(values[0] || `task-${i}`),
                    name: values[0] || `Task ${i}`,
                    description: values[1] || '',
                    status: TaskStatus.notStarted,
                    startTime: new Date(),
                    endTime: undefined,
                    estimatedDuration: parseInt(values[2]) || 60,
                    dependencies: [],
                    blockers: [],
                    priority: this.parsePriority(values[3])
                };
                data.tasks.push(task);
            }
        }

        return data;
    }

    /**
     * Auto-detect and parse content format
     */
    private autoDetectAndParse(content: string): any {
        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
            return JSON.parse(content);
        } else if (content.includes('---') || content.includes(':')) {
            return this.parseYAMLContent(content);
        } else if (content.includes('#') || content.includes('- ')) {
            return this.parseMarkdownContent(content);
        } else if (content.includes(',')) {
            return this.parseCSVContent(content);
        } else {
            return this.parseCursorRuleContent(content);
        }
    }

    /**
     * Parse project plan using AI parsing
     */
    public async parseWithAI(content: string): Promise<any> {
        this.logger.info('Starting AI parsing of project plan content');
        
        try {
            // Check if AI integration is configured
            const config = vscode.workspace.getConfiguration('failsafe');
            const aiEnabled = config.get('aiIntegration.enabled', false);
            
            if (!aiEnabled) {
                this.logger.warn('AI integration is disabled. Using fallback parsing.');
                return this.fallbackAIParsing(content);
            }

            // Get AI configuration
            const aiProvider = config.get('aiIntegration.provider', 'openai');
            const apiKey = config.get('aiIntegration.apiKey', '');
            
            if (!apiKey) {
                this.logger.warn('No AI API key configured. Using fallback parsing.');
                return this.fallbackAIParsing(content);
            }

            // Create AI prompt for project plan parsing
            const prompt = this.createAIPrompt(content);
            
            // Call AI service based on provider
            let aiResponse: string;
            switch (aiProvider.toLowerCase()) {
                case 'openai':
                    aiResponse = await this.callOpenAI(apiKey, prompt);
                    break;
                case 'claude':
                    aiResponse = await this.callClaude(apiKey, prompt);
                    break;
                case 'localai':
                    aiResponse = await this.callLocalAI(apiKey, prompt);
                    break;
                default:
                    this.logger.warn(`Unsupported AI provider: ${aiProvider}. Using fallback parsing.`);
                    return this.fallbackAIParsing(content);
            }

            // Parse AI response
            const parsedData = this.parseAIResponse(aiResponse);
            
            this.logger.info('AI parsing completed successfully', { 
                contentLength: content.length, 
                parsedTasks: parsedData.tasks?.length || 0 
            });
            
            return parsedData;

        } catch (error) {
            this.logger.error('AI parsing failed, using fallback', error);
            return this.fallbackAIParsing(content);
        }
    }

    /**
     * Create AI prompt for project plan parsing
     */
    private createAIPrompt(content: string): string {
        return `Please analyze the following project content and extract a structured project plan. 

Content to analyze:
${content}

Please return a JSON object with the following structure:
{
  "name": "Project name",
  "description": "Project description",
  "projectManager": "Project manager name",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "tasks": [
    {
      "name": "Task name",
      "description": "Task description",
      "priority": "critical|high|medium|low",
      "estimatedDuration": 60,
      "dependencies": [],
      "acceptanceCriteria": []
    }
  ],
  "stakeholders": ["stakeholder1", "stakeholder2"],
  "risks": [
    {
      "description": "Risk description",
      "probability": "low|medium|high",
      "impact": "low|medium|high",
      "mitigation": "Mitigation strategy"
    }
  ],
  "constraints": ["constraint1", "constraint2"],
  "assumptions": ["assumption1", "assumption2"]
}

Focus on:
1. Identifying clear tasks and their priorities
2. Estimating realistic durations
3. Identifying dependencies between tasks
4. Recognizing potential risks and constraints
5. Extracting stakeholder information

Return only valid JSON without any additional text.`;
    }

    /**
     * Call OpenAI API
     */
    private async callOpenAI(apiKey: string, prompt: string): Promise<string> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a project management expert. Extract structured project plans from content.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * Call Claude API
     */
    private async callClaude(apiKey: string, prompt: string): Promise<string> {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 2000,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.content[0].text;
    }

    /**
     * Call LocalAI API
     */
    private async callLocalAI(apiKey: string, prompt: string): Promise<string> {
        const response = await fetch('http://localhost:8080/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a project management expert. Extract structured project plans from content.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            throw new Error(`LocalAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * Parse AI response into structured data
     */
    private parseAIResponse(aiResponse: string): any {
        try {
            // Try to extract JSON from the response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const jsonStr = jsonMatch[0];
                const parsed = JSON.parse(jsonStr);
                
                // Validate and normalize the parsed data
                return this.normalizeAIParsedData(parsed);
            } else {
                throw new Error('No JSON found in AI response');
            }
        } catch (error) {
            this.logger.error('Failed to parse AI response', error);
            throw new Error('Invalid AI response format');
        }
    }

    /**
     * Normalize AI parsed data to ensure consistency
     */
    private normalizeAIParsedData(data: any): any {
        const normalized: any = {
            name: data.name || 'AI Parsed Project',
            description: data.description || 'Project plan parsed using AI',
            projectManager: data.projectManager || 'User',
            startDate: data.startDate ? new Date(data.startDate) : new Date(),
            endDate: data.endDate ? new Date(data.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            tasks: [],
            stakeholders: data.stakeholders || [],
            risks: data.risks || [],
            constraints: data.constraints || [],
            assumptions: data.assumptions || []
        };

        // Normalize tasks
        if (data.tasks && Array.isArray(data.tasks)) {
            normalized.tasks = data.tasks.map((task: any, index: number) => ({
                id: task.id || `ai-task-${index + 1}`,
                name: task.name || `Task ${index + 1}`,
                description: task.description || '',
                status: TaskStatus.notStarted,
                startTime: new Date(),
                endTime: undefined,
                estimatedDuration: task.estimatedDuration || 60,
                dependencies: task.dependencies || [],
                blockers: [],
                priority: this.parsePriority(task.priority),
                acceptanceCriteria: task.acceptanceCriteria || []
            }));
        }

        // Normalize risks
        if (data.risks && Array.isArray(data.risks)) {
            normalized.risks = data.risks.map((risk: any, index: number) => ({
                id: risk.id || `risk-${index + 1}`,
                description: risk.description || '',
                probability: risk.probability || 'medium',
                impact: risk.impact || 'medium',
                mitigation: risk.mitigation || '',
                owner: risk.owner || 'Team',
                status: 'open'
            }));
        }

        return normalized;
    }

    /**
     * Fallback parsing when AI is not available
     */
    private fallbackAIParsing(content: string): any {
        this.logger.info('Using fallback parsing for project plan');
        
        const tasks: any[] = [];
        const lines = content.split('\n');
        
        // Extract tasks from content
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (trimmed && (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed))) {
                const taskName = trimmed.replace(/^[-*\d.\s]+/, '').trim();
                if (taskName) {
                    tasks.push({
                        id: `fallback-task-${index + 1}`,
                        name: taskName,
                        description: `Task extracted from content: ${taskName}`,
                        status: TaskStatus.notStarted,
                        startTime: new Date(),
                        endTime: undefined,
                        estimatedDuration: 60,
                        dependencies: [],
                        blockers: [],
                        priority: TaskPriority.medium,
                        acceptanceCriteria: []
                    });
                }
            }
        });

        return {
            name: 'Fallback Parsed Project',
            description: 'Project plan parsed using fallback method',
            tasks: tasks.length > 0 ? tasks : [{
                id: 'fallback-task-1',
                name: 'Implement Project Features',
                description: 'Default task created by fallback parsing',
                status: TaskStatus.notStarted,
                startTime: new Date(),
                endTime: undefined,
                estimatedDuration: 60,
                dependencies: [],
                blockers: [],
                priority: TaskPriority.medium,
                acceptanceCriteria: []
            }]
        };
    }

    /**
     * Request project data from external extension
     */
    private async requestFromExtension(extensionId: string): Promise<any> {
        this.logger.info(`Requesting project data from extension: ${extensionId}`);
        
        try {
            // Check if extension is installed
            const extension = vscode.extensions.getExtension(extensionId);
            if (!extension) {
                throw new Error(`Extension not found: ${extensionId}`);
            }

            // Try to execute extension command to get project data
            const result = await vscode.commands.executeCommand(`${extensionId}.getProjectData`);
            
            if (result) {
                return result;
            } else {
                // Fallback to basic project structure
                return {
                    name: `Project from ${extensionId}`,
                    description: `Project imported from ${extensionId} extension`,
                    tasks: [{
                        id: 'ext-task-1',
                        name: 'Extension Imported Task',
                        description: 'Task imported from external extension',
                        status: TaskStatus.notStarted,
                        startTime: new Date(),
                        endTime: undefined,
                        estimatedDuration: 60,
                        dependencies: [],
                        blockers: [],
                        priority: TaskPriority.medium,
                        acceptanceCriteria: []
                    }]
                };
            }
        } catch (error) {
            this.logger.error(`Failed to request data from extension ${extensionId}`, error);
            
            // Return fallback data
            return {
                name: `Project from ${extensionId}`,
                description: 'Project imported from external extension (fallback)',
                tasks: [{
                    id: 'ext-fallback-task-1',
                    name: 'Extension Import Task',
                    description: 'Task created from extension import fallback',
                    status: TaskStatus.notStarted,
                    startTime: new Date(),
                    endTime: undefined,
                    estimatedDuration: 60,
                    dependencies: [],
                    blockers: [],
                    priority: TaskPriority.medium,
                    acceptanceCriteria: []
                }]
            };
        }
    }

    /**
     * Structure raw data as PMP-compliant project plan
     */
    private structureAsPMPPlan(data: any): PMPProjectPlan {
        const now = new Date();
        
        return {
            id: this.generateProjectId(),
            name: data.name || 'Imported Project',
            description: data.description || 'Project plan imported into FailSafe',
            projectManager: data.projectManager || 'User',
            startDate: data.startDate ? new Date(data.startDate) : now,
            endDate: data.endDate ? new Date(data.endDate) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
            phases: this.createPhasesFromTasks(data.tasks || []),
            stakeholders: data.stakeholders || [],
            risks: data.risks || [],
            constraints: data.constraints || [],
            assumptions: data.assumptions || [],
            version: '1.0',
            lastUpdated: now
        };
    }

    /**
     * Create PMP phases from tasks
     */
    private createPhasesFromTasks(tasks: Task[]): PMPPhase[] {
        if (tasks.length === 0) {
            return [{
                id: 'phase-1',
                name: 'Project Initiation',
                description: 'Initial project setup and planning',
                startDate: new Date(),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                tasks: [],
                deliverables: ['Project Charter'],
                dependencies: [],
                status: 'not_started'
            }];
        }

        const phases: PMPPhase[] = [];
        const highPriorityTasks = tasks.filter(t => t.priority === TaskPriority.critical || t.priority === TaskPriority.high);
        const mediumPriorityTasks = tasks.filter(t => t.priority === TaskPriority.medium);
        const lowPriorityTasks = tasks.filter(t => t.priority === TaskPriority.low);

        if (highPriorityTasks.length > 0) {
            phases.push({
                id: 'phase-1',
                name: 'Critical Features',
                description: 'High priority features and core functionality',
                startDate: new Date(),
                endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                tasks: highPriorityTasks,
                deliverables: ['Core Features'],
                dependencies: [],
                status: 'not_started'
            });
        }

        if (mediumPriorityTasks.length > 0) {
            phases.push({
                id: 'phase-2',
                name: 'Standard Features',
                description: 'Medium priority features and enhancements',
                startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
                tasks: mediumPriorityTasks,
                deliverables: ['Enhanced Features'],
                dependencies: ['phase-1'],
                status: 'not_started'
            });
        }

        if (lowPriorityTasks.length > 0) {
            phases.push({
                id: 'phase-3',
                name: 'Nice to Have',
                description: 'Low priority features and polish',
                startDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000),
                tasks: lowPriorityTasks,
                deliverables: ['Polish Features'],
                dependencies: ['phase-2'],
                status: 'not_started'
            });
        }

        return phases;
    }

    /**
     * Save PMP project plan to file
     */
    private async savePMPProject(plan: PMPProjectPlan): Promise<void> {
        const failsafeDir = path.dirname(this.projectFile);
        if (!fs.existsSync(failsafeDir)) {
            fs.mkdirSync(failsafeDir, { recursive: true });
        }

        fs.writeFileSync(this.projectFile, JSON.stringify(plan, null, 2));
        this.logger.info('PMP project plan saved', { projectId: plan.id, name: plan.name });
    }

    /**
     * Load PMP project plan from file
     */
    public async loadPMPProject(): Promise<PMPProjectPlan | null> {
        try {
            if (!fs.existsSync(this.projectFile)) {
                return null;
            }

            const content = fs.readFileSync(this.projectFile, 'utf8');
            const data = JSON.parse(content);
            
            if (data.startDate) data.startDate = new Date(data.startDate);
            if (data.endDate) data.endDate = new Date(data.endDate);
            if (data.lastUpdated) data.lastUpdated = new Date(data.lastUpdated);
            
            if (data.phases) {
                data.phases.forEach((phase: PMPPhase) => {
                    if (phase.startDate) phase.startDate = new Date(phase.startDate);
                    if (phase.endDate) phase.endDate = new Date(phase.endDate);
                });
            }

            return data;
        } catch (error) {
            this.logger.error('Failed to load PMP project plan', error);
            return null;
        }
    }

    /**
     * Generate unique project ID
     */
    private generateProjectId(): string {
        return `pmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique task ID
     */
    private generateTaskId(name: string): string {
        const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20);
        return `${sanitized}_${Date.now()}`;
    }

    /**
     * Parse priority from string
     */
    private parsePriority(priorityStr: string): TaskPriority {
        const priority = priorityStr.toLowerCase();
        switch (priority) {
            case 'critical':
            case 'high':
                return TaskPriority.critical;
            case 'medium':
                return TaskPriority.medium;
            case 'low':
                return TaskPriority.low;
            default:
                return TaskPriority.medium;
        }
    }

    /**
     * Get available import sources
     */
    public getAvailableImportSources(): ImportSource[] {
        const sources: ImportSource[] = [];
        
        // Add cursor rule sources
        sources.push({
            type: 'cursor_rule',
            source: 'cursor_rules.json',
            confidence: 0.9
        });
        
        // Add file sources
        const workspaceFiles = vscode.workspace.findFiles('**/*.{json,yaml,yml,md,csv}', '**/node_modules/**');
        workspaceFiles.then(files => {
            files.forEach(file => {
                const ext = path.extname(file.fsPath).toLowerCase();
                let format: string | undefined;
                
                switch (ext) {
                    case '.json':
                        format = 'json';
                        break;
                    case '.yaml':
                    case '.yml':
                        format = 'yaml';
                        break;
                    case '.md':
                        format = 'markdown';
                        break;
                    case '.csv':
                        format = 'csv';
                        break;
                }
                
                if (format) {
                    sources.push({
                        type: 'file',
                        source: file.fsPath,
                        format,
                        confidence: 0.8
                    });
                }
            });
        });
        
        return sources;
    }
}
