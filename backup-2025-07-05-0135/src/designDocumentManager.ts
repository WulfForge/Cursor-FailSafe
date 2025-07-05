import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DesignDocument, DesignDocumentIndex, DesignDocumentValidation } from './types';

export class DesignDocumentManager {
    private static instance: DesignDocumentManager;
    private readonly designDocuments: Map<string, DesignDocument> = new Map();
    private readonly designDocumentIndexes: Map<string, DesignDocumentIndex> = new Map();

    private constructor() {}

    static getInstance(): DesignDocumentManager {
        if (!DesignDocumentManager.instance) {
            DesignDocumentManager.instance = new DesignDocumentManager();
        }
        return DesignDocumentManager.instance;
    }

    async promptForDesignDocument(workspacePath: string): Promise<DesignDocument | null> {
        try {
            // First check for o3-accountable.md in the root directory
            const o3AccountablePath = path.join(workspacePath, 'o3-accountable.md');
            if (fs.existsSync(o3AccountablePath)) {
                return await this.getDesignDocument(workspacePath);
            }
            
            // Then check for the original .failsafe/design-doc.md location
            const designDocPath = path.join(workspacePath, '.failsafe', 'design-doc.md');
            
            // Check if design document already exists
            if (fs.existsSync(designDocPath)) {
                return await this.getDesignDocument(workspacePath);
            }

            // Prompt user to create design document
            const createDesignDoc = await vscode.window.showInformationMessage(
                'No design document found. Would you like to create one?',
                'Yes', 'No'
            );

            if (createDesignDoc === 'Yes') {
                return await this.createDesignDocument(workspacePath);
            }

            return null;
        } catch (error) {
            console.error('Error prompting for design document:', error);
            return null;
        }
    }

    async getDesignDocument(workspacePath: string): Promise<DesignDocument | null> {
        try {
            // First check for o3-accountable.md in the root directory
            const o3AccountablePath = path.join(workspacePath, 'o3-accountable.md');
            if (fs.existsSync(o3AccountablePath)) {
                const content = fs.readFileSync(o3AccountablePath, 'utf8');
                const designDoc = this.parseDesignDocument(content, workspacePath);
                
                if (designDoc) {
                    this.designDocuments.set(workspacePath, designDoc);
                }
                
                return designDoc;
            }
            
            // Fall back to the original .failsafe/design-doc.md location
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
        } catch (error) {
            console.error('Error getting design document:', error);
            return null;
        }
    }

    async createDesignDocument(workspacePath: string): Promise<DesignDocument | null> {
        try {
            const designDoc: DesignDocument = {
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
        } catch (error) {
            console.error('Error creating design document:', error);
            return null;
        }
    }

    async saveDesignDocument(workspacePath: string, designDoc: DesignDocument): Promise<boolean> {
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
        } catch (error) {
            console.error('Error saving design document:', error);
            return false;
        }
    }

