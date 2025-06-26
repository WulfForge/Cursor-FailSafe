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
const typebox_1 = require("@sinclair/typebox");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const SpecHeatmapSchema = typebox_1.Type.Object({
    sections: typebox_1.Type.Array(typebox_1.Type.Object({
        id: typebox_1.Type.String(),
        title: typebox_1.Type.String(),
        status: typebox_1.Type.Union([typebox_1.Type.Literal('present'), typebox_1.Type.Literal('missing'), typebox_1.Type.Literal('partial')]),
        implementation: typebox_1.Type.Array(typebox_1.Type.String()),
        missing: typebox_1.Type.Array(typebox_1.Type.String()),
        lastChecked: typebox_1.Type.String()
    })),
    overallStatus: typebox_1.Type.Union([typebox_1.Type.Literal('complete'), typebox_1.Type.Literal('partial'), typebox_1.Type.Literal('incomplete')]),
    lastUpdated: typebox_1.Type.String(),
    totalSections: typebox_1.Type.Number(),
    implementedSections: typebox_1.Type.Number(),
    missingSections: typebox_1.Type.Number()
});
const fastifySpecHeatmap = async (fastify) => {
    // Decorate fastify with spec heatmap functionality
    fastify.decorate('specHeatmap', {
        async generateHeatmap() {
            const specPath = path.join(process.cwd(), 'o3-accountable.md');
            const sections = [];
            if (!fs.existsSync(specPath)) {
                return {
                    sections: [],
                    overallStatus: 'incomplete',
                    lastUpdated: new Date().toISOString(),
                    totalSections: 0,
                    implementedSections: 0,
                    missingSections: 0
                };
            }
            const specContent = fs.readFileSync(specPath, 'utf-8');
            // Parse spec sections
            const sectionMatches = specContent.match(/^## (\d+\.\d+)\s+(.+)$/gm);
            if (sectionMatches) {
                for (const match of sectionMatches) {
                    const [, sectionId, title] = match.match(/^## (\d+\.\d+)\s+(.+)$/) || [];
                    if (sectionId && title) {
                        const status = await fastify.specHeatmap.checkSectionImplementation(sectionId, title);
                        sections.push({
                            id: sectionId,
                            title: title.trim(),
                            status,
                            implementation: await fastify.specHeatmap.getImplementationDetails(sectionId),
                            missing: await fastify.specHeatmap.getMissingDetails(sectionId),
                            lastChecked: new Date().toISOString()
                        });
                    }
                }
            }
            const implementedSections = sections.filter(s => s.status === 'present').length;
            const missingSections = sections.filter(s => s.status === 'missing').length;
            const totalSections = sections.length;
            let overallStatus;
            if (implementedSections === totalSections) {
                overallStatus = 'complete';
            }
            else if (implementedSections > 0) {
                overallStatus = 'partial';
            }
            else {
                overallStatus = 'incomplete';
            }
            return {
                sections,
                overallStatus,
                lastUpdated: new Date().toISOString(),
                totalSections,
                implementedSections,
                missingSections
            };
        },
        async checkSectionImplementation(sectionId, title) {
            const sectionMap = {
                '4': ['src/fastifyServer.ts', 'src/plugins/'],
                '5': ['src/fastifyServer.ts', 'src/schemas/'],
                '6': ['src/dataStore.ts', 'src/types.ts'],
                '7': ['src/ui.ts', 'src/commands.ts'],
                '8': ['package.json', 'tsconfig.json'],
                '9.1': ['src/plugins/fastify-spec-gate.ts', 'src/plugins/fastify-event-bus.ts', 'src/plugins/fastify-health.ts'],
                '9.2': ['src/plugins/fastify-metrics.ts', 'src/plugins/fastify-request-logger.ts'],
                '9.4': ['src/plugins/fastify-spec-heatmap.ts', 'src/plugins/fastify-snapshot-validator.ts'],
                '9.5': ['src/plugins/fastify-preview.ts', 'src/commands.ts']
            };
            const requiredFiles = sectionMap[sectionId] || [];
            if (requiredFiles.length === 0)
                return 'present';
            let presentCount = 0;
            for (const file of requiredFiles) {
                if (file.endsWith('/')) {
                    // Directory check
                    if (fs.existsSync(path.join(process.cwd(), file))) {
                        presentCount++;
                    }
                }
                else {
                    // File check
                    if (fs.existsSync(path.join(process.cwd(), file))) {
                        presentCount++;
                    }
                }
            }
            if (presentCount === 0)
                return 'missing';
            if (presentCount === requiredFiles.length)
                return 'present';
            return 'partial';
        },
        async getImplementationDetails(sectionId) {
            const sectionMap = {
                '4': ['Fastify server setup', 'Plugin registration'],
                '5': ['API routes', 'Schema validation'],
                '6': ['Data models', 'Type definitions'],
                '7': ['UI components', 'Command handlers'],
                '8': ['Build configuration', 'Development workflow'],
                '9.1': ['Spec gate plugin', 'Event bus plugin', 'Health plugin'],
                '9.2': ['Metrics plugin', 'Request logger plugin'],
                '9.4': ['Spec heatmap', 'Snapshot validator'],
                '9.5': ['Preview route', 'Preview panel']
            };
            return sectionMap[sectionId] || [];
        },
        async getMissingDetails(sectionId) {
            const sectionMap = {
                '4': ['Fastify server implementation'],
                '5': ['API endpoint implementations'],
                '6': ['Data store implementation'],
                '7': ['UI component implementations'],
                '8': ['Build scripts'],
                '9.1': ['Spec gate implementation', 'Event bus implementation', 'Health endpoint'],
                '9.2': ['Metrics collection', 'Request logging'],
                '9.4': ['Heatmap generation', 'Snapshot validation'],
                '9.5': ['Preview rendering', 'Preview panel']
            };
            return sectionMap[sectionId] || [];
        }
    });
    // Register routes
    fastify.get('/spec-heatmap', {
        schema: {
            response: {
                200: SpecHeatmapSchema
            }
        }
    }, async (request, reply) => {
        const heatmap = await fastify.specHeatmap.generateHeatmap();
        return heatmap;
    });
    fastify.get('/spec-heatmap/status', {
        schema: {
            response: {
                200: typebox_1.Type.Object({
                    status: typebox_1.Type.String(),
                    message: typebox_1.Type.String(),
                    details: SpecHeatmapSchema
                })
            }
        }
    }, async (request, reply) => {
        const heatmap = await fastify.specHeatmap.generateHeatmap();
        let status = 'healthy';
        let message = 'All spec sections implemented';
        if (heatmap.overallStatus === 'incomplete') {
            status = 'critical';
            message = `${heatmap.missingSections} spec sections missing`;
        }
        else if (heatmap.overallStatus === 'partial') {
            status = 'warning';
            message = `${heatmap.missingSections} spec sections partially implemented`;
        }
        return {
            status,
            message,
            details: heatmap
        };
    });
};
exports.default = fastifySpecHeatmap;
//# sourceMappingURL=fastify-spec-heatmap.js.map