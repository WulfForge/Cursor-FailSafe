import { Type, Static } from '@sinclair/typebox';

// Rule schema
const ruleSchema = Type.Object({
    id: Type.String(),
    name: Type.String(),
    category: Type.Union([
        Type.Literal('lint'),
        Type.Literal('security'),
        Type.Literal('style'),
        Type.Literal('custom')
    ]),
    enabled: Type.Boolean(),
    triggerCount: Type.Number(),
    lastTriggered: Type.Optional(Type.String()),
    logic: Type.String()
});

// Sprint schema
const sprintSchema = Type.Object({
    id: Type.String(),
    name: Type.String(),
    start: Type.String(),
    end: Type.String(),
    status: Type.Union([
        Type.Literal('building'),
        Type.Literal('active'),
        Type.Literal('complete')
    ]),
    velocity: Type.Number()
});

// Task schema
const taskSchema = Type.Object({
    id: Type.String(),
    sprintId: Type.String(),
    name: Type.String(),
    status: Type.String(),
    dependsOn: Type.Array(Type.String()),
    completedAt: Type.Optional(Type.String())
});

// Log Entry schema
const logEntrySchema = Type.Object({
    id: Type.String(),
    timestamp: Type.String(),
    level: Type.Union([
        Type.Literal('info'),
        Type.Literal('warning'),
        Type.Literal('error'),
        Type.Literal('debug')
    ]),
    message: Type.String(),
    source: Type.String(),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Any()))
});

// Validation Result schema
const validationResultSchema = Type.Object({
    status: Type.Union([
        Type.Literal('pass'),
        Type.Literal('fail')
    ]),
    results: Type.Array(Type.Object({
        file: Type.String(),
        line: Type.Number(),
        message: Type.String(),
        severity: Type.Union([
            Type.Literal('info'),
            Type.Literal('warning'),
            Type.Literal('error')
        ])
    }))
});

// Metrics schema
const metricsSchema = Type.Object({
    charts: Type.Array(Type.Object({
        name: Type.String(),
        data: Type.Array(Type.Object({
            label: Type.String(),
            value: Type.Number()
        }))
    })),
    range: Type.String()
});

// Event schema
const eventSchema = Type.Object({
    type: Type.Union([
        Type.Literal('validation'),
        Type.Literal('rule_trigger'),
        Type.Literal('task_event'),
        Type.Literal('system'),
        Type.Literal('drift'),
        Type.Literal('version')
    ]),
    data: Type.Record(Type.String(), Type.Any()),
    severity: Type.Union([
        Type.Literal('info'),
        Type.Literal('warning'),
        Type.Literal('critical')
    ]),
    timestamp: Type.String()
});

// Task schemas
export const TaskSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.Optional(Type.String()),
  status: Type.Union([
    Type.Literal('not_started'),
    Type.Literal('in_progress'),
    Type.Literal('completed'),
    Type.Literal('blocked'),
    Type.Literal('cancelled')
  ]),
  priority: Type.Union([
    Type.Literal('low'),
    Type.Literal('medium'),
    Type.Literal('high'),
    Type.Literal('critical')
  ]),
  estimatedHours: Type.Optional(Type.Number()),
  actualHours: Type.Optional(Type.Number()),
  dependencies: Type.Array(Type.String()),
  assignee: Type.Optional(Type.String()),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
  dueDate: Type.Optional(Type.String({ format: 'date-time' })),
  completedAt: Type.Optional(Type.String({ format: 'date-time' }))
});

export const CreateTaskSchema = Type.Omit(TaskSchema, ['id', 'createdAt', 'updatedAt']);
export const UpdateTaskSchema = Type.Partial(Type.Omit(TaskSchema, ['id', 'createdAt']));

// Project Plan schemas
export const ProjectPlanSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.String(),
  version: Type.String(),
  status: Type.Union([
    Type.Literal('draft'),
    Type.Literal('active'),
    Type.Literal('completed'),
    Type.Literal('archived')
  ]),
  tasks: Type.Array(TaskSchema),
  milestones: Type.Array(Type.Object({
    id: Type.String(),
    name: Type.String(),
    description: Type.String(),
    dueDate: Type.String({ format: 'date-time' }),
    tasks: Type.Array(Type.String())
  })),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' })
});

// Sprint schemas
export const SprintSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.String(),
  startDate: Type.String({ format: 'date-time' }),
  endDate: Type.String({ format: 'date-time' }),
  status: Type.Union([
    Type.Literal('planning'),
    Type.Literal('active'),
    Type.Literal('completed'),
    Type.Literal('cancelled')
  ]),
  tasks: Type.Array(TaskSchema),
  velocity: Type.Optional(Type.Number()),
  burndownData: Type.Array(Type.Object({
    date: Type.String({ format: 'date' }),
    remainingHours: Type.Number(),
    completedTasks: Type.Number()
  }))
});

// Metrics schemas
export const DailyMetricsSchema = Type.Object({
  date: Type.String({ format: 'date' }),
  requests: Type.Number(),
  errors: Type.Number(),
  validations: Type.Number(),
  ruleTriggers: Type.Number(),
  taskEvents: Type.Number(),
  avgResponseTime: Type.Number(),
  uniqueUsers: Type.Number()
});