    generateDesignDocumentHTML(designDoc: DesignDocument): string {
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

    private parseDesignDocument(content: string, workspacePath: string): DesignDocument | null {
        try {
            // Simple parsing - in a real implementation, you'd want more robust parsing
            const lines = content.split('\n');
            const designDoc: DesignDocument = {
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

            // Enhanced parsing logic for o3-accountable.md format
            let currentSection = '';
            let sectionContent: string[] = [];
            
            for (const line of lines) {
                if (line.startsWith('# ')) {
                    // Main title - extract version if present
                    const titleMatch = line.match(/v(\d+\.\d+\.\d+)/);
                    if (titleMatch) {
                        designDoc.version = titleMatch[1];
                    }
                } else if (line.startsWith('## ')) {
                    // Save previous section content
                    if (currentSection && sectionContent.length > 0) {
                        this.processSectionContent(currentSection, sectionContent, designDoc);
                    }
                    
                    currentSection = line.substring(3).toLowerCase();
                    sectionContent = [];
                } else if (line.trim() && !line.startsWith('---')) {
                    sectionContent.push(line.trim());
                }
            }
            
            // Process the last section
            if (currentSection && sectionContent.length > 0) {
                this.processSectionContent(currentSection, sectionContent, designDoc);
            }

            return designDoc;
        } catch (error) {
            console.error('Error parsing design document:', error);
            return null;
        }
    }

    private processSectionContent(section: string, content: string[], designDoc: DesignDocument): void {
        const contentText = content.join(' ');
        
        switch (section) {
            case '1 purpose':
                designDoc.projectPurpose = contentText;
                break;
            case '2 guiding principles':
                designDoc.stylingPrinciples = contentText;
                // Extract key principles as features
                content.forEach(line => {
                    if (line.match(/^\d+\./)) {
                        const principle = line.replace(/^\d+\.\s*/, '');
                        designDoc.keyFeatures.push(principle);
                    }
                });
                break;
            case '3 high level architecture':
                // Extract architecture components as features
                const archMatch = contentText.match(/VS Code UI WebView.*?Fastify Server/);
                if (archMatch) {
                    designDoc.keyFeatures.push('VS Code UI WebView Integration');
                    designDoc.keyFeatures.push('Fastify Server Backend');
                }
                break;
            case '4 fastify usage':
                // Extract Fastify features
                designDoc.keyFeatures.push('Fastify Plugin System');
                designDoc.keyFeatures.push('Built-in AJV Schemas');
                designDoc.keyFeatures.push('Lifecycle Hooks');
                designDoc.keyFeatures.push('Pino Logging');
                break;
            case '5 api surface':
                // Extract API endpoints as features
                const apiEndpoints = contentText.match(/\/\w+/g);
                if (apiEndpoints) {
                    apiEndpoints.forEach(endpoint => {
                        designDoc.keyFeatures.push(`API Endpoint: ${endpoint}`);
                    });
                }
                break;
            case '6 data models':
                designDoc.keyFeatures.push('JSON Data Storage');
                designDoc.keyFeatures.push('Rule Management');
                designDoc.keyFeatures.push('Sprint Tracking');
                designDoc.keyFeatures.push('Task Management');
                break;
            case '7 ui binding':
                designDoc.keyFeatures.push('MythologIQ Theme Integration');
                designDoc.keyFeatures.push('WCAG AA Compliance');
                designDoc.keyFeatures.push('Branded Header/Footer');
                break;
            case '8 extension development workflow':
                designDoc.keyFeatures.push('TypeScript Development');
                designDoc.keyFeatures.push('Jest Testing');
                designDoc.keyFeatures.push('VSIX Packaging');
                break;
            case '9 non‑functional requirements':
                // Extract requirements as behaviors
                content.forEach(line => {
                    if (line.includes('–')) {
                        const [requirement, description] = line.split('–').map(s => s.trim());
                        if (requirement && description) {
                            designDoc.requiredBehaviors.push(`${requirement}: ${description}`);
                        }
                    }
                });
                break;
        }
    }

    async validateDesignDocument(workspacePath: string): Promise<DesignDocumentValidation> {
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
            const missingFeatures: string[] = [];
            const outdatedFeatures: string[] = [];
            const recommendations: string[] = [];

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
        } catch (error) {
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

    async getDesignDocumentIndex(workspacePath: string): Promise<DesignDocumentIndex | null> {
        try {
            const indexPath = path.join(workspacePath, '.failsafe', 'design-doc-index.json');
            
            if (!fs.existsSync(indexPath)) {
                return null;
            }

            const content = fs.readFileSync(indexPath, 'utf8');
            return JSON.parse(content) as DesignDocumentIndex;
        } catch (error) {
            console.error('Error getting design document index:', error);
            return null;
        }
    }

    async saveDesignDocumentIndex(workspacePath: string, index: DesignDocumentIndex): Promise<boolean> {
        try {
            const failsafeDir = path.join(workspacePath, '.failsafe');
            
            if (!fs.existsSync(failsafeDir)) {
                fs.mkdirSync(failsafeDir, { recursive: true });
            }

            const indexPath = path.join(failsafeDir, 'design-doc-index.json');
            fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
            
            this.designDocumentIndexes.set(workspacePath, index);
            return true;
        } catch (error) {
            console.error('Error saving design document index:', error);
            return false;
        }
    }
} 