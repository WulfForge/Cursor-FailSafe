import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Logger } from '../logger';

interface SignoffOptions {
    logger: Logger;
    tokensPath?: string;
    secretKey?: string;
}

interface SignoffToken {
    id: string;
    token: string;
    sprintId: string;
    sprintName: string;
    approvedBy: string;
    approvedAt: string;
    expiresAt: string;
    scope: string[];
    metadata: Record<string, any>;
    signature: string;
}

interface SignoffRequest {
    sprintId: string;
    sprintName: string;
    approvedBy: string;
    scope: string[];
    metadata?: Record<string, any>;
    expiresInHours?: number;
}

interface SignoffValidation {
    valid: boolean;
    token?: SignoffToken;
    error?: string;
    expired?: boolean;
    scopeMismatch?: boolean;
}

const fastifySignoff: FastifyPluginAsync<SignoffOptions> = async (fastify, options) => {
    const { logger, tokensPath = '.failsafe/signoff-tokens.json', secretKey = process.env.FAILSAFE_SECRET_KEY || 'default-secret-key' } = options;

    // Ensure tokens directory exists
    const tokensDir = path.dirname(path.join(process.cwd(), tokensPath));
    if (!fs.existsSync(tokensDir)) {
        fs.mkdirSync(tokensDir, { recursive: true });
    }

    // Decorate fastify with signoff functionality
    fastify.decorate('signoff', {
        async generateToken(request: SignoffRequest): Promise<SignoffToken> {
            try {
                const tokenId = `signoff-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
                const tokenValue = crypto.randomBytes(32).toString('hex');
                const approvedAt = new Date().toISOString();
                const expiresInHours = request.expiresInHours || 24;
                const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
                
                const tokenData: Omit<SignoffToken, 'signature'> = {
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
                
                const signoffToken: SignoffToken = {
                    ...tokenData,
                    signature
                };
                
                // Save token
                await saveToken(signoffToken);
                
                logger.info(`Signoff token generated: ${tokenId} for sprint ${request.sprintId}`);
                return signoffToken;
                
            } catch (error) {
                logger.error('Token generation failed:', error);
                throw error;
            }
        },

        async validateToken(tokenValue: string, requiredScope?: string[]): Promise<SignoffValidation> {
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
                
            } catch (error) {
                logger.error('Token validation failed:', error);
                return {
                    valid: false,
                    error: 'Validation failed'
                };
            }
        },

        async listTokens(): Promise<SignoffToken[]> {
            try {
                const tokens = await loadTokens();
                return tokens.sort((a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime());
            } catch (error) {
                logger.error('Failed to list tokens:', error);
                return [];
            }
        },

        async revokeToken(tokenId: string): Promise<boolean> {
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
                
            } catch (error) {
                logger.error('Token revocation failed:', error);
                return false;
            }
        },

        async cleanupExpiredTokens(): Promise<number> {
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
                
            } catch (error) {
                logger.error('Token cleanup failed:', error);
                return 0;
            }
        }
    });

    // Register routes
    fastify.post('/signoff/generate', {
        schema: {
            body: Type.Object({
                sprintId: Type.String(),
                sprintName: Type.String(),
                approvedBy: Type.String(),
                scope: Type.Array(Type.String()),
                metadata: Type.Optional(Type.Record(Type.String(), Type.Any())),
                expiresInHours: Type.Optional(Type.Number())
            }),
            response: {
                200: Type.Object({
                    success: Type.Boolean(),
                    token: Type.Object({
                        id: Type.String(),
                        token: Type.String(),
                        sprintId: Type.String(),
                        sprintName: Type.String(),
                        approvedBy: Type.String(),
                        approvedAt: Type.String(),
                        expiresAt: Type.String(),
                        scope: Type.Array(Type.String()),
                        metadata: Type.Record(Type.String(), Type.Any()),
                        signature: Type.String()
                    }),
                    message: Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            const signoffRequest = request.body as SignoffRequest;
            const token = await (fastify as any).signoff.generateToken(signoffRequest);
            
            return {
                success: true,
                token,
                message: 'Signoff token generated successfully'
            };
        } catch (error) {
            logger.error('Token generation failed:', error);
            reply.status(500).send({ error: 'Token generation failed' });
        }
    });

    fastify.post('/signoff/validate', {
        schema: {
            body: Type.Object({
                token: Type.String(),
                requiredScope: Type.Optional(Type.Array(Type.String()))
            }),
            response: {
                200: Type.Object({
                    valid: Type.Boolean(),
                    token: Type.Optional(Type.Object({
                        id: Type.String(),
                        sprintId: Type.String(),
                        sprintName: Type.String(),
                        approvedBy: Type.String(),
                        approvedAt: Type.String(),
                        expiresAt: Type.String(),
                        scope: Type.Array(Type.String()),
                        metadata: Type.Record(Type.String(), Type.Any())
                    })),
                    error: Type.Optional(Type.String()),
                    expired: Type.Optional(Type.Boolean()),
                    scopeMismatch: Type.Optional(Type.Boolean())
                })
            }
        }
    }, async (request, reply) => {
        try {
            const { token, requiredScope } = request.body as { token: string; requiredScope?: string[] };
            const validation = await (fastify as any).signoff.validateToken(token, requiredScope);
            
            return validation;
        } catch (error) {
            logger.error('Token validation failed:', error);
            reply.status(500).send({ error: 'Token validation failed' });
        }
    });

    fastify.get('/signoff/tokens', {
        schema: {
            response: {
                200: Type.Array(Type.Object({
                    id: Type.String(),
                    sprintId: Type.String(),
                    sprintName: Type.String(),
                    approvedBy: Type.String(),
                    approvedAt: Type.String(),
                    expiresAt: Type.String(),
                    scope: Type.Array(Type.String()),
                    metadata: Type.Record(Type.String(), Type.Any())
                }))
            }
        }
    }, async (request, reply) => {
        try {
            const tokens = await (fastify as any).signoff.listTokens();
            // Don't return the actual token values for security
            return tokens.map((t: SignoffToken) => ({
                id: t.id,
                sprintId: t.sprintId,
                sprintName: t.sprintName,
                approvedBy: t.approvedBy,
                approvedAt: t.approvedAt,
                expiresAt: t.expiresAt,
                scope: t.scope,
                metadata: t.metadata
            }));
        } catch (error) {
            logger.error('Failed to list tokens:', error);
            reply.status(500).send({ error: 'Failed to list tokens' });
        }
    });

    fastify.delete('/signoff/tokens/:id', {
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
            const success = await (fastify as any).signoff.revokeToken(id);
            
            return {
                success,
                message: success ? 'Token revoked successfully' : 'Token not found'
            };
        } catch (error) {
            logger.error('Token revocation failed:', error);
            reply.status(500).send({ error: 'Token revocation failed' });
        }
    });

    fastify.post('/signoff/cleanup', {
        schema: {
            response: {
                200: Type.Object({
                    success: Type.Boolean(),
                    expiredCount: Type.Number(),
                    message: Type.String()
                })
            }
        }
    }, async (request, reply) => {
        try {
            const expiredCount = await (fastify as any).signoff.cleanupExpiredTokens();
            
            return {
                success: true,
                expiredCount,
                message: `Cleaned up ${expiredCount} expired tokens`
            };
        } catch (error) {
            logger.error('Token cleanup failed:', error);
            reply.status(500).send({ error: 'Token cleanup failed' });
        }
    });

    // Helper functions
    function createSignature(data: any, key: string): string {
        const dataString = JSON.stringify(data);
        return crypto.createHmac('sha256', key).update(dataString).digest('hex');
    }

    async function loadTokens(): Promise<SignoffToken[]> {
        const tokensFile = path.join(process.cwd(), tokensPath);
        
        if (!fs.existsSync(tokensFile)) {
            return [];
        }
        
        try {
            const content = fs.readFileSync(tokensFile, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            logger.error('Failed to load tokens:', error);
            return [];
        }
    }

    async function saveToken(token: SignoffToken): Promise<void> {
        const tokens = await loadTokens();
        tokens.push(token);
        await saveTokens(tokens);
    }

    async function saveTokens(tokens: SignoffToken[]): Promise<void> {
        const tokensFile = path.join(process.cwd(), tokensPath);
        fs.writeFileSync(tokensFile, JSON.stringify(tokens, null, 2));
    }
};

export default fastifySignoff; 