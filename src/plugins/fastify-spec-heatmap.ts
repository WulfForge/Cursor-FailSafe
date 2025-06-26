import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import * as fs from 'fs';
import * as path from 'path';

interface SpecSection {
    id: string;
    title: string;
    status: 'present' | 'missing' | 'partial';
    implementation: string[];
    missing: string[];
    lastChecked: string;
}

interface SpecHeatmapData {
    sections: SpecSection[];
    overallStatus: 'complete' | 'partial' | 'incomplete';
    lastUpdated: string;
    totalSections: number;
    implementedSections: number;
    missingSections: number;
}

const SpecHeatmapSchema = Type.Object({
    sections: Type.Array(Type.Object({
        id: Type.String(),
        title: Type.String(),
        status: Type.Union([Type.Literal('present'), Type.Literal('missing'), Type.Literal('partial')]),
        implementation: Type.Array(Type.String()),
        missing: Type.Array(Type.String()),
        lastChecked: Type.String()
    })),
    overallStatus: Type.Union([Type.Literal('complete'), Type.Literal('partial'), Type.Literal('incomplete')]),
    lastUpdated: Type.String(),
    totalSections: Type.Number(),
    implementedSections: Type.Number(),
    missingSections: Type.Number()
});

const fastifySpecHeatmap: FastifyPluginAsync = async (fastify) => {
    // Decorate fastify with spec heatmap functionality
    fastify.decorate('specHeatmap', {
        async generateHeatmap(): Promise<SpecHeatmapData> {
            const specPath = path.join(process.cwd(), 'o3-accountable.md');
            const sections: SpecSection[] = [];
            
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
                        const status = await (fastify as any).specHeatmap.checkSectionImplementation(sectionId, title);
                        sections.push({
                            id: sectionId,
                            title: title.trim(),
                            status,
                            implementation: await (fastify as any).specHeatmap.getImplementationDetails(sectionId),
                            missing: await (fastify as any).specHeatmap.getMissingDetails(sectionId),
                            lastChecked: new Date().toISOString()
                        });
                    }
                }
            }

            const implementedSections = sections.filter(s => s.status === 'present').length;
            const missingSections = sections.filter(s => s.status === 'missing').length;
            const totalSections = sections.length;

            let overallStatus: 'complete' | 'partial' | 'incomplete';
            if (implementedSections === totalSections) {
                overallStatus = 'complete';
            } else if (implementedSections > 0) {
                overallStatus = 'partial';
            } else {
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

        async checkSectionImplementation(sectionId: string, title: string): Promise<'present' | 'missing' | 'partial'> {
            const sectionMap: Record<string, string[]> = {
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
            if (requiredFiles.length === 0) return 'present';

            let presentCount = 0;
            for (const file of requiredFiles) {
                if (file.endsWith('/')) {
                    // Directory check
                    if (fs.existsSync(path.join(process.cwd(), file))) {
                        presentCount++;
                    }
                } else {
                    // File check
                    if (fs.existsSync(path.join(process.cwd(), file))) {
                        presentCount++;
                    }
                }
            }

            if (presentCount === 0) return 'missing';
            if (presentCount === requiredFiles.length) return 'present';
            return 'partial';
        },

        async getImplementationDetails(sectionId: string): Promise<string[]> {
            const sectionMap: Record<string, string[]> = {
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

        async getMissingDetails(sectionId: string): Promise<string[]> {
            const sectionMap: Record<string, string[]> = {
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
        const heatmap = await (fastify as any).specHeatmap.generateHeatmap();
        return heatmap;
    });

    fastify.get('/spec-heatmap/status', {
        schema: {
            response: {
                200: Type.Object({
                    status: Type.String(),
                    message: Type.String(),
                    details: SpecHeatmapSchema
                })
            }
        }
    }, async (request, reply) => {
        const heatmap = await (fastify as any).specHeatmap.generateHeatmap();
        
        let status = 'healthy';
        let message = 'All spec sections implemented';
        
        if (heatmap.overallStatus === 'incomplete') {
            status = 'critical';
            message = `${heatmap.missingSections} spec sections missing`;
        } else if (heatmap.overallStatus === 'partial') {
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

export default fastifySpecHeatmap; 