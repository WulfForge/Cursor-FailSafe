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
const chokidar = __importStar(require("chokidar"));
const child_process_1 = require("child_process");
const fastifyFsGate = async (fastify, options) => {
    const { logger, watchPatterns = ['src/**/*', 'test/**/*', '*.json', '*.md'], ignorePatterns = ['node_modules/**', '.git/**', 'out/**', 'coverage/**', '.failsafe/**'], snapshotDir = '.failsafe/snapshots', maxSnapshots = 50 } = options;
    // Ensure snapshot directory exists
    const fullSnapshotDir = path.join(process.cwd(), snapshotDir);
    if (!fs.existsSync(fullSnapshotDir)) {
        fs.mkdirSync(fullSnapshotDir, { recursive: true });
    }
    // Track file changes
    const pendingChanges = new Map();
    let isProcessing = false;
    // Decorate fastify with fs-gate functionality
    fastify.decorate('fsGate', {
        async startWatching() {
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
            }
            catch (error) {
                logger.error('Failed to start file watching:', error);
                throw error;
            }
        },
        async processFileChange(filePath, changeType) {
            const startTime = Date.now();
            try {
                // Create snapshot before changes
                const snapshotId = await fastify.fsGate.createSnapshot([filePath]);
                // Run validation gates
                const gateResult = await runValidationGates();
                if (!gateResult.success) {
                    // Gate failed, rollback to snapshot
                    await fastify.fsGate.rollbackToSnapshot(snapshotId);
                    // Write error report
                    await writeErrorReport(filePath, gateResult);
                    logger.error(`FS-Gate failed for ${filePath}:`, gateResult.errors);
                }
                else {
                    // Gate passed, cleanup old snapshots
                    await fastify.fsGate.cleanupOldSnapshots();
                    logger.info(`FS-Gate passed for ${filePath} in ${Date.now() - startTime}ms`);
                }
                return {
                    ...gateResult,
                    duration: Date.now() - startTime
                };
            }
            catch (error) {
                logger.error('FS-Gate processing failed:', error);
                return {
                    success: false,
                    errors: [`FS-Gate processing failed: ${error}`],
                    warnings: [],
                    duration: Date.now() - startTime
                };
            }
        },
        async createSnapshot(files) {
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
                fs.writeFileSync(path.join(snapshotPath, 'metadata.json'), JSON.stringify(metadata, null, 2));
                logger.info(`Snapshot created: ${snapshotId} with ${files.length} files`);
                return snapshotId;
            }
            catch (error) {
                logger.error('Failed to create snapshot:', error);
                throw error;
            }
        },
        async rollbackToSnapshot(snapshotId) {
            try {
                const snapshotPath = path.join(fullSnapshotDir, snapshotId);
                const metadataPath = path.join(snapshotPath, 'metadata.json');
                if (!fs.existsSync(metadataPath)) {
                    logger.error(`Snapshot metadata not found: ${snapshotId}`);
                    return false;
                }
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
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
            }
            catch (error) {
                logger.error('Failed to rollback snapshot:', error);
                return false;
            }
        },
        async listSnapshots() {
            try {
                const snapshots = [];
                if (fs.existsSync(fullSnapshotDir)) {
                    const items = fs.readdirSync(fullSnapshotDir);
                    for (const item of items) {
                        const snapshotPath = path.join(fullSnapshotDir, item);
                        const metadataPath = path.join(snapshotPath, 'metadata.json');
                        if (fs.existsSync(metadataPath)) {
                            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
                            snapshots.push(metadata);
                        }
                    }
                }
                return snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            }
            catch (error) {
                logger.error('Failed to list snapshots:', error);
                return [];
            }
        },
        async cleanupOldSnapshots() {
            try {
                const snapshots = await fastify.fsGate.listSnapshots();
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
            }
            catch (error) {
                logger.error('Failed to cleanup old snapshots:', error);
                return 0;
            }
        }
    });
    // Register routes
    fastify.post('/fs-gate/start', {
        schema: {
            response: {
                200: typebox_1.Type.Object({
                    success: typebox_1.Type.Boolean(),
                    message: typebox_1.Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            await fastify.fsGate.startWatching();
            return {
                success: true,
                message: 'FS-Gate watching started'
            };
        }
        catch (error) {
            logger.error('Failed to start FS-Gate:', error);
            reply.status(500).send({ error: 'Failed to start FS-Gate' });
        }
    });
    fastify.get('/fs-gate/snapshots', {
        schema: {
            response: {
                200: typebox_1.Type.Array(typebox_1.Type.Object({
                    id: typebox_1.Type.String(),
                    timestamp: typebox_1.Type.String(),
                    files: typebox_1.Type.Array(typebox_1.Type.String()),
                    size: typebox_1.Type.Number()
                }))
            }
        }
    }, async (request, reply) => {
        try {
            const snapshots = await fastify.fsGate.listSnapshots();
            return snapshots;
        }
        catch (error) {
            logger.error('Failed to list snapshots:', error);
            reply.status(500).send({ error: 'Failed to list snapshots' });
        }
    });
    fastify.post('/fs-gate/rollback/:id', {
        schema: {
            params: typebox_1.Type.Object({
                id: typebox_1.Type.String()
            }),
            response: {
                200: typebox_1.Type.Object({
                    success: typebox_1.Type.Boolean(),
                    message: typebox_1.Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const success = await fastify.fsGate.rollbackToSnapshot(id);
            return {
                success,
                message: success ? 'Rollback completed successfully' : 'Rollback failed'
            };
        }
        catch (error) {
            logger.error('Rollback failed:', error);
            reply.status(500).send({ error: 'Rollback failed' });
        }
    });
    fastify.post('/fs-gate/cleanup', {
        schema: {
            response: {
                200: typebox_1.Type.Object({
                    success: typebox_1.Type.Boolean(),
                    deletedCount: typebox_1.Type.Number(),
                    message: typebox_1.Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            const deletedCount = await fastify.fsGate.cleanupOldSnapshots();
            return {
                success: true,
                deletedCount,
                message: `Cleaned up ${deletedCount} old snapshots`
            };
        }
        catch (error) {
            logger.error('Cleanup failed:', error);
            reply.status(500).send({ error: 'Cleanup failed' });
        }
    });
    // Helper functions
    async function handleFileChange(filePath, changeType) {
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
            const result = await fastify.fsGate.processFileChange(filePath, changeType);
            if (!result.success) {
                logger.error(`FS-Gate blocked change to ${filePath}:`, result.errors);
            }
        }
        catch (error) {
            logger.error('Error processing file change:', error);
        }
        finally {
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
    async function runValidationGates() {
        const startTime = Date.now();
        const errors = [];
        const warnings = [];
        try {
            // Run TypeScript check
            try {
                (0, child_process_1.execSync)('npx tsc --noEmit', { stdio: 'pipe' });
            }
            catch (error) {
                const output = error.stdout?.toString() || error.stderr?.toString() || '';
                errors.push(`TypeScript errors:\n${output}`);
            }
            // Run ESLint
            try {
                (0, child_process_1.execSync)('npx eslint src --max-warnings 40', { stdio: 'pipe' });
            }
            catch (error) {
                const output = error.stdout?.toString() || error.stderr?.toString() || '';
                if (output.includes('warning')) {
                    warnings.push(`ESLint warnings:\n${output}`);
                }
                else {
                    errors.push(`ESLint errors:\n${output}`);
                }
            }
            // Run spec-gate
            try {
                (0, child_process_1.execSync)('pnpm run spec-gate', { stdio: 'pipe' });
            }
            catch (error) {
                const output = error.stdout?.toString() || error.stderr?.toString() || '';
                errors.push(`Spec-gate failed:\n${output}`);
            }
            return {
                success: errors.length === 0,
                errors,
                warnings,
                duration: Date.now() - startTime
            };
        }
        catch (error) {
            return {
                success: false,
                errors: [`Validation gate execution failed: ${error}`],
                warnings: [],
                duration: Date.now() - startTime
            };
        }
    }
    async function writeErrorReport(filePath, result) {
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
        }
        catch (error) {
            logger.error('Failed to write error report:', error);
        }
    }
    function calculateSnapshotSize(snapshotPath) {
        const totalSize = 0;
        function calculateDirSize(dir) {
            let size = 0;
            if (fs.existsSync(dir)) {
                const items = fs.readdirSync(dir);
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stats = fs.statSync(itemPath);
                    if (stats.isDirectory()) {
                        size += calculateDirSize(itemPath);
                    }
                    else {
                        size += stats.size;
                    }
                }
            }
            return size;
        }
        return calculateDirSize(snapshotPath);
    }
};
exports.default = fastifyFsGate;
//# sourceMappingURL=fastify-fs-gate.js.map