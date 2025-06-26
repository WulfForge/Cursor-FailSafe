// Generated TypeScript types for FailSafe API
// Auto-generated from TypeBox schemas

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedHours?: number;
  actualHours?: number;
  dependencies: string[];
  assignee?: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  completedAt?: string;
}

export interface CreateTask {
  name: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedHours?: number;
  actualHours?: number;
  dependencies: string[];
  assignee?: string;
  dueDate?: string;
  completedAt?: string;
}

export interface UpdateTask {
  name?: string;
  description?: string;
  status?: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  estimatedHours?: number;
  actualHours?: number;
  dependencies?: string[];
  assignee?: string;
  updatedAt?: string;
  dueDate?: string;
  completedAt?: string;
}

export interface ProjectPlan {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  tasks: Task[];
  milestones: {
    id: string;
    name: string;
    description: string;
    dueDate: string;
    tasks: string[];
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface Sprint {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  tasks: Task[];
  velocity?: number;
  burndownData: {
    date: string;
    remainingHours: number;
    completedTasks: number;
  }[];
}

export interface DailyMetrics {
  date: string;
  requests: number;
  errors: number;
  validations: number;
  ruleTriggers: number;
  taskEvents: number;
  avgResponseTime: number;
  uniqueUsers: number;
}

export interface MetricsResponse {
  range: string;
  data: DailyMetrics[];
  summary: {
    totalRequests: number;
    totalErrors: number;
    avgResponseTime: number;
    errorRate: number;
    peakDay: string;
    peakRequests: number;
  };
}

export interface FailSafeEvent {
  id: string;
  type: 'validation' | 'rule_trigger' | 'task_event' | 'system' | 'drift' | 'version';
  timestamp: string;
  data: any;
  severity: 'info' | 'warning' | 'critical';
}

export interface RequestLogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ip?: string;
  headers?: Record<string, string>;
  body?: any;
  error?: string;
}

export interface RequestLogResponse {
  requests: RequestLogEntry[];
  stats: {
    total: number;
    errors: number;
    avgResponseTime: number;
    statusCodes: Record<string, number>;
  };
  total: number;
  timestamp: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  timestamp: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  data: ChartDataPoint[];
  options?: Record<string, any>;
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  checks: {
    server: boolean;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    uptime: number;
    timestamp: string;
  };
  responseTime: string;
  version: string;
}

// API Endpoints
export interface ApiEndpoints {
  // Tasks
  'GET /tasks': { response: Task[] };
  'POST /tasks': { body: CreateTask; response: Task };
  'GET /tasks/:id': { params: { id: string }; response: Task };
  'PUT /tasks/:id': { params: { id: string }; body: UpdateTask; response: Task };
  'DELETE /tasks/:id': { params: { id: string }; response: { success: boolean } };
  
  // Project Plans
  'GET /project-plans': { response: ProjectPlan[] };
  'POST /project-plans': { body: Omit<ProjectPlan, 'id' | 'createdAt' | 'updatedAt'>; response: ProjectPlan };
  'GET /project-plans/:id': { params: { id: string }; response: ProjectPlan };
  'PUT /project-plans/:id': { params: { id: string }; body: Partial<ProjectPlan>; response: ProjectPlan };
  
  // Sprints
  'GET /sprints': { response: Sprint[] };
  'POST /sprints': { body: Omit<Sprint, 'id'>; response: Sprint };
  'GET /sprints/:id': { params: { id: string }; response: Sprint };
  'PUT /sprints/:id': { params: { id: string }; body: Partial<Sprint>; response: Sprint };
  
  // Metrics
  'GET /metrics': { query: { range?: '1d' | '7d' | '30d' }; response: MetricsResponse };
  
  // Events
  'GET /events': { response: EventSource };
  'GET /events/recent': { query: { limit?: number; type?: string }; response: { events: FailSafeEvent[]; total: number; limit: number } };
  'POST /events/test': { body: { type?: string; data?: any; severity?: string }; response: { success: boolean; event: FailSafeEvent } };
  
  // Request Logs
  'GET /requests': { query: { limit?: string; status?: string; errors?: string; recent?: string }; response: RequestLogResponse };
  'GET /requests/stats': { response: RequestLogResponse['stats'] };
  'DELETE /requests': { response: { success: boolean; message: string } };
  
  // Health
  'GET /health': { response: HealthResponse };
  
  // Validation
  'POST /validate': { body: any; response: ValidationResult };
  
  // Charts
  'GET /charts/:type': { params: { type: string }; response: ChartData };
} 