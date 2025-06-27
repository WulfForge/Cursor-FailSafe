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
const crypto = __importStar(require("crypto"));
const fastifySignoff = async (fastify, options) => {
    const { logger, tokensPath = '.failsafe/signoff-tokens.json', secretKey = process.env.FAILSAFE_SECRET_KEY || 'default-secret-key' } = options;
    // Ensure tokens directory exists
    const tokensDir = path.dirname(path.join(process.cwd(), tokensPath));
    if (!fs.existsSync(tokensDir)) {
        fs.mkdirSync(tokensDir, { recursive: true });
    }
    // Decorate fastify with signoff functionality
    fastify.decorate('signoff', {
        async generateToken(request) {
            try {
                const tokenId = `signoff-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
                const tokenValue = crypto.randomBytes(32).toString('hex');
                const approvedAt = new Date().toISOString();
                const expiresInHours = request.expiresInHours || 24;
                const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
                const tokenData = {
                    id: tokenId,
                    token: tokenValue,
                    sprintId: request.sprintId,
                    sprintName: request.sprintName,
                    approvedBy: request.approvedBy,
                    approvedAt,
                    expiresAt,
                    scope: request.scope || [],
                    metadata: request.metadata || {}
                };
                // Create signature
                const signature = createSignature(tokenData, secretKey);
                const signoffToken = {
                    ...tokenData,
                    signature
                };
                // Save token
                await saveToken(signoffToken);
                logger.info(`Signoff token generated: ${tokenId} for sprint ${request.sprintId}`);
                return signoffToken;
            }
            catch (error) {
                logger.error('Token generation failed:', error);
                throw error;
            }
        },
        async validateToken(tokenValue, requiredScope) {
            try {
                const tokens = await loadTokens();
                const token = tokens.find(t => t.token === tokenValue);
                if (!token) {
                    return {
                        valid: false,
                        error: 'Token not found'
                    };
                }
                // Check expiration
                if (new Date(token.expiresAt) < new Date()) {
                    return {
                        valid: false,
                        error: 'Token expired',
                        expired: true
                    };
                }
                // Verify signature
                const expectedSignature = createSignature(token, secretKey);
                if (token.signature !== expectedSignature) {
                    return {
                        valid: false,
                        error: 'Invalid signature'
                    };
                }
                // Check scope if required
                if (requiredScope && requiredScope.length > 0) {
                    const hasRequiredScope = requiredScope.every(scope => token.scope.includes(scope));
                    if (!hasRequiredScope) {
                        return {
                            valid: false,
                            error: 'Insufficient scope',
                            scopeMismatch: true
                        };
                    }
                }
                return {
                    valid: true,
                    token
                };
            }
            catch (error) {
                logger.error('Token validation failed:', error);
                return {
                    valid: false,
                    error: 'Validation failed'
                };
            }
        },
        async listTokens() {
            try {
                const tokens = await loadTokens();
                return tokens.sort((a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime());
            }
            catch (error) {
                logger.error('Failed to list tokens:', error);
                return [];
            }
        },
        async revokeToken(tokenId) {
            try {
                const tokens = await loadTokens();
                const tokenIndex = tokens.findIndex(t => t.id === tokenId);
                if (tokenIndex === -1) {
                    return false;
                }
                tokens.splice(tokenIndex, 1);
                await saveTokens(tokens);
                logger.info(`Token revoked: ${tokenId}`);
                return true;
            }
            catch (error) {
                logger.error('Token revocation failed:', error);
                return false;
            }
        },
        async cleanupExpiredTokens() {
            try {
                const tokens = await loadTokens();
                const now = new Date();
                const validTokens = tokens.filter(t => new Date(t.expiresAt) > now);
                const expiredCount = tokens.length - validTokens.length;
                if (expiredCount > 0) {
                    await saveTokens(validTokens);
                    logger.info(`Cleaned up ${expiredCount} expired tokens`);
                }
                return expiredCount;
            }
            catch (error) {
                logger.error('Token cleanup failed:', error);
                return 0;
            }
        }
    });
    // Register routes
    fastify.post('/signoff/generate', {
        schema: {
            body: typebox_1.Type.Object({
                sprintId: typebox_1.Type.String(),
                sprintName: typebox_1.Type.String(),
                approvedBy: typebox_1.Type.String(),
                scope: typebox_1.Type.Array(typebox_1.Type.String()),
                metadata: typebox_1.Type.Optional(typebox_1.Type.Record(typebox_1.Type.String(), typebox_1.Type.Any())),
                expiresInHours: typebox_1.Type.Optional(typebox_1.Type.Number())
            }),
            response: {
                200: typebox_1.Type.Object({
                    success: typebox_1.Type.Boolean(),
                    token: typebox_1.Type.Object({
                        id: typebox_1.Type.String(),
                        token: typebox_1.Type.String(),
                        sprintId: typebox_1.Type.String(),
                        sprintName: typebox_1.Type.String(),
                        approvedBy: typebox_1.Type.String(),
                        approvedAt: typebox_1.Type.String(),
                        expiresAt: typebox_1.Type.String(),
                        scope: typebox_1.Type.Array(typebox_1.Type.String()),
                        metadata: typebox_1.Type.Record(typebox_1.Type.String(), typebox_1.Type.Any()),
                        signature: typebox_1.Type.String()
                    }),
                    message: typebox_1.Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            const signoffRequest = request.body;
            const token = await fastify.signoff.generateToken(signoffRequest);
            return {
                success: true,
                token,
                message: 'Signoff token generated successfully'
            };
        }
        catch (error) {
            logger.error('Token generation failed:', error);
            reply.status(500).send({ error: 'Token generation failed' });
        }
    });
    fastify.post('/signoff/validate', {
        schema: {
            body: typebox_1.Type.Object({
                token: typebox_1.Type.String(),
                requiredScope: typebox_1.Type.Optional(typebox_1.Type.Array(typebox_1.Type.String()))
            }),
            response: {
                200: typebox_1.Type.Object({
                    valid: typebox_1.Type.Boolean(),
                    token: typebox_1.Type.Optional(typebox_1.Type.Object({
                        id: typebox_1.Type.String(),
                        sprintId: typebox_1.Type.String(),
                        sprintName: typebox_1.Type.String(),
                        approvedBy: typebox_1.Type.String(),
                        approvedAt: typebox_1.Type.String(),
                        expiresAt: typebox_1.Type.String(),
                        scope: typebox_1.Type.Array(typebox_1.Type.String()),
                        metadata: typebox_1.Type.Record(typebox_1.Type.String(), typebox_1.Type.Any())
                    })),
                    error: typebox_1.Type.Optional(typebox_1.Type.String()),
                    expired: typebox_1.Type.Optional(typebox_1.Type.Boolean()),
                    scopeMismatch: typebox_1.Type.Optional(typebox_1.Type.Boolean())
                })
            }
        }
    }, async (request, reply) => {
        try {
            const { token, requiredScope } = request.body;
            const validation = await fastify.signoff.validateToken(token, requiredScope);
            return validation;
        }
        catch (error) {
            logger.error('Token validation failed:', error);
            reply.status(500).send({ error: 'Token validation failed' });
        }
    });
    fastify.get('/signoff/tokens', {
        schema: {
            response: {
                200: typebox_1.Type.Array(typebox_1.Type.Object({
                    id: typebox_1.Type.String(),
                    sprintId: typebox_1.Type.String(),
                    sprintName: typebox_1.Type.String(),
                    approvedBy: typebox_1.Type.String(),
                    approvedAt: typebox_1.Type.String(),
                    expiresAt: typebox_1.Type.String(),
                    scope: typebox_1.Type.Array(typebox_1.Type.String()),
                    metadata: typebox_1.Type.Record(typebox_1.Type.String(), typebox_1.Type.Any())
                }))
            }
        }
    }, async (request, reply) => {
        try {
            const tokens = await fastify.signoff.listTokens();
            // Don't return the actual token values for security
            return tokens.map((t) => ({
                id: t.id,
                sprintId: t.sprintId,
                sprintName: t.sprintName,
                approvedBy: t.approvedBy,
                approvedAt: t.approvedAt,
                expiresAt: t.expiresAt,
                scope: t.scope,
                metadata: t.metadata
            }));
        }
        catch (error) {
            logger.error('Failed to list tokens:', error);
            reply.status(500).send({ error: 'Failed to list tokens' });
        }
    });
    fastify.delete('/signoff/tokens/:id', {
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
            const success = await fastify.signoff.revokeToken(id);
            return {
                success,
                message: success ? 'Token revoked successfully' : 'Token not found'
            };
        }
        catch (error) {
            logger.error('Token revocation failed:', error);
            reply.status(500).send({ error: 'Token revocation failed' });
        }
    });
    fastify.post('/signoff/cleanup', {
        schema: {
            response: {
                200: typebox_1.Type.Object({
                    success: typebox_1.Type.Boolean(),
                    expiredCount: typebox_1.Type.Number(),
                    message: typebox_1.Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            const expiredCount = await fastify.signoff.cleanupExpiredTokens();
            return {
                success: true,
                expiredCount,
                message: `Cleaned up ${expiredCount} expired tokens`
            };
        }
        catch (error) {
            logger.error('Token cleanup failed:', error);
            reply.status(500).send({ error: 'Token cleanup failed' });
        }
    });
    // Helper functions
    function createSignature(data, key) {
        const dataString = JSON.stringify(data);
        return crypto.createHmac('sha256', key).update(dataString).digest('hex');
    }
    async function loadTokens() {
        const tokensFile = path.join(process.cwd(), tokensPath);
        if (!fs.existsSync(tokensFile)) {
            return [];
        }
        try {
            const content = fs.readFileSync(tokensFile, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            logger.error('Failed to load tokens:', error);
            return [];
        }
    }
    async function saveToken(token) {
        const tokens = await loadTokens();
        tokens.push(token);
        await saveTokens(tokens);
    }
    async function saveTokens(tokens) {
        const tokensFile = path.join(process.cwd(), tokensPath);
        fs.writeFileSync(tokensFile, JSON.stringify(tokens, null, 2));
    }
};
exports.default = fastifySignoff;
//# sourceMappingURL=fastify-signoff.js.map