export interface Task {
    id: string;
    name: string;
    description: string;
    status: TaskStatus;
    startTime?: Date;
    endTime?: Date;
    estimatedDuration: number; // in minutes
    dependencies: string[];
    blockers: string[];
    priority: TaskPriority;
}

export enum TaskStatus {
    NOT_STARTED = 'not_started',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    BLOCKED = 'blocked',
    DELAYED = 'delayed'
}

export enum TaskPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    suggestions: string[];
}

export interface ValidationError {
    type: 'syntax' | 'safety' | 'hallucination' | 'mock_data' | 'security' | 'performance';
    message: string;
    line?: number;
    column?: number;
    severity: 'error' | 'warning';
    category?: string; // Additional categorization for enhanced analysis
}

export interface ValidationWarning {
    type: 'performance' | 'style' | 'security' | 'maintainability' | 'quality';
    message: string;
    line?: number;
    column?: number;
    category?: string; // Additional categorization for enhanced analysis
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