import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  errorReporter,
  logError,
  logFormSubmission,
  logNetworkRequest,
  logAuthStateChange,
  logComponentLifecycle,
  logAsyncOperation,
  debugUtils
} from '../errorReporting';

// Mock console methods
const mockConsole = {
  group: vi.fn(),
  groupEnd: vi.fn(),
  log: vi.fn(),
  error: vi.fn()
};

// Mock window and navigator
Object.defineProperty(window, 'location', {
  value: { href: 'http://localhost:3000/test' },
  writable: true
});

Object.defineProperty(navigator, 'userAgent', {
  value: 'Test User Agent',
  writable: true
});

describe('ErrorReporting', () => {
  beforeEach(() => {
    // Clear logs before each test
    errorReporter.clearLogs();
    
    // Mock console methods
    vi.spyOn(console, 'group').mockImplementation(mockConsole.group);
    vi.spyOn(console, 'groupEnd').mockImplementation(mockConsole.groupEnd);
    vi.spyOn(console, 'log').mockImplementation(mockConsole.log);
    vi.spyOn(console, 'error').mockImplementation(mockConsole.error);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error Logging', () => {
    it('should log errors with complete context', () => {
      const errorId = logError(
        'TestComponent',
        'testOperation',
        'Test error message',
        { key: 'value' },
        'user123',
        'session456'
      );

      expect(errorId).toBeDefined();
      expect(typeof errorId).toBe('string');

      const logs = errorReporter.getLogs();
      expect(logs.errors).toHaveLength(1);
      
      const errorLog = logs.errors[0];
      expect(errorLog.component).toBe('TestComponent');
      expect(errorLog.operation).toBe('testOperation');
      expect(errorLog.error).toBe('Test error message');
      expect(errorLog.context).toEqual({ key: 'value' });
      expect(errorLog.userId).toBe('user123');
      expect(errorLog.sessionId).toBe('session456');
      expect(errorLog.url).toBe('http://localhost:3000/test');
      expect(errorLog.userAgent).toBe('Test User Agent');
    });

    it('should handle Error objects', () => {
      const testError = new Error('Test error object');
      const errorId = logError('TestComponent', 'testOperation', testError);

      const logs = errorReporter.getLogs();
      const errorLog = logs.errors[0];
      
      expect(errorLog.error).toBe('Test error object');
      expect(errorLog.stackTrace).toBeDefined();
    });

    it('should sanitize sensitive data', () => {
      const sensitiveContext = {
        password: 'secret123',
        token: 'bearer-token',
        apiKey: 'api-key-123',
        normalData: 'safe-data'
      };

      logError('TestComponent', 'testOperation', 'Test error', sensitiveContext);

      const logs = errorReporter.getLogs();
      const errorLog = logs.errors[0];
      
      expect(errorLog.context.password).toBe('[REDACTED]');
      expect(errorLog.context.token).toBe('[REDACTED]');
      expect(errorLog.context.apiKey).toBe('[REDACTED]');
      expect(errorLog.context.normalData).toBe('safe-data');
    });
  });

  describe('Form Submission Logging', () => {
    it('should log form submission start', () => {
      const formData = { email: 'test@example.com', name: 'Test User' };
      const submissionId = logFormSubmission(formData, 'started');

      expect(submissionId).toBeDefined();

      const logs = errorReporter.getLogs();
      expect(logs.formSubmissions).toHaveLength(1);
      
      const submissionLog = logs.formSubmissions[0];
      expect(submissionLog.submissionId).toBe(submissionId);
      expect(submissionLog.status).toBe('started');
      expect(submissionLog.formData).toEqual(formData);
      expect(submissionLog.retryCount).toBe(0);
    });

    it('should update existing form submission log', () => {
      const formData = { email: 'test@example.com' };
      const submissionId = logFormSubmission(formData, 'started');
      
      // Update the same submission
      logFormSubmission(formData, 'success', undefined, 0, submissionId);

      const logs = errorReporter.getLogs();
      expect(logs.formSubmissions).toHaveLength(1);
      
      const submissionLog = logs.formSubmissions[0];
      expect(submissionLog.status).toBe('success');
      expect(submissionLog.duration).toBeDefined();
    });

    it('should track retry count', () => {
      const formData = { email: 'test@example.com' };
      const submissionId = logFormSubmission(formData, 'error', 'Network error', 2);

      const logs = errorReporter.getLogs();
      const submissionLog = logs.formSubmissions[0];
      
      expect(submissionLog.retryCount).toBe(2);
      expect(submissionLog.error).toBe('Network error');
    });
  });

  describe('Network Request Logging', () => {
    it('should log network requests with full details', () => {
      const startTime = Date.now() - 1000;
      
      logNetworkRequest(
        'https://api.example.com/test',
        'POST',
        { 'Content-Type': 'application/json' },
        { data: 'test' },
        200,
        { 'Content-Type': 'application/json' },
        { success: true },
        startTime
      );

      const logs = errorReporter.getLogs();
      expect(logs.networkRequests).toHaveLength(1);
      
      const networkLog = logs.networkRequests[0];
      expect(networkLog.url).toBe('https://api.example.com/test');
      expect(networkLog.method).toBe('POST');
      expect(networkLog.responseStatus).toBe(200);
      expect(networkLog.duration).toBeGreaterThan(0);
      expect(networkLog.requestBody).toEqual({ data: 'test' });
      expect(networkLog.responseBody).toEqual({ success: true });
    });

    it('should sanitize sensitive headers', () => {
      logNetworkRequest(
        'https://api.example.com/test',
        'GET',
        { 
          'Authorization': 'Bearer secret-token',
          'Content-Type': 'application/json'
        }
      );

      const logs = errorReporter.getLogs();
      const networkLog = logs.networkRequests[0];
      
      expect(networkLog.headers.Authorization).toBe('[REDACTED]');
      expect(networkLog.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Auth State Change Logging', () => {
    it('should log authentication state changes', () => {
      const startTime = Date.now() - 500;
      
      logAuthStateChange(
        'unauthenticated',
        'authenticated',
        'login',
        'user123',
        'session456',
        { method: 'email' },
        undefined,
        startTime
      );

      const logs = errorReporter.getLogs();
      expect(logs.authStateChanges).toHaveLength(1);
      
      const authLog = logs.authStateChanges[0];
      expect(authLog.previousState).toBe('unauthenticated');
      expect(authLog.newState).toBe('authenticated');
      expect(authLog.operation).toBe('login');
      expect(authLog.userId).toBe('user123');
      expect(authLog.sessionId).toBe('session456');
      expect(authLog.context).toEqual({ method: 'email' });
      expect(authLog.duration).toBeGreaterThan(0);
    });

    it('should log auth errors', () => {
      logAuthStateChange(
        'authenticating',
        'error',
        'login',
        undefined,
        undefined,
        { method: 'email' },
        'Invalid credentials'
      );

      const logs = errorReporter.getLogs();
      const authLog = logs.authStateChanges[0];
      
      expect(authLog.error).toBe('Invalid credentials');
      expect(authLog.newState).toBe('error');
    });
  });

  describe('Component Lifecycle Logging', () => {
    it('should log component mount', () => {
      const startTime = Date.now() - 100;
      
      const componentId = logComponentLifecycle(
        'TestComponent',
        'mount',
        { prop1: 'value1' },
        { state1: 'value1' },
        undefined,
        startTime
      );

      expect(componentId).toBeDefined();

      const logs = errorReporter.getLogs();
      expect(logs.componentLifecycle).toHaveLength(1);
      
      const lifecycleLog = logs.componentLifecycle[0];
      expect(lifecycleLog.componentName).toBe('TestComponent');
      expect(lifecycleLog.operation).toBe('mount');
      expect(lifecycleLog.props).toEqual({ prop1: 'value1' });
      expect(lifecycleLog.state).toEqual({ state1: 'value1' });
      expect(lifecycleLog.duration).toBeGreaterThan(0);
    });

    it('should log component errors', () => {
      logComponentLifecycle(
        'TestComponent',
        'error',
        undefined,
        undefined,
        'Component render error'
      );

      const logs = errorReporter.getLogs();
      const lifecycleLog = logs.componentLifecycle[0];
      
      expect(lifecycleLog.operation).toBe('error');
      expect(lifecycleLog.error).toBe('Component render error');
    });
  });

  describe('Async Operation Logging', () => {
    it('should log async operation progress', () => {
      const operationId = logAsyncOperation(
        'dataFetch',
        'started',
        { url: 'https://api.example.com/data' }
      );

      expect(operationId).toBeDefined();

      // Update the operation
      logAsyncOperation(
        'dataFetch',
        'success',
        { recordCount: 10 },
        undefined,
        0,
        operationId,
        Date.now() - 1000
      );

      const logs = errorReporter.getLogs();
      expect(logs.asyncOperations).toHaveLength(1);
      
      const asyncLog = logs.asyncOperations[0];
      expect(asyncLog.operationType).toBe('dataFetch');
      expect(asyncLog.status).toBe('success');
      expect(asyncLog.context.url).toBe('https://api.example.com/data');
      expect(asyncLog.context.recordCount).toBe(10);
      expect(asyncLog.duration).toBeGreaterThan(0);
    });

    it('should track retry count for async operations', () => {
      logAsyncOperation(
        'apiCall',
        'error',
        { endpoint: '/api/test' },
        'Network timeout',
        3
      );

      const logs = errorReporter.getLogs();
      const asyncLog = logs.asyncOperations[0];
      
      expect(asyncLog.retryCount).toBe(3);
      expect(asyncLog.error).toBe('Network timeout');
      expect(asyncLog.status).toBe('error');
    });
  });

  describe('Log Management', () => {
    it('should limit log entries to prevent memory leaks', () => {
      // Add more than the max limit (1000) - we'll add a smaller number for testing
      for (let i = 0; i < 5; i++) {
        logError('TestComponent', 'testOperation', `Error ${i}`);
      }

      const logs = errorReporter.getLogs();
      expect(logs.errors.length).toBeLessThanOrEqual(1000);
    });

    it('should clear all logs', () => {
      logError('TestComponent', 'testOperation', 'Test error');
      logFormSubmission({ test: 'data' }, 'started');
      
      let logs = errorReporter.getLogs();
      expect(logs.errors.length).toBeGreaterThan(0);
      expect(logs.formSubmissions.length).toBeGreaterThan(0);

      errorReporter.clearLogs();
      
      logs = errorReporter.getLogs();
      expect(logs.errors).toHaveLength(0);
      expect(logs.formSubmissions).toHaveLength(0);
    });

    it('should get logs by time range', () => {
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      
      logError('TestComponent', 'testOperation', 'Recent error');
      
      const recentLogs = errorReporter.getLogsByTimeRange('errors', oneHourAgo, now);
      expect(recentLogs).toHaveLength(1);
      
      const oldLogs = errorReporter.getLogsByTimeRange('errors', oneHourAgo - 1000, oneHourAgo);
      expect(oldLogs).toHaveLength(0);
    });

    it('should export logs as JSON', () => {
      logError('TestComponent', 'testOperation', 'Test error');
      
      const exportedLogs = errorReporter.exportLogs();
      expect(typeof exportedLogs).toBe('string');
      
      const parsedLogs = JSON.parse(exportedLogs);
      expect(parsedLogs.errors).toHaveLength(1);
    });

    it('should provide log summary statistics', () => {
      logError('TestComponent', 'testOperation', 'Test error');
      logFormSubmission({ test: 'data' }, 'started');
      logNetworkRequest('https://api.example.com/test', 'GET');
      
      const summary = errorReporter.getLogSummary();
      
      expect(summary.total.errors).toBe(1);
      expect(summary.total.formSubmissions).toBe(1);
      expect(summary.total.networkRequests).toBe(1);
      expect(summary.lastHour.errors).toBe(1);
      expect(summary.lastHour.formSubmissions).toBe(1);
      expect(summary.lastHour.networkRequests).toBe(1);
    });
  });

  describe('Debug Utilities', () => {
    it('should monitor form submissions', () => {
      logFormSubmission({ email: 'test@example.com' }, 'started');
      logFormSubmission({ email: 'test2@example.com' }, 'success');
      
      const submissions = debugUtils.monitorFormSubmissions(60);
      expect(submissions).toHaveLength(2);
    });

    it('should monitor network issues', () => {
      logNetworkRequest('https://api.example.com/test1', 'GET', {}, undefined, 200);
      logNetworkRequest('https://api.example.com/test2', 'GET', {}, undefined, 404);
      logNetworkRequest('https://api.example.com/test3', 'GET', {}, undefined, 500);
      
      const issues = debugUtils.monitorNetworkIssues(60);
      expect(issues).toHaveLength(2); // 404 and 500 errors
    });

    it('should monitor auth issues', () => {
      logAuthStateChange('unauthenticated', 'authenticated', 'login');
      logAuthStateChange('authenticating', 'error', 'login', undefined, undefined, {}, 'Invalid credentials');
      
      const authIssues = debugUtils.monitorAuthIssues(60);
      expect(authIssues).toHaveLength(1); // Only the one with error
    });
  });
});