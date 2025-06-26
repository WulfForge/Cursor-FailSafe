"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemas = exports.HealthResponseSchema = exports.ApiResponseSchema = exports.ChartDataSchema = exports.ChartDataPointSchema = exports.ValidationResultSchema = exports.RequestLogResponseSchema = exports.RequestLogEntrySchema = exports.FailSafeEventSchema = exports.MetricsResponseSchema = exports.DailyMetricsSchema = exports.SprintSchema = exports.ProjectPlanSchema = exports.UpdateTaskSchema = exports.CreateTaskSchema = exports.TaskSchema = void 0;
const typebox_1 = require("@sinclair/typebox");
// Rule schema
const ruleSchema = typebox_1.Type.Object({
    id: typebox_1.Type.String(),
    name: typebox_1.Type.String(),
    category: typebox_1.Type.Union([
        typebox_1.Type.Literal('lint'),
        typebox_1.Type.Literal('security'),
        typebox_1.Type.Literal('style'),
        typebox_1.Type.Literal('custom')
    ]),
    enabled: typebox_1.Type.Boolean(),
    triggerCount: typebox_1.Type.Number(),
    lastTriggered: typebox_1.Type.Optional(typebox_1.Type.String()),
    logic: typebox_1.Type.String()
});
// Sprint schema
const sprintSchema = typebox_1.Type.Object({
    id: typebox_1.Type.String(),
    name: typebox_1.Type.String(),
    start: typebox_1.Type.String(),
    end: typebox_1.Type.String(),
    status: typebox_1.Type.Union([
        typebox_1.Type.Literal('building'),
        typebox_1.Type.Literal('active'),
        typebox_1.Type.Literal('complete')
    ]),
    velocity: typebox_1.Type.Number()
});
// Task schema
const taskSchema = typebox_1.Type.Object({
    id: typebox_1.Type.String(),
    sprintId: typebox_1.Type.String(),
    name: typebox_1.Type.String(),
    status: typebox_1.Type.String(),
    dependsOn: typebox_1.Type.Array(typebox_1.Type.String()),
    completedAt: typebox_1.Type.Optional(typebox_1.Type.String())
});
// Log Entry schema
const logEntrySchema = typebox_1.Type.Object({
    id: typebox_1.Type.String(),
    timestamp: typebox_1.Type.String(),
    level: typebox_1.Type.Union([
        typebox_1.Type.Literal('info'),
        typebox_1.Type.Literal('warning'),
        typebox_1.Type.Literal('error'),
        typebox_1.Type.Literal('debug')
    ]),
    message: typebox_1.Type.String(),
    source: typebox_1.Type.String(),
    metadata: typebox_1.Type.Optional(typebox_1.Type.Record(typebox_1.Type.String(), typebox_1.Type.Any()))
});
// Validation Result schema
const validationResultSchema = typebox_1.Type.Object({
    status: typebox_1.Type.Union([
        typebox_1.Type.Literal('pass'),
        typebox_1.Type.Literal('fail')
    ]),
    results: typebox_1.Type.Array(typebox_1.Type.Object({
        file: typebox_1.Type.String(),
        line: typebox_1.Type.Number(),
        message: typebox_1.Type.String(),
        severity: typebox_1.Type.Union([
            typebox_1.Type.Literal('info'),
            typebox_1.Type.Literal('warning'),
            typebox_1.Type.Literal('error')
        ])
    }))
});
// Metrics schema
const metricsSchema = typebox_1.Type.Object({
    charts: typebox_1.Type.Array(typebox_1.Type.Object({
        name: typebox_1.Type.String(),
        data: typebox_1.Type.Array(typebox_1.Type.Object({
            label: typebox_1.Type.String(),
            value: typebox_1.Type.Number()
        }))
    })),
    range: typebox_1.Type.String()
});
// Event schema
const eventSchema = typebox_1.Type.Object({
    type: typebox_1.Type.Union([
        typebox_1.Type.Literal('validation'),
        typebox_1.Type.Literal('rule_trigger'),
        typebox_1.Type.Literal('task_event'),
        typebox_1.Type.Literal('system'),
        typebox_1.Type.Literal('drift'),
        typebox_1.Type.Literal('version')
    ]),
    data: typebox_1.Type.Record(typebox_1.Type.String(), typebox_1.Type.Any()),
    severity: typebox_1.Type.Union([
        typebox_1.Type.Literal('info'),
        typebox_1.Type.Literal('warning'),
        typebox_1.Type.Literal('critical')
    ]),
    timestamp: typebox_1.Type.String()
});
// Task schemas
exports.TaskSchema = typebox_1.Type.Object({
    id: typebox_1.Type.String(),
    name: typebox_1.Type.String(),
    description: typebox_1.Type.Optional(typebox_1.Type.String()),
    status: typebox_1.Type.Union([
        typebox_1.Type.Literal('not_started'),
        typebox_1.Type.Literal('in_progress'),
        typebox_1.Type.Literal('completed'),
        typebox_1.Type.Literal('blocked'),
        typebox_1.Type.Literal('cancelled')
    ]),
    priority: typebox_1.Type.Union([
        typebox_1.Type.Literal('low'),
        typebox_1.Type.Literal('medium'),
        typebox_1.Type.Literal('high'),
        typebox_1.Type.Literal('critical')
    ]),
    estimatedHours: typebox_1.Type.Optional(typebox_1.Type.Number()),
    actualHours: typebox_1.Type.Optional(typebox_1.Type.Number()),
    dependencies: typebox_1.Type.Array(typebox_1.Type.String()),
    assignee: typebox_1.Type.Optional(typebox_1.Type.String()),
    createdAt: typebox_1.Type.String({ format: 'date-time' }),
    updatedAt: typebox_1.Type.String({ format: 'date-time' }),
    dueDate: typebox_1.Type.Optional(typebox_1.Type.String({ format: 'date-time' })),
    completedAt: typebox_1.Type.Optional(typebox_1.Type.String({ format: 'date-time' }))
});
exports.CreateTaskSchema = typebox_1.Type.Omit(exports.TaskSchema, ['id', 'createdAt', 'updatedAt']);
exports.UpdateTaskSchema = typebox_1.Type.Partial(typebox_1.Type.Omit(exports.TaskSchema, ['id', 'createdAt']));
// Project Plan schemas
exports.ProjectPlanSchema = typebox_1.Type.Object({
    id: typebox_1.Type.String(),
    name: typebox_1.Type.String(),
    description: typebox_1.Type.String(),
    version: typebox_1.Type.String(),
    status: typebox_1.Type.Union([
        typebox_1.Type.Literal('draft'),
        typebox_1.Type.Literal('active'),
        typebox_1.Type.Literal('completed'),
        typebox_1.Type.Literal('archived')
    ]),
    tasks: typebox_1.Type.Array(exports.TaskSchema),
    milestones: typebox_1.Type.Array(typebox_1.Type.Object({
        id: typebox_1.Type.String(),
        name: typebox_1.Type.String(),
        description: typebox_1.Type.String(),
        dueDate: typebox_1.Type.String({ format: 'date-time' }),
        tasks: typebox_1.Type.Array(typebox_1.Type.String())
    })),
    createdAt: typebox_1.Type.String({ format: 'date-time' }),
    updatedAt: typebox_1.Type.String({ format: 'date-time' })
});
// Sprint schemas
exports.SprintSchema = typebox_1.Type.Object({
    id: typebox_1.Type.String(),
    name: typebox_1.Type.String(),
    description: typebox_1.Type.String(),
    startDate: typebox_1.Type.String({ format: 'date-time' }),
    endDate: typebox_1.Type.String({ format: 'date-time' }),
    status: typebox_1.Type.Union([
        typebox_1.Type.Literal('planning'),
        typebox_1.Type.Literal('active'),
        typebox_1.Type.Literal('completed'),
        typebox_1.Type.Literal('cancelled')
    ]),
    tasks: typebox_1.Type.Array(exports.TaskSchema),
    velocity: typebox_1.Type.Optional(typebox_1.Type.Number()),
    burndownData: typebox_1.Type.Array(typebox_1.Type.Object({
        date: typebox_1.Type.String({ format: 'date' }),
        remainingHours: typebox_1.Type.Number(),
        completedTasks: typebox_1.Type.Number()
    }))
});
// Metrics schemas
exports.DailyMetricsSchema = typebox_1.Type.Object({
    date: typebox_1.Type.String({ format: 'date' }),
    requests: typebox_1.Type.Number(),
    errors: typebox_1.Type.Number(),
    validations: typebox_1.Type.Number(),
    ruleTriggers: typebox_1.Type.Number(),
    taskEvents: typebox_1.Type.Number(),
    avgResponseTime: typebox_1.Type.Number(),
    uniqueUsers: typebox_1.Type.Number()
});
exports.MetricsResponseSchema = typebox_1.Type.Object({
    range: typebox_1.Type.String(),
    data: typebox_1.Type.Array(exports.DailyMetricsSchema),
    summary: typebox_1.Type.Object({
        totalRequests: typebox_1.Type.Number(),
        totalErrors: typebox_1.Type.Number(),
        avgResponseTime: typebox_1.Type.Number(),
        errorRate: typebox_1.Type.Number(),
        peakDay: typebox_1.Type.String({ format: 'date' }),
        peakRequests: typebox_1.Type.Number()
    })
});
// Event schemas
exports.FailSafeEventSchema = typebox_1.Type.Object({
    id: typebox_1.Type.String(),
    type: typebox_1.Type.Union([
        typebox_1.Type.Literal('validation'),
        typebox_1.Type.Literal('rule_trigger'),
        typebox_1.Type.Literal('task_event'),
        typebox_1.Type.Literal('system'),
        typebox_1.Type.Literal('drift'),
        typebox_1.Type.Literal('version')
    ]),
    timestamp: typebox_1.Type.String({ format: 'date-time' }),
    data: typebox_1.Type.Any(),
    severity: typebox_1.Type.Union([
        typebox_1.Type.Literal('info'),
        typebox_1.Type.Literal('warning'),
        typebox_1.Type.Literal('critical')
    ])
});
// Request log schemas
exports.RequestLogEntrySchema = typebox_1.Type.Object({
    id: typebox_1.Type.String(),
    timestamp: typebox_1.Type.String({ format: 'date-time' }),
    method: typebox_1.Type.String(),
    url: typebox_1.Type.String(),
    statusCode: typebox_1.Type.Number(),
    responseTime: typebox_1.Type.Number(),
    userAgent: typebox_1.Type.Optional(typebox_1.Type.String()),
    ip: typebox_1.Type.Optional(typebox_1.Type.String()),
    headers: typebox_1.Type.Optional(typebox_1.Type.Record(typebox_1.Type.String(), typebox_1.Type.String())),
    body: typebox_1.Type.Optional(typebox_1.Type.Any()),
    error: typebox_1.Type.Optional(typebox_1.Type.String())
});
exports.RequestLogResponseSchema = typebox_1.Type.Object({
    requests: typebox_1.Type.Array(exports.RequestLogEntrySchema),
    stats: typebox_1.Type.Object({
        total: typebox_1.Type.Number(),
        errors: typebox_1.Type.Number(),
        avgResponseTime: typebox_1.Type.Number(),
        statusCodes: typebox_1.Type.Record(typebox_1.Type.String(), typebox_1.Type.Number())
    }),
    total: typebox_1.Type.Number(),
    timestamp: typebox_1.Type.String({ format: 'date-time' })
});
// Validation schemas
exports.ValidationResultSchema = typebox_1.Type.Object({
    isValid: typebox_1.Type.Boolean(),
    errors: typebox_1.Type.Array(typebox_1.Type.String()),
    warnings: typebox_1.Type.Array(typebox_1.Type.String()),
    timestamp: typebox_1.Type.String({ format: 'date-time' })
});
// Chart data schemas
exports.ChartDataPointSchema = typebox_1.Type.Object({
    label: typebox_1.Type.String(),
    value: typebox_1.Type.Number(),
    color: typebox_1.Type.Optional(typebox_1.Type.String())
});
exports.ChartDataSchema = typebox_1.Type.Object({
    type: typebox_1.Type.Union([
        typebox_1.Type.Literal('line'),
        typebox_1.Type.Literal('bar'),
        typebox_1.Type.Literal('pie'),
        typebox_1.Type.Literal('doughnut')
    ]),
    data: typebox_1.Type.Array(exports.ChartDataPointSchema),
    options: typebox_1.Type.Optional(typebox_1.Type.Record(typebox_1.Type.String(), typebox_1.Type.Any()))
});
// API Response schemas
exports.ApiResponseSchema = typebox_1.Type.Object({
    success: typebox_1.Type.Boolean(),
    data: typebox_1.Type.Optional(typebox_1.Type.Any()),
    error: typebox_1.Type.Optional(typebox_1.Type.String()),
    message: typebox_1.Type.Optional(typebox_1.Type.String()),
    timestamp: typebox_1.Type.String({ format: 'date-time' })
});
// Health check schema
exports.HealthResponseSchema = typebox_1.Type.Object({
    status: typebox_1.Type.Union([
        typebox_1.Type.Literal('healthy'),
        typebox_1.Type.Literal('unhealthy')
    ]),
    checks: typebox_1.Type.Object({
        server: typebox_1.Type.Boolean(),
        memory: typebox_1.Type.Object({
            rss: typebox_1.Type.Number(),
            heapTotal: typebox_1.Type.Number(),
            heapUsed: typebox_1.Type.Number(),
            external: typebox_1.Type.Number()
        }),
        uptime: typebox_1.Type.Number(),
        timestamp: typebox_1.Type.String({ format: 'date-time' })
    }),
    responseTime: typebox_1.Type.String(),
    version: typebox_1.Type.String()
});
// Export all schemas for use in Fastify
exports.schemas = {
    rule: ruleSchema,
    sprint: sprintSchema,
    task: taskSchema,
    logEntry: logEntrySchema,
    validationResult: validationResultSchema,
    metrics: metricsSchema,
    event: eventSchema,
    Task: exports.TaskSchema,
    CreateTask: exports.CreateTaskSchema,
    UpdateTask: exports.UpdateTaskSchema,
    ProjectPlan: exports.ProjectPlanSchema,
    Sprint: exports.SprintSchema,
    DailyMetrics: exports.DailyMetricsSchema,
    MetricsResponse: exports.MetricsResponseSchema,
    FailSafeEvent: exports.FailSafeEventSchema,
    RequestLogEntry: exports.RequestLogEntrySchema,
    RequestLogResponse: exports.RequestLogResponseSchema,
    ValidationResult: exports.ValidationResultSchema,
    ChartData: exports.ChartDataSchema,
    ApiResponse: exports.ApiResponseSchema,
    HealthResponse: exports.HealthResponseSchema
};
//# sourceMappingURL=index.js.map