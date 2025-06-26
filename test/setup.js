// Jest setup file
const fs = require('fs');
const path = require('path');

// Mock console methods
global.console = {
  ...console,
  // Uncomment to ignore console.log during tests
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock file system operations for tests
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  rmSync: jest.fn(),
  statSync: jest.fn(),
  readdirSync: jest.fn(),
};

// Default mock implementations
mockFs.existsSync.mockReturnValue(false);
mockFs.readFileSync.mockReturnValue('{}');
mockFs.writeFileSync.mockImplementation(() => {});
mockFs.mkdirSync.mockImplementation(() => {});
mockFs.rmSync.mockImplementation(() => {});
mockFs.statSync.mockReturnValue({ isFile: () => true, isDirectory: () => false });
mockFs.readdirSync.mockReturnValue([]);

// Mock fs module
jest.mock('fs', () => mockFs);

// Mock path module
jest.mock('path', () => ({
  ...path,
  join: (...args) => args.join('/'),
  dirname: (filePath) => filePath.split('/').slice(0, -1).join('/'),
  extname: (filePath) => {
    const ext = filePath.split('.').pop();
    return ext && ext !== filePath ? `.${ext}` : '';
  },
}));

// Create test workspace directory
const testWorkspaceRoot = path.join(__dirname, 'test-workspace');
if (!fs.existsSync(testWorkspaceRoot)) {
  fs.mkdirSync(testWorkspaceRoot, { recursive: true });
}

// Global test utilities
global.testUtils = {
  mockFs,
  testWorkspaceRoot,
  createMockFile: (filePath, content = '') => {
    mockFs.existsSync.mockImplementation((path) => {
      return path === filePath || path.startsWith(testWorkspaceRoot);
    });
    mockFs.readFileSync.mockImplementation((path) => {
      if (path === filePath) return content;
      return '{}';
    });
  },
  resetMocks: () => {
    mockFs.existsSync.mockClear();
    mockFs.readFileSync.mockClear();
    mockFs.writeFileSync.mockClear();
    mockFs.mkdirSync.mockClear();
    mockFs.rmSync.mockClear();
    mockFs.statSync.mockClear();
    mockFs.readdirSync.mockClear();
  }
};

// Cleanup after each test
afterEach(() => {
  global.testUtils.resetMocks();
}); 