export const MetricsResponseSchema = Type.Object({
  range: Type.String(),
  data: Type.Array(DailyMetricsSchema),
  summary: Type.Object({
    totalRequests: Type.Number(),
    totalErrors: Type.Number(),
    avgResponseTime: Type.Number(),
    errorRate: Type.Number(),
    peakDay: Type.String({ format: 'date' }),
    peakRequests: Type.Number()
  })
});

// Event schemas
export const FailSafeEventSchema = Type.Object({
  id: Type.String(),
  type: Type.Union([
    Type.Literal('validation'),
    Type.Literal('rule_trigger'),
    Type.Literal('task_event'),
    Type.Literal('system'),
    Type.Literal('drift'),
    Type.Literal('version')
  ]),
  timestamp: Type.String({ format: 'date-time' }),
  data: Type.Any(),
  severity: Type.Union([
    Type.Literal('info'),
    Type.Literal('warning'),
    Type.Literal('critical')
  ])
});

// Request log schemas
export const RequestLogEntrySchema = Type.Object({
  id: Type.String(),
  timestamp: Type.String({ format: 'date-time' }),
  method: Type.String(),
  url: Type.String(),
  statusCode: Type.Number(),
  responseTime: Type.Number(),
  userAgent: Type.Optional(Type.String()),
  ip: Type.Optional(Type.String()),
  headers: Type.Optional(Type.Record(Type.String(), Type.String())),
  body: Type.Optional(Type.Any()),
  error: Type.Optional(Type.String())
});

export const RequestLogResponseSchema = Type.Object({
  requests: Type.Array(RequestLogEntrySchema),
  stats: Type.Object({
    total: Type.Number(),
    errors: Type.Number(),
    avgResponseTime: Type.Number(),
    statusCodes: Type.Record(Type.String(), Type.Number())
  }),
  total: Type.Number(),
  timestamp: Type.String({ format: 'date-time' })
});

// Validation schemas
export const ValidationResultSchema = Type.Object({
  isValid: Type.Boolean(),
  errors: Type.Array(Type.String()),
  warnings: Type.Array(Type.String()),
  timestamp: Type.String({ format: 'date-time' })
});

// Chart data schemas
export const ChartDataPointSchema = Type.Object({
  label: Type.String(),
  value: Type.Number(),
  color: Type.Optional(Type.String())
});

export const ChartDataSchema = Type.Object({
  type: Type.Union([
    Type.Literal('line'),
    Type.Literal('bar'),
    Type.Literal('pie'),
    Type.Literal('doughnut')
  ]),
  data: Type.Array(ChartDataPointSchema),
  options: Type.Optional(Type.Record(Type.String(), Type.Any()))
});

// API Response schemas
export const ApiResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Optional(Type.Any()),
  error: Type.Optional(Type.String()),
  message: Type.Optional(Type.String()),
  timestamp: Type.String({ format: 'date-time' })
});

// Health check schema
export const HealthResponseSchema = Type.Object({
  status: Type.Union([
    Type.Literal('healthy'),
    Type.Literal('unhealthy')
  ]),
  checks: Type.Object({
    server: Type.Boolean(),
    memory: Type.Object({
      rss: Type.Number(),
      heapTotal: Type.Number(),
      heapUsed: Type.Number(),
      external: Type.Number()
    }),
    uptime: Type.Number(),
    timestamp: Type.String({ format: 'date-time' })
  }),
  responseTime: Type.String(),
  version: Type.String()
});

// Export TypeScript types
export type Rule = Static<typeof ruleSchema>;
export type Sprint = Static<typeof sprintSchema>;
export type Task = Static<typeof taskSchema>;
export type LogEntry = Static<typeof logEntrySchema>;
export type Metrics = Static<typeof metricsSchema>;
export type Event = Static<typeof eventSchema>;
export type CreateTask = Static<typeof CreateTaskSchema>;
export type UpdateTask = Static<typeof UpdateTaskSchema>;
export type ProjectPlan = Static<typeof ProjectPlanSchema>;
export type DailyMetrics = Static<typeof DailyMetricsSchema>;
export type MetricsResponse = Static<typeof MetricsResponseSchema>;
export type FailSafeEvent = Static<typeof FailSafeEventSchema>;
export type RequestLogEntry = Static<typeof RequestLogEntrySchema>;
export type RequestLogResponse = Static<typeof RequestLogResponseSchema>;
export type ValidationResult = Static<typeof ValidationResultSchema>;
export type ChartData = Static<typeof ChartDataSchema>;
export type ApiResponse = Static<typeof ApiResponseSchema>;
export type HealthResponse = Static<typeof HealthResponseSchema>;

// Export all schemas for use in Fastify
export const schemas = {
    rule: ruleSchema,
    sprint: sprintSchema,
    task: taskSchema,
    logEntry: logEntrySchema,
    validationResult: validationResultSchema,
    metrics: metricsSchema,
    event: eventSchema,
    Task: TaskSchema,
    CreateTask: CreateTaskSchema,
    UpdateTask: UpdateTaskSchema,
    ProjectPlan: ProjectPlanSchema,
    Sprint: SprintSchema,
    DailyMetrics: DailyMetricsSchema,
    MetricsResponse: MetricsResponseSchema,
    FailSafeEvent: FailSafeEventSchema,
    RequestLogEntry: RequestLogEntrySchema,
    RequestLogResponse: RequestLogResponseSchema,
    ValidationResult: ValidationResultSchema,
    ChartData: ChartDataSchema,
    ApiResponse: ApiResponseSchema,
    HealthResponse: HealthResponseSchema
}; 