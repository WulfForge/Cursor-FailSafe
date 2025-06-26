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
exports.DesignDocumentManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class DesignDocumentManager {
    constructor() {
        this.designDocuments = new Map();
        this.designDocumentIndexes = new Map();
    }
    static getInstance() {
        if (!DesignDocumentManager.instance) {
            DesignDocumentManager.instance = new DesignDocumentManager();
        }
        return DesignDocumentManager.instance;
    }
    async promptForDesignDocument(workspacePath) {
        try {
            const designDocPath = path.join(workspacePath, '.failsafe', 'design-doc.md');
            // Check if design document already exists
            if (fs.existsSync(designDocPath)) {
                return await this.getDesignDocument(workspacePath);
            }
            // Prompt user to create design document
            const createDesignDoc = await vscode.window.showInformationMessage('No design document found. Would you like to create one?', 'Yes', 'No');
            if (createDesignDoc === 'Yes') {
                return await this.createDesignDocument(workspacePath);
            }
            return null;
        }
        catch (error) {
            console.error('Error prompting for design document:', error);
            return null;
        }
    }
    async getDesignDocument(workspacePath) {
        try {
            const designDocPath = path.join(workspacePath, '.failsafe', 'design-doc.md');
            if (!fs.existsSync(designDocPath)) {
                return null;
            }
            const content = fs.readFileSync(designDocPath, 'utf8');
            const designDoc = this.parseDesignDocument(content, workspacePath);
            if (designDoc) {
                this.designDocuments.set(workspacePath, designDoc);
            }
            return designDoc;
        }
        catch (error) {
            console.error('Error getting design document:', error);
            return null;
        }
    }
    async createDesignDocument(workspacePath) {
        try {
            const designDoc = {
                id: `design-doc-${Date.now()}`,
                version: '1.0.0',
                createdAt: new Date(),
                updatedAt: new Date(),
                projectPurpose: '',
                audience: '',
                stylingPrinciples: '',
                themeAffinities: [],
                keyFeatures: [],
                requiredBehaviors: [],
                visualReferences: [],
                interactionConstraints: [],
                securityConsiderations: [],
                complianceRequirements: [],
                metadata: {
                    workspacePath,
                    extensionVersion: '2.5.2'
                }
            };
            await this.saveDesignDocument(workspacePath, designDoc);
            return designDoc;
        }
        catch (error) {
            console.error('Error creating design document:', error);
            return null;
        }
    }
    async saveDesignDocument(workspacePath, designDoc) {
        try {
            const failsafeDir = path.join(workspacePath, '.failsafe');
            // Create .failsafe directory if it doesn't exist
            if (!fs.existsSync(failsafeDir)) {
                fs.mkdirSync(failsafeDir, { recursive: true });
            }
            const designDocPath = path.join(failsafeDir, 'design-doc.md');
            const content = this.generateDesignDocumentHTML(designDoc);
            fs.writeFileSync(designDocPath, content, 'utf8');
            designDoc.updatedAt = new Date();
            this.designDocuments.set(workspacePath, designDoc);
            return true;
        }
        catch (error) {
            console.error('Error saving design document:', error);
            return false;
        }
    }
    generateDesignDocumentHTML(designDoc) {
        return `# Design Document

## Project Purpose
${designDoc.projectPurpose || 'To be defined'}

## Audience
${designDoc.audience || 'To be defined'}

## Styling Principles
${designDoc.stylingPrinciples || 'To be defined'}

## Theme Affinities
${designDoc.themeAffinities.join(', ') || 'To be defined'}

## Key Features
${designDoc.keyFeatures.map(feature => `- ${feature}`).join('\n') || 'To be defined'}

## Required Behaviors
${designDoc.requiredBehaviors.map(behavior => `- ${behavior}`).join('\n') || 'To be defined'}

## Visual References
${designDoc.visualReferences.map(ref => `- ${ref}`).join('\n') || 'To be defined'}

## Interaction Constraints
${designDoc.interactionConstraints.map(constraint => `- ${constraint}`).join('\n') || 'To be defined'}

## Security Considerations
${designDoc.securityConsiderations.map(security => `- ${security}`).join('\n') || 'To be defined'}

## Compliance Requirements
${designDoc.complianceRequirements.map(compliance => `- ${compliance}`).join('\n') || 'To be defined'}

## Metadata
- ID: ${designDoc.id}
- Version: ${designDoc.version}
- Created: ${designDoc.createdAt.toISOString()}
- Updated: ${designDoc.updatedAt.toISOString()}
- Workspace: ${designDoc.metadata.workspacePath}
- Extension Version: ${designDoc.metadata.extensionVersion}
`;
    }
    parseDesignDocument(content, workspacePath) {
        try {
            // Simple parsing - in a real implementation, you'd want more robust parsing
            const lines = content.split('\n');
            const designDoc = {
                id: `design-doc-${Date.now()}`,
                version: '1.0.0',
                createdAt: new Date(),
                updatedAt: new Date(),
                projectPurpose: '',
                audience: '',
                stylingPrinciples: '',
                themeAffinities: [],
                keyFeatures: [],
                requiredBehaviors: [],
                visualReferences: [],
                interactionConstraints: [],
                securityConsiderations: [],
                complianceRequirements: [],
                metadata: {
                    workspacePath,
                    extensionVersion: '2.5.2'
                }
            };
            // Basic parsing logic
            let currentSection = '';
            for (const line of lines) {
                if (line.startsWith('## ')) {
                    currentSection = line.substring(3).toLowerCase();
                }
                else if (line.startsWith('- ') && currentSection) {
                    const item = line.substring(2);
                    switch (currentSection) {
                        case 'key features':
                            designDoc.keyFeatures.push(item);
                            break;
                        case 'required behaviors':
                            designDoc.requiredBehaviors.push(item);
                            break;
                        case 'visual references':
                            designDoc.visualReferences.push(item);
                            break;
                        case 'interaction constraints':
                            designDoc.interactionConstraints.push(item);
                            break;
                        case 'security considerations':
                            designDoc.securityConsiderations.push(item);
                            break;
                        case 'compliance requirements':
                            designDoc.complianceRequirements.push(item);
                            break;
                    }
                }
                else if (line.trim() && !line.startsWith('#') && !line.startsWith('-')) {
                    switch (currentSection) {
                        case 'project purpose':
                            designDoc.projectPurpose = line.trim();
                            break;
                        case 'audience':
                            designDoc.audience = line.trim();
                            break;
                        case 'styling principles':
                            designDoc.stylingPrinciples = line.trim();
                            break;
                        case 'theme affinities':
                            designDoc.themeAffinities = line.split(',').map(t => t.trim());
                            break;
                    }
                }
            }
            return designDoc;
        }
        catch (error) {
            console.error('Error parsing design document:', error);
            return null;
        }
    }
    async validateDesignDocument(workspacePath) {
        try {
            const designDoc = await this.getDesignDocument(workspacePath);
            if (!designDoc) {
                return {
                    isValid: false,
                    driftDetected: false,
                    driftScore: 0,
                    missingFeatures: [],
                    outdatedFeatures: [],
                    recommendations: ['Design document not found']
                };
            }
            // Basic validation logic
            const missingFeatures = [];
            const outdatedFeatures = [];
            const recommendations = [];
            if (!designDoc.projectPurpose) {
                missingFeatures.push('Project Purpose');
                recommendations.push('Define the project purpose');
            }
            if (!designDoc.audience) {
                missingFeatures.push('Audience');
                recommendations.push('Define the target audience');
            }
            if (designDoc.keyFeatures.length === 0) {
                missingFeatures.push('Key Features');
                recommendations.push('Define key features');
            }
            const driftScore = missingFeatures.length * 10; // Simple scoring
            return {
                isValid: missingFeatures.length === 0,
                driftDetected: driftScore > 0,
                driftScore,
                missingFeatures,
                outdatedFeatures,
                recommendations
            };
        }
        catch (error) {
            console.error('Error validating design document:', error);
            return {
                isValid: false,
                driftDetected: true,
                driftScore: 100,
                missingFeatures: [],
                outdatedFeatures: [],
                recommendations: ['Error validating design document']
            };
        }
    }
    async getDesignDocumentIndex(workspacePath) {
        try {
            const indexPath = path.join(workspacePath, '.failsafe', 'design-doc-index.json');
            if (!fs.existsSync(indexPath)) {
                return null;
            }
            const content = fs.readFileSync(indexPath, 'utf8');
            return JSON.parse(content);
        }
        catch (error) {
            console.error('Error getting design document index:', error);
            return null;
        }
    }
    async saveDesignDocumentIndex(workspacePath, index) {
        try {
            const failsafeDir = path.join(workspacePath, '.failsafe');
            if (!fs.existsSync(failsafeDir)) {
                fs.mkdirSync(failsafeDir, { recursive: true });
            }
            const indexPath = path.join(failsafeDir, 'design-doc-index.json');
            fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
            this.designDocumentIndexes.set(workspacePath, index);
            return true;
        }
        catch (error) {
            console.error('Error saving design document index:', error);
            return false;
        }
    }
}
exports.DesignDocumentManager = DesignDocumentManager;
//# sourceMappingURL=designDocumentManager.js.map