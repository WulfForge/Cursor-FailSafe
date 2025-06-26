// Mock VS Code API for testing
const vscode = {
  window: {
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showInputBox: jest.fn(),
    showQuickPick: jest.fn(),
    createWebviewPanel: jest.fn(),
    activeTextEditor: null,
    setStatusBarMessage: jest.fn(),
  },
  workspace: {
    workspaceFolders: [
      {
        uri: {
          fsPath: '/mock/workspace'
        },
        name: 'mock-workspace'
      }
    ],
    getConfiguration: jest.fn(() => ({
      get: jest.fn(),
      update: jest.fn(),
    })),
    openTextDocument: jest.fn(),
    createFileSystemWatcher: jest.fn(() => ({
      onDidChange: jest.fn(),
      onDidCreate: jest.fn(),
      onDidDelete: jest.fn(),
    })),
  },
  commands: {
    registerCommand: jest.fn(),
  },
  ViewColumn: {
    One: 1,
    Two: 2,
    Three: 3,
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
  Uri: {
    file: jest.fn((path) => ({ fsPath: path })),
  },
  extensions: {
    all: [],
  },
  version: '1.0.0',
  ExtensionContext: class MockExtensionContext {
    constructor() {
      this.subscriptions = [];
      this.globalState = {
        get: jest.fn(),
        update: jest.fn(),
      };
      this.workspaceState = {
        get: jest.fn(),
        update: jest.fn(),
      };
      this.extensionPath = '/mock/extension/path';
      this.globalStoragePath = '/mock/global/storage';
      this.workspaceStoragePath = '/mock/workspace/storage';
      this.storagePath = '/mock/storage';
      this.extensionUri = { fsPath: '/mock/extension/path' };
      this.extensionMode = 1; // ExtensionMode.Test
    }
  },
  ExtensionMode: {
    Production: 1,
    Development: 2,
    Test: 3,
  },
};

module.exports = vscode; 