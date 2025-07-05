import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { execSync } from 'child_process';
import { Logger } from '../logger';

interface FsGateOptions {
    logger: Logger;
    watchPatterns?: string[];
    ignorePatterns?: string[];
    snapshotDir?: string;
    maxSnapshots?: number;
}

interface FileChange {
    path: string;
    type: 'add' | 'change' | 'unlink';
    timestamp: string;
    content?: string;
}

interface GateResult {
    success: boolean;
    errors: string[];
    warnings: string[];
    duration: number;
}

interface SnapshotInfo {
    id: string;
    timestamp: string;
    files: string[];
    size: number;
}

const fastifyFsGate: FastifyPluginAsync<FsGateOptions> = async (fastify, options) => {
    const { 
        logger, 
        watchPatterns = ['src/**/*', 'test/**/*', '*.json', '*.md'],
        ignorePatterns = ['node_modules/**', '.git/**', 'out/**', 'coverage/**', '.failsafe/**'],
        snapshotDir = '.failsafe/snapshots',
        maxSnapshots = 50
    } = options;

    // Ensure snapshot directory exists
    const fullSnapshotDir = path.join(process.cwd(), snapshotDir);
    if (!fs.existsSync(fullSnapshotDir)) {
        fs.mkdirSync(fullSnapshotDir, { recursive: true });
    }

    // Track file changes
    const pendingChanges = new Map<string, FileChange>();
    let isProcessing = false;

    // Decorate fastify with fs-gate functionality
    fastify.decorate('fsGate', {
        async startWatching(): Promise<void> {
            try {
                const watcher = chokidar.watch(watchPatterns, {
                    ignored: ignorePatterns,
                    persistent: true,
                    ignoreInitial: true
                });

                watcher.on('add', (filePath) => handleFileChange(filePath, 'add'));
                watcher.on('change', (filePath) => handleFileChange(filePath, 'change'));
                watcher.on('unlink', (filePath) => handleFileChange(filePath, 'unlink'));

                logger.info('FS-Gate watching started');
            } catch (error) {
                logger.error('Failed to start file watching:', error);
                throw error;
            }
        },

        async processFileChange(filePath: string, changeType: 'add' | 'change' | 'unlink'): Promise<GateResult> {
            const startTime = Date.now();
            
            try {
                // Create snapshot before changes
                const snapshotId = await (fastify as any).fsGate.createSnapshot([filePath]);
                
                // Run validation gates
                const gateResult = await runValidationGates();
                
                if (!gateResult.success) {
                    // Gate failed, rollback to snapshot
                    await (fastify as any).fsGate.rollbackToSnapshot(snapshotId);
                    
                    // Write error report
                    await writeErrorReport(filePath, gateResult);
                    
                    logger.error(`FS-Gate failed for ${filePath}:`, gateResult.errors);
                } else {
                    // Gate passed, cleanup old snapshots
                    await (fastify as any).fsGate.cleanupOldSnapshots();
                    
                    logger.info(`FS-Gate passed for ${filePath} in ${Date.now() - startTime}ms`);
                }
                
                return {
                    ...gateResult,
                    duration: Date.now() - startTime
                };
                
            } catch (error) {
                logger.error('FS-Gate processing failed:', error);
                return {
                    success: false,
                    errors: [`FS-Gate processing failed: ${error}`],
                    warnings: [],
                    duration: Date.now() - startTime
                };
            }
        },

        async createSnapshot(files: string[]): Promise<string> {
            try {
                const snapshotId = `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const snapshotPath = path.join(fullSnapshotDir, snapshotId);
                
                if (!fs.existsSync(snapshotPath)) {
                    fs.mkdirSync(snapshotPath, { recursive: true });
                }
                
                // Copy files to snapshot
                for (const file of files) {
                    const fullPath = path.join(process.cwd(), file);
                    if (fs.existsSync(fullPath)) {
                        const snapshotFilePath = path.join(snapshotPath, file);
                        const snapshotFileDir = path.dirname(snapshotFilePath);
                        
                        if (!fs.existsSync(snapshotFileDir)) {
                            fs.mkdirSync(snapshotFileDir, { recursive: true });
                        }
                        
                        fs.copyFileSync(fullPath, snapshotFilePath);
                    }
                }
                
                // Save snapshot metadata
                const metadata = {
                    id: snapshotId,
                    timestamp: new Date().toISOString(),
                    files,
                    size: calculateSnapshotSize(snapshotPath)
                };
                
                fs.writeFileSync(
                    path.join(snapshotPath, 'metadata.json'),
                    JSON.stringify(metadata, null, 2)
                );
                
                logger.info(`Snapshot created: ${snapshotId} with ${files.length} files`);
                return snapshotId;
                
            } catch (error) {
                logger.error('Failed to create snapshot:', error);
                throw error;
            }
        },

        async rollbackToSnapshot(snapshotId: string): Promise<boolean> {
            try {
                const snapshotPath = path.join(fullSnapshotDir, snapshotId);
                const metadataPath = path.join(snapshotPath, 'metadata.json');
                
                if (!fs.existsSync(metadataPath)) {
                    logger.error(`Snapshot metadata not found: ${snapshotId}`);
                    return false;
                }
                
                const metadata: SnapshotInfo = JSON.parse(
                    fs.readFileSync(metadataPath, 'utf-8')
                );
                
                // Restore files from snapshot
                for (const file of metadata.files) {
                    const snapshotFilePath = path.join(snapshotPath, file);
                    const targetPath = path.join(process.cwd(), file);
                    const targetDir = path.dirname(targetPath);
                    
                    if (fs.existsSync(snapshotFilePath)) {
                        if (!fs.existsSync(targetDir)) {
                            fs.mkdirSync(targetDir, { recursive: true });
                        }
                        
                        fs.copyFileSync(snapshotFilePath, targetPath);
                    }
                }
                
                logger.info(`Rolled back to snapshot: ${snapshotId}`);
                return true;
                
            } catch (error) {
                logger.error('Failed to rollback snapshot:', error);
                return false;
            }
        },

        async listSnapshots(): Promise<SnapshotInfo[]> {
            try {
                const snapshots: SnapshotInfo[] = [];
                
                if (fs.existsSync(fullSnapshotDir)) {
                    const items = fs.readdirSync(fullSnapshotDir);
                    
                    for (const item of items) {
                        const snapshotPath = path.join(fullSnapshotDir, item);
                        const metadataPath = path.join(snapshotPath, 'metadata.json');
                        
                        if (fs.existsSync(metadataPath)) {
                            const metadata: SnapshotInfo = JSON.parse(
                                fs.readFileSync(metadataPath, 'utf-8')
                            );
                            snapshots.push(metadata);
                        }
                    }
                }
                
                return snapshots.sort((a, b) => 
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );
                
            } catch (error) {
                logger.error('Failed to list snapshots:', error);
                return [];
            }
        },

        async cleanupOldSnapshots(): Promise<number> {
            try {
                const snapshots = await (fastify as any).fsGate.listSnapshots();
                
                if (snapshots.length <= maxSnapshots) {
                    return 0;
                }
                
                const snapshotsToDelete = snapshots.slice(maxSnapshots);
                let deletedCount = 0;
                
                for (const snapshot of snapshotsToDelete) {
                    const snapshotPath = path.join(fullSnapshotDir, snapshot.id);
                    if (fs.existsSync(snapshotPath)) {
                        fs.rmSync(snapshotPath, { recursive: true, force: true });
                        deletedCount++;
                    }
                }
                
                if (deletedCount > 0) {
                    logger.info(`Cleaned up ${deletedCount} old snapshots`);
                }
                
                return deletedCount;
                
            } catch (error) {
                logger.error('Failed to cleanup old snapshots:', error);
                return 0;
            }
        }
    });

    // Register routes
    fastify.post('/fs-gate/start', {
        schema: {
            response: {
                200: Type.Object({
                    success: Type.Boolean(),
                    message: Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            await (fastify as any).fsGate.startWatching();
            
            return {
                success: true,
                message: 'FS-Gate watching started'
            };
        } catch (error) {
            logger.error('Failed to start FS-Gate:', error);
            reply.status(500).send({ error: 'Failed to start FS-Gate' });
        }
    });

    fastify.get('/fs-gate/snapshots', {
        schema: {
            response: {
                200: Type.Array(Type.Object({
                    id: Type.String(),
                    timestamp: Type.String(),
                    files: Type.Array(Type.String()),
                    size: Type.Number()
                }))
            }
        }
    }, async (request, reply) => {
        try {
            const snapshots = await (fastify as any).fsGate.listSnapshots();
            return snapshots;
        } catch (error) {
            logger.error('Failed to list snapshots:', error);
            reply.status(500).send({ error: 'Failed to list snapshots' });
        }
    });

    fastify.post('/fs-gate/rollback/:id', {
        schema: {
            params: Type.Object({
                id: Type.String()
            }),
            response: {
                200: Type.Object({
                    success: Type.Boolean(),
                    message: Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            const { id } = request.params as { id: string };
            const success = await (fastify as any).fsGate.rollbackToSnapshot(id);
            
            return {
                success,
                message: success ? 'Rollback completed successfully' : 'Rollback failed'
            };
        } catch (error) {
            logger.error('Rollback failed:', error);
            reply.status(500).send({ error: 'Rollback failed' });
        }
    });

    fastify.post('/fs-gate/cleanup', {
        schema: {
            response: {
                200: Type.Object({
                    success: Type.Boolean(),
                    deletedCount: Type.Number(),
                    message: Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            const deletedCount = await (fastify as any).fsGate.cleanupOldSnapshots();
            
            return {
                success: true,
                deletedCount,
                message: `Cleaned up ${deletedCount} old snapshots`
            };
        } catch (error) {
            logger.error('Cleanup failed:', error);
            reply.status(500).send({ error: 'Cleanup failed' });
        }
    });

    // Helper functions
    async function handleFileChange(filePath: string, changeType: 'add' | 'change' | 'unlink'): Promise<void> {
        if (isProcessing) {
            // Queue the change
            pendingChanges.set(filePath, {
                path: filePath,
                type: changeType,
                timestamp: new Date().toISOString()
            });
            return;
        }

        isProcessing = true;
        
        try {
            const result = await (fastify as any).fsGate.processFileChange(filePath, changeType);
            
            if (!result.success) {
                logger.error(`FS-Gate blocked change to ${filePath}:`, result.errors);
            }
            
        } catch (error) {
            logger.error('Error processing file change:', error);
        } finally {
            isProcessing = false;
            
            // Process any pending changes
            if (pendingChanges.size > 0) {
                const nextChange = pendingChanges.entries().next();
                if (nextChange.value) {
                    const [path, change] = nextChange.value;
                    pendingChanges.delete(path);
                    handleFileChange(path, change.type);
                }
            }
        }
    }

    async function runValidationGates(): Promise<GateResult> {
        const startTime = Date.now();
        const errors: string[] = [];
        const warnings: string[] = [];
        
        try {
            // Run TypeScript check
            try {
                execSync('npx tsc --noEmit', { stdio: 'pipe' });
            } catch (error: any) {
                const output = error.stdout?.toString() || error.stderr?.toString() || '';
                errors.push(`TypeScript errors:\n${output}`);
            }
            
            // Run ESLint
            try {
                execSync('npx eslint src --max-warnings 40', { stdio: 'pipe' });
            } catch (error: any) {
                const output = error.stdout?.toString() || error.stderr?.toString() || '';
                if (output.includes('warning')) {
                    warnings.push(`ESLint warnings:\n${output}`);
                } else {
                    errors.push(`ESLint errors:\n${output}`);
                }
            }
            
            // Run spec-gate
            try {
                execSync('pnpm run spec-gate', { stdio: 'pipe' });
            } catch (error: any) {
                const output = error.stdout?.toString() || error.stderr?.toString() || '';
                errors.push(`Spec-gate failed:\n${output}`);
            }
            
            return {
                success: errors.length === 0,
                errors,
                warnings,
                duration: Date.now() - startTime
            };
            
        } catch (error) {
            return {
                success: false,
                errors: [`Validation gate execution failed: ${error}`],
                warnings: [],
                duration: Date.now() - startTime
            };
        }
    }

    async function writeErrorReport(filePath: string, result: GateResult): Promise<void> {
        try {
            const errorReportPath = `${filePath}.failsafe-error.json`;
            const report = {
                file: filePath,
                timestamp: new Date().toISOString(),
                errors: result.errors,
                warnings: result.warnings,
                duration: result.duration
            };
            
            fs.writeFileSync(errorReportPath, JSON.stringify(report, null, 2));
            logger.info(`Error report written: ${errorReportPath}`);
            
        } catch (error) {
            logger.error('Failed to write error report:', error);
        }
    }

    function calculateSnapshotSize(snapshotPath: string): number {
        const totalSize = 0;
        
        function calculateDirSize(dir: string): number {
            let size = 0;
            
            if (fs.existsSync(dir)) {
                const items = fs.readdirSync(dir);
                
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stats = fs.statSync(itemPath);
                    
                    if (stats.isDirectory()) {
                        size += calculateDirSize(itemPath);
                    } else {
                        size += stats.size;
                    }
                }
            }
            
            return size;
        }
        
        return calculateDirSize(snapshotPath);
    }
};

export default fastifyFsGate; 