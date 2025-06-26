export interface Task {
    id: string;
    name: string;
    description: string;
    status: TaskStatus;
    startTime?: Date;
    endTime?: Date;
    estimatedDuration: number; // in minutes
    estimatedHours?: number; // in hours (for convenience)
    actualDuration?: number; // in minutes - actual time taken
    dueDate?: Date; // when the task is due
    completionTime?: Date; // when the task was completed
    dependencies: string[];
    blockers: string[];
    priority: TaskPriority;
    parentTaskId?: string; // For subtask relationships
    completedAt?: string;
}

export enum TaskStatus {
    notStarted = 'not_started',
    pending = 'pending',
    inProgress = 'in_progress',
    completed = 'completed',
    blocked = 'blocked',
    delayed = 'delayed'
}

export enum TaskPriority {
    low = 'low',
    medium = 'medium',
    high = 'high',
    critical = 'critical'
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    suggestions: string[];
    timestamp: Date; // When the validation was performed
}

export interface ValidationError {
    type: 'syntax' | 'safety' | 'hallucination' | 'mock_data' | 'security' | 'performance' | 'quality';
    message: string;
    line?: number;
    column?: number;
    severity: 'error' | 'warning';
    category?: string; // Additional categorization for enhanced analysis
    timestamp: Date; // When the error was detected
}

export interface ValidationWarning {
    type: 'performance' | 'style' | 'security' | 'maintainability' | 'quality';
    message: string;
    line?: number;
    column?: number;
    category?: string; // Additional categorization for enhanced analysis
    timestamp: Date; // When the warning was detected
}

export interface TestResult {
    passed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    output: string;
    errors: string[];
    duration: number; // in milliseconds
}

export interface SessionLog {
    id: string;
    timestamp: Date;
    command: string;
    prompt?: string;
    response?: string;
    validationResult?: ValidationResult;
    testResult?: TestResult;
    duration: number;
    status: 'success' | 'timeout' | 'validation_failed' | 'test_failed' | 'error';
    error?: string;
}

export interface ProjectConfig {
    timeout: number;
    validationEnabled: boolean;
    testRunner: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    autoRetry: boolean;
    maxRetries: number;
}

export interface AIRequest {
    prompt: string;
    context?: string;
    timeout?: number;
    validate?: boolean;
    runTests?: boolean;
    requestType?: 'simple' | 'complex' | 'refactor' | 'generate' | 'debug';
    estimatedComplexity?: 'low' | 'medium' | 'high';
}

export interface AIResponse {
    content: string;
    isValid: boolean;
    validationResult?: ValidationResult;
    testResult?: TestResult;
    duration: number;
}

export interface TaskNudge {
    taskId: string;
    type: 'overdue' | 'blocked' | 'stalled' | 'dependency_ready';
    message: string;
    action?: 'retry' | 'skip' | 'mark_complete' | 'explain';
    priority: 'low' | 'medium' | 'high';
}

export interface UIState {
    currentTask?: Task;
    taskList: Task[];
    sessionLogs: SessionLog[];
    status: 'idle' | 'processing' | 'error' | 'warning';
    lastUpdate: Date;
}

export interface TimeoutConfig {
    baseTimeout: number;
    complexityMultipliers: {
        low: number;
        medium: number;
        high: number;
    };
    requestTypeMultipliers: {
        simple: number;
        complex: number;
        refactor: number;
        generate: number;
        debug: number;
    };
    maxTimeout: number;
    minTimeout: number;
}

export interface ChatMessage {
    role: string;
    content: string;
    startLine: number;
    endLine?: number;
    timestamp: Date;
    originalLine?: string;
}

export interface ChatValidationResult {
    severity: 'error' | 'warning' | 'info';
    message: string;
    details?: string;
    recommendation?: string;
    timestamp: Date;
    line?: number;
    category?: string;
}

export interface DesignDocument {
    id: string;
    version: string;
    createdAt: Date;
    updatedAt: Date;
    projectPurpose: string;
    audience: string;
    stylingPrinciples: string;
    themeAffinities: string[];
    keyFeatures: string[];
    requiredBehaviors: string[];
    visualReferences: string[];
    interactionConstraints: string[];
    securityConsiderations: string[];
    complianceRequirements: string[];
    metadata: {
        workspacePath: string;
        cursorVersion?: string;
        extensionVersion: string;
    };
}

export interface DesignDocumentIndex {
    documentId: string;
    version: string;
    lastValidated: Date;
    driftScore: number;
    featureCoverage: {
        [feature: string]: {
            implemented: boolean;
            lastChecked: Date;
            driftDetected: boolean;
        };
    };
}

export interface DesignDocumentValidation {
    isValid: boolean;
    driftDetected: boolean;
    driftScore: number;
    missingFeatures: string[];
    outdatedFeatures: string[];
    recommendations: string[];
}

export interface Event {
    type: 'validation' | 'drift' | 'system' | 'rule_trigger' | 'task_event' | 'version';
    data: Record<string, unknown>;
    severity: 'info' | 'warning' | 'critical';
    timestamp?: string;
} 