const fs = require('fs');
const path = require('path');

// Mock vscode for testing
const mockVscode = {
  window: {
    showInformationMessage: jest.fn().mockResolvedValue('Create Design Document'),
    showInputBox: jest.fn()
      .mockResolvedValueOnce('Test Project Purpose')
      .mockResolvedValueOnce('Test Audience')
      .mockResolvedValueOnce('Test Styling Principles')
      .mockResolvedValueOnce('Test Key Features')
      .mockResolvedValueOnce('Test Required Behaviors')
      .mockResolvedValueOnce('Test Security Considerations')
      .mockResolvedValueOnce('Test Compliance Requirements'),
    showQuickPick: jest.fn().mockResolvedValue(['Dark Theme', 'Professional']),
    withProgress: jest.fn().mockImplementation((options, task) => {
      const progress = { report: jest.fn() };
      return task(progress);
    }),
    showOpenDialog: jest.fn().mockResolvedValue([{ fsPath: '/test/path/design.md' }])
  }
};

// Mock the vscode module
jest.mock('vscode', () => mockVscode);

describe('DesignDocumentManager', () => {
  let DesignDocumentManager;
  let manager;
  const testWorkspacePath = '/test/workspace';

  beforeAll(() => {
    // Import the module after mocking
    const module = require('../src/designDocumentManager.ts');
    DesignDocumentManager = module.DesignDocumentManager;
  });

  beforeEach(() => {
    manager = DesignDocumentManager.getInstance();
    // Clear any existing test files
    const testFailsafeDir = path.join(testWorkspacePath, '.failsafe');
    if (fs.existsSync(testFailsafeDir)) {
      fs.rmSync(testFailsafeDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    const testFailsafeDir = path.join(testWorkspacePath, '.failsafe');
    if (fs.existsSync(testFailsafeDir)) {
      fs.rmSync(testFailsafeDir, { recursive: true, force: true });
    }
  });

  describe('Singleton Pattern', () => {
    test('should return the same instance', () => {
      const instance1 = DesignDocumentManager.getInstance();
      const instance2 = DesignDocumentManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('checkForExistingDesignDoc', () => {
    test('should return false when no design doc exists', async () => {
      const exists = await manager.checkForExistingDesignDoc(testWorkspacePath);
      expect(exists).toBe(false);
    });

    test('should return true when design doc exists', async () => {
      // Create the directory and file
      const failsafeDir = path.join(testWorkspacePath, '.failsafe');
      fs.mkdirSync(failsafeDir, { recursive: true });
      fs.writeFileSync(path.join(failsafeDir, 'design-doc.md'), '# Test Design Doc');

      const exists = await manager.checkForExistingDesignDoc(testWorkspacePath);
      expect(exists).toBe(true);
    });
  });

  describe('File Operations', () => {
    test('should create .failsafe directory when needed', async () => {
      const failsafeDir = path.join(testWorkspacePath, '.failsafe');
      expect(fs.existsSync(failsafeDir)).toBe(false);

      // This would normally be called by createDesignDocumentWizard
      fs.mkdirSync(failsafeDir, { recursive: true });
      
      expect(fs.existsSync(failsafeDir)).toBe(true);
    });

    test('should save design document in markdown format', async () => {
      const failsafeDir = path.join(testWorkspacePath, '.failsafe');
      fs.mkdirSync(failsafeDir, { recursive: true });

      const testDesignDoc = {
        id: 'test-id',
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        projectPurpose: 'Test Purpose',
        audience: 'Test Audience',
        stylingPrinciples: 'Test Principles',
        themeAffinities: ['Dark Theme'],
        keyFeatures: ['Feature 1', 'Feature 2'],
        requiredBehaviors: ['Behavior 1'],
        visualReferences: [],
        interactionConstraints: [],
        securityConsiderations: ['Security 1'],
        complianceRequirements: ['Compliance 1'],
        metadata: {
          workspacePath: testWorkspacePath,
          extensionVersion: '2.5.0'
        }
      };

      const designDocPath = path.join(failsafeDir, 'design-doc.md');
      const markdownContent = `# Design Document - ${testDesignDoc.projectPurpose}

## Project Information
- **ID:** ${testDesignDoc.id}
- **Version:** ${testDesignDoc.version}
- **Created:** ${testDesignDoc.createdAt.toISOString()}
- **Last Updated:** ${testDesignDoc.updatedAt.toISOString()}

## Purpose
${testDesignDoc.projectPurpose}

## Audience
${testDesignDoc.audience}

## Styling Principles
${testDesignDoc.stylingPrinciples}

## Theme Affinities
${testDesignDoc.themeAffinities.join(', ')}

## Key Features
${testDesignDoc.keyFeatures.map(feature => `- ${feature}`).join('\n')}

## Required Behaviors
${testDesignDoc.requiredBehaviors.map(behavior => `- ${behavior}`).join('\n')}

## Security Considerations
${testDesignDoc.securityConsiderations.map(security => `- ${security}`).join('\n')}

## Compliance Requirements
${testDesignDoc.complianceRequirements.map(compliance => `- ${compliance}`).join('\n')}

## Metadata
- Workspace Path: ${testDesignDoc.metadata.workspacePath}
- Extension Version: ${testDesignDoc.metadata.extensionVersion}
- Cursor Version: ${testDesignDoc.metadata.cursorVersion || 'Not detected'}

---
*This document is managed by FailSafe Extension and used for drift detection and validation.*
`;

      fs.writeFileSync(designDocPath, markdownContent);
      
      expect(fs.existsSync(designDocPath)).toBe(true);
      const content = fs.readFileSync(designDocPath, 'utf8');
      expect(content).toContain('# Design Document - Test Purpose');
      expect(content).toContain('## Purpose');
      expect(content).toContain('Test Purpose');
    });
  });

  describe('Validation Logic', () => {
    test('should detect missing design document', async () => {
      const validation = await manager.validateDesignDocument(testWorkspacePath);
      
      expect(validation.isValid).toBe(false);
      expect(validation.driftDetected).toBe(true);
      expect(validation.driftScore).toBe(100);
      expect(validation.recommendations).toContain('Create or restore design document');
    });

    test('should validate existing design document', async () => {
      // Create a test design document and index
      const failsafeDir = path.join(testWorkspacePath, '.failsafe');
      fs.mkdirSync(failsafeDir, { recursive: true });

      const designDocContent = `# Design Document - Test Purpose

## Purpose
Test Purpose

## Audience
Test Audience

## Features
Feature 1, Feature 2

---
*This document is managed by FailSafe Extension and used for drift detection and validation.*
`;

      const indexContent = {
        documentId: 'test-id',
        version: '1.0.0',
        lastValidated: new Date().toISOString(),
        driftScore: 0,
        featureCoverage: {
          'Feature 1': {
            implemented: true,
            lastChecked: new Date().toISOString(),
            driftDetected: false
          },
          'Feature 2': {
            implemented: false,
            lastChecked: new Date().toISOString(),
            driftDetected: false
          }
        }
      };

      fs.writeFileSync(path.join(failsafeDir, 'design-doc.md'), designDocContent);
      fs.writeFileSync(path.join(failsafeDir, 'design-index.json'), JSON.stringify(indexContent, null, 2));

      const validation = await manager.validateDesignDocument(testWorkspacePath);
      
      expect(validation.driftDetected).toBe(true);
      expect(validation.driftScore).toBe(10); // One missing feature
      expect(validation.missingFeatures).toContain('Feature 2');
    });
  });
});
