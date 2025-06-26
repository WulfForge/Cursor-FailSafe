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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PMPProjectPlanManager = void 0;
/// <reference types="node" />
// ===============================
// INACTIVE/DEPRECATED MODULE
// This file is not used in the current sprint-based workflow.
// Kept for reference; may be reactivated in the future.
// ===============================
// PMP Project Plan Manager
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("./types");
// Add Node.js types reference
/// <reference types="node" />
// Use built-in fetch or node-fetch as fallback
let fetch;
try {
    // Try to use global fetch first (available in newer Node.js versions)
    fetch = globalThis.fetch;
}
catch {
    // Fallback to node-fetch
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    fetch = require('node-fetch');
}
class PMPProjectPlanManager {
    constructor(logger) {
        this.logger = logger;
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        this.projectFile = path.join(this.workspaceRoot, '.failsafe', 'pmp-project.json');
    }
    /**
     * Main entry point for importing project plans
     */
    async importProjectPlan(source) {
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
        }
        catch (error) {
            this.logger.error('Failed to import project plan', error);
            return null;
        }
    }
    /**
     * Import project plan using cursor rules
     */
    async importFromCursorRule(ruleContent) {
        this.logger.info('Importing project plan from cursor rule');
        const planData = this.parseCursorRuleContent(ruleContent);
        const pmpPlan = this.structureAsPMPPlan(planData);
        await this.savePMPProject(pmpPlan);
        return pmpPlan;
    }
    /**
     * Import project plan from various file formats
     */
    async importFromFile(filePath, format) {
        this.logger.info(`Importing project plan from file: ${filePath}`);
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        const content = fs.readFileSync(filePath, 'utf8');
        let planData;
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
    async importFromAIParsed(content) {
        this.logger.info('Importing project plan using AI parsing');
        const aiParsedData = await this.parseWithAI(content);
        const pmpPlan = this.structureAsPMPPlan(aiParsedData);
        await this.savePMPProject(pmpPlan);
        return pmpPlan;
    }
    /**
     * Import project plan from external extension
     */
    async importFromExtension(extensionId) {
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
    parseCursorRuleContent(content) {
        const planData = {
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
                    status: types_1.TaskStatus.notStarted,
                    startTime: new Date(),
                    endTime: undefined,
                    estimatedDuration: 60,
                    dependencies: [],
                    blockers: [],
                    priority: types_1.TaskPriority.medium
                });
            }
        }
        return planData;
    }
    /**
     * Parse YAML content (basic implementation)
     */
    parseYAMLContent(content) {
        const lines = content.split('\n');
        const data = {};
        let currentKey = '';
        let currentValue = '';
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('#') || trimmed === '')
                continue;
            const colonIndex = trimmed.indexOf(':');
            if (colonIndex > 0) {
                if (currentKey && currentValue) {
                    data[currentKey] = currentValue.trim();
                }
                currentKey = trimmed.substring(0, colonIndex).trim();
                currentValue = trimmed.substring(colonIndex + 1).trim();
            }
            else if (currentKey) {
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
    parseMarkdownContent(content) {
        const data = {
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
                        status: types_1.TaskStatus.notStarted,
                        startTime: new Date(),
                        endTime: undefined,
                        estimatedDuration: 60,
                        dependencies: [],
                        blockers: [],
                        priority: types_1.TaskPriority.medium
                    });
                }
            }
        }
        return data;
    }
    /**
     * Parse CSV content
     */
    parseCSVContent(content) {
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = {
            name: 'Imported Project',
            tasks: []
        };
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length >= headers.length) {
                const task = {
                    id: this.generateTaskId(values[0] || `task-${i}`),
                    name: values[0] || `Task ${i}`,
                    description: values[1] || '',
                    status: types_1.TaskStatus.notStarted,
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
    autoDetectAndParse(content) {
        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
            return JSON.parse(content);
        }
        else if (content.includes('---') || content.includes(':')) {
            return this.parseYAMLContent(content);
        }
        else if (content.includes('#') || content.includes('- ')) {
            return this.parseMarkdownContent(content);
        }
        else if (content.includes(',')) {
            return this.parseCSVContent(content);
        }
        else {
            return this.parseCursorRuleContent(content);
        }
    }
    /**
     * Parse project plan using AI parsing
     */
    async parseWithAI(content) {
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
            let aiResponse;
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
        }
        catch (error) {
            this.logger.error('AI parsing failed, using fallback', error);
            return this.fallbackAIParsing(content);
        }
    }
    /**
     * Create AI prompt for project plan parsing
     */
    createAIPrompt(content) {
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
    async callOpenAI(apiKey, prompt) {
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
    async callClaude(apiKey, prompt) {
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
    async callLocalAI(apiKey, prompt) {
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
    parseAIResponse(aiResponse) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const jsonStr = jsonMatch[0];
                const parsed = JSON.parse(jsonStr);
                // Validate and normalize the parsed data
                return this.normalizeAIParsedData(parsed);
            }
            else {
                throw new Error('No JSON found in AI response');
            }
        }
        catch (error) {
            this.logger.error('Failed to parse AI response', error);
            throw new Error('Invalid AI response format');
        }
    }
    /**
     * Normalize AI parsed data to ensure consistency
     */
    normalizeAIParsedData(data) {
        const normalized = {
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
            normalized.tasks = data.tasks.map((task, index) => ({
                id: task.id || `ai-task-${index + 1}`,
                name: task.name || `Task ${index + 1}`,
                description: task.description || '',
                status: types_1.TaskStatus.notStarted,
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
            normalized.risks = data.risks.map((risk, index) => ({
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
    fallbackAIParsing(content) {
        this.logger.info('Using fallback parsing for project plan');
        const tasks = [];
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
                        status: types_1.TaskStatus.notStarted,
                        startTime: new Date(),
                        endTime: undefined,
                        estimatedDuration: 60,
                        dependencies: [],
                        blockers: [],
                        priority: types_1.TaskPriority.medium,
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
                    status: types_1.TaskStatus.notStarted,
                    startTime: new Date(),
                    endTime: undefined,
                    estimatedDuration: 60,
                    dependencies: [],
                    blockers: [],
                    priority: types_1.TaskPriority.medium,
                    acceptanceCriteria: []
                }]
        };
    }
    /**
     * Request project data from external extension
     */
    async requestFromExtension(extensionId) {
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
            }
            else {
                // Fallback to basic project structure
                return {
                    name: `Project from ${extensionId}`,
                    description: `Project imported from ${extensionId} extension`,
                    tasks: [{
                            id: 'ext-task-1',
                            name: 'Extension Imported Task',
                            description: 'Task imported from external extension',
                            status: types_1.TaskStatus.notStarted,
                            startTime: new Date(),
                            endTime: undefined,
                            estimatedDuration: 60,
                            dependencies: [],
                            blockers: [],
                            priority: types_1.TaskPriority.medium,
                            acceptanceCriteria: []
                        }]
                };
            }
        }
        catch (error) {
            this.logger.error(`Failed to request data from extension ${extensionId}`, error);
            // Return fallback data
            return {
                name: `Project from ${extensionId}`,
                description: 'Project imported from external extension (fallback)',
                tasks: [{
                        id: 'ext-fallback-task-1',
                        name: 'Extension Import Task',
                        description: 'Task created from extension import fallback',
                        status: types_1.TaskStatus.notStarted,
                        startTime: new Date(),
                        endTime: undefined,
                        estimatedDuration: 60,
                        dependencies: [],
                        blockers: [],
                        priority: types_1.TaskPriority.medium,
                        acceptanceCriteria: []
                    }]
            };
        }
    }
    /**
     * Structure raw data as PMP-compliant project plan
     */
    structureAsPMPPlan(data) {
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
    createPhasesFromTasks(tasks) {
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
        const phases = [];
        const highPriorityTasks = tasks.filter(t => t.priority === types_1.TaskPriority.critical || t.priority === types_1.TaskPriority.high);
        const mediumPriorityTasks = tasks.filter(t => t.priority === types_1.TaskPriority.medium);
        const lowPriorityTasks = tasks.filter(t => t.priority === types_1.TaskPriority.low);
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
    async savePMPProject(plan) {
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
    async loadPMPProject() {
        try {
            if (!fs.existsSync(this.projectFile)) {
                return null;
            }
            const content = fs.readFileSync(this.projectFile, 'utf8');
            const data = JSON.parse(content);
            if (data.startDate)
                data.startDate = new Date(data.startDate);
            if (data.endDate)
                data.endDate = new Date(data.endDate);
            if (data.lastUpdated)
                data.lastUpdated = new Date(data.lastUpdated);
            if (data.phases) {
                data.phases.forEach((phase) => {
                    if (phase.startDate)
                        phase.startDate = new Date(phase.startDate);
                    if (phase.endDate)
                        phase.endDate = new Date(phase.endDate);
                });
            }
            return data;
        }
        catch (error) {
            this.logger.error('Failed to load PMP project plan', error);
            return null;
        }
    }
    /**
     * Generate unique project ID
     */
    generateProjectId() {
        return `pmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Generate unique task ID
     */
    generateTaskId(name) {
        const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20);
        return `${sanitized}_${Date.now()}`;
    }
    /**
     * Parse priority from string
     */
    parsePriority(priorityStr) {
        const priority = priorityStr.toLowerCase();
        switch (priority) {
            case 'critical':
            case 'high':
                return types_1.TaskPriority.critical;
            case 'medium':
                return types_1.TaskPriority.medium;
            case 'low':
                return types_1.TaskPriority.low;
            default:
                return types_1.TaskPriority.medium;
        }
    }
    /**
     * Get available import sources
     */
    getAvailableImportSources() {
        const sources = [];
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
                let format;
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
exports.PMPProjectPlanManager = PMPProjectPlanManager;
//# sourceMappingURL=pmpProjectPlan.js.map