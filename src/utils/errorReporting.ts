/**
 * Comprehensive Error Reporting and Debugging Utilities
 * 
 * This module provides structured error logging, context capture, and debugging
 * utilities for monitoring form submissions, network requests, authentication
 * state changes, and component lifecycle operations.
 */

export interface ErrorReport {
  errorId: string;
  timestamp: number;
  component: string;
  operation: string;
  error: Error | string;
  context: Record<string, any>;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  stackTrace?: string;
}

export interface FormSubmissionLog {
  submissionId: string;
  timestamp: number;
  formData: Record<string, any>;
  status: 'started' | 'validating' | 'submitting' | 'success' | 'error' | 'timeout';
  error?: string;
  retryCount: number;
  duration?: number;
  networkDetails?: NetworkRequestLog;
}

export interface NetworkRequestLog {
  url: string;
  method: string;
  headers: Record<string, string>;
  requestBody?: any;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  duration: number;
  timestamp: number;
}

export interface AuthStateChangeLog {
  timestamp: number;
  previousState: string;
  newState: string;
  userId?: string;
  sessionId?: string;
  operation: string;
  duration?: number;
  error?: string;
  context: Record<string, any>;
}

export interface ComponentLifecycleLog {
  componentId: string;
  componentName: string;
  operation: 'mount' | 'unmount' | 'update' | 'error';
  timestamp: number;
  props?: Record<string, any>;
  state?: Record<string, any>;
  error?: string;
  duration?: number;
}

export interface AsyncOperationLog {
  operationId: string;
  operationType: string;
  status: 'started' | 'progress' | 'success' | 'error' | 'timeout' | 'cancelled';
  timestamp: number;
  duration?: number;
  retryCount: number;
  error?: string;
  context: Record<string, any>;
}

/**
 * Central error reporting and logging service
 */
class ErrorReportingService {
  private static instance: ErrorReportingService;
  private logs: {
    errors: ErrorReport[];
    formSubmissions: FormSubmissionLog[];
    networkRequests: NetworkRequestLog[];
    authStateChanges: AuthStateChangeLog[];
    componentLifecycle: ComponentLifecycleLog[];
    asyncOperations: AsyncOperationLog[];
  } = {
    errors: [],
    formSubmissions: [],
    networkRequests: [],
    authStateChanges: [],
    componentLifecycle: [],
    asyncOperations: []
  };

  private maxLogEntries = 1000; // Prevent memory leaks
  private debugMode = process.env.NODE_ENV === 'development';

  static getInstance(): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService();
    }
    return ErrorReportingService.instance;
  }

  /**
   * Generate unique ID for tracking operations
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize sensitive data from logs
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveKeys = ['password', 'token', 'apikey', 'secret', 'authorization'];
    const sanitized = { ...data };
    
    for (const key in sanitized) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }
    
    return sanitized;
  }

  /**
   * Trim logs to prevent memory issues
   */
  private trimLogs<T>(logArray: T[]): void {
    if (logArray.length > this.maxLogEntries) {
      logArray.splice(0, logArray.length - this.maxLogEntries);
    }
  }

  /**
   * Log structured error with context
   */
  logError(
    component: string,
    operation: string,
    error: Error | string,
    context: Record<string, any> = {},
    userId?: string,
    sessionId?: string
  ): string {
    const errorId = this.generateId();
    const errorObj = error instanceof Error ? error : new Error(error);
    
    const errorReport: ErrorReport = {
      errorId,
      timestamp: Date.now(),
      component,
      operation,
      error: errorObj.message,
      context: this.sanitizeData(context),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId,
      sessionId,
      stackTrace: errorObj.stack
    };

    this.logs.errors.push(errorReport);
    this.trimLogs(this.logs.errors);

    // Console logging with structured format
    if (this.debugMode) {
      console.group(`🚨 Error in ${component}.${operation}`);
      console.error('Error:', errorObj);
      console.log('Context:', context);
      console.log('Error ID:', errorId);
      console.log('Timestamp:', new Date(errorReport.timestamp).toISOString());
      if (userId) console.log('User ID:', userId);
      if (sessionId) console.log('Session ID:', sessionId);
      console.groupEnd();
    }

    return errorId;
  }

  /**
   * Log form submission with detailed tracking
   */
  logFormSubmission(
    formData: Record<string, any>,
    status: FormSubmissionLog['status'],
    error?: string,
    retryCount: number = 0,
    submissionId?: string
  ): string {
    const id = submissionId || this.generateId();
    
    const existingLog = this.logs.formSubmissions.find(log => log.submissionId === id);
    
    if (existingLog) {
      // Update existing log
      existingLog.status = status;
      existingLog.error = error;
      existingLog.retryCount = retryCount;
      if (status === 'success' || status === 'error' || status === 'timeout') {
        existingLog.duration = Date.now() - existingLog.timestamp;
      }
    } else {
      // Create new log
      const submissionLog: FormSubmissionLog = {
        submissionId: id,
        timestamp: Date.now(),
        formData: this.sanitizeData(formData),
        status,
        error,
        retryCount
      };
      
      this.logs.formSubmissions.push(submissionLog);
      this.trimLogs(this.logs.formSubmissions);
    }

    if (this.debugMode) {
      console.group(`📝 Form Submission ${status.toUpperCase()}`);
      console.log('Submission ID:', id);
      console.log('Status:', status);
      console.log('Form Data:', this.sanitizeData(formData));
      if (error) console.error('Error:', error);
      console.log('Retry Count:', retryCount);
      console.groupEnd();
    }

    return id;
  }

  /**
   * Log network request with detailed information
   */
  logNetworkRequest(
    url: string,
    method: string,
    headers: Record<string, string> = {},
    requestBody?: any,
    responseStatus?: number,
    responseHeaders?: Record<string, string>,
    responseBody?: any,
    startTime?: number
  ): void {
    const timestamp = Date.now();
    const duration = startTime ? timestamp - startTime : 0;

    const networkLog: NetworkRequestLog = {
      url,
      method: method.toUpperCase(),
      headers: this.sanitizeData(headers),
      requestBody: this.sanitizeData(requestBody),
      responseStatus,
      responseHeaders: this.sanitizeData(responseHeaders),
      responseBody: this.sanitizeData(responseBody),
      duration,
      timestamp
    };

    this.logs.networkRequests.push(networkLog);
    this.trimLogs(this.logs.networkRequests);

    if (this.debugMode) {
      const statusColor = responseStatus && responseStatus >= 400 ? '🔴' : '🟢';
      console.group(`🌐 ${statusColor} ${method.toUpperCase()} ${url}`);
      console.log('Status:', responseStatus || 'Pending');
      console.log('Duration:', `${duration}ms`);
      if (requestBody) console.log('Request Body:', this.sanitizeData(requestBody));
      if (responseBody) console.log('Response Body:', this.sanitizeData(responseBody));
      console.groupEnd();
    }
  }

  /**
   * Log authentication state changes
   */
  logAuthStateChange(
    previousState: string,
    newState: string,
    operation: string,
    userId?: string,
    sessionId?: string,
    context: Record<string, any> = {},
    error?: string,
    startTime?: number
  ): void {
    const timestamp = Date.now();
    const duration = startTime ? timestamp - startTime : undefined;

    const authLog: AuthStateChangeLog = {
      timestamp,
      previousState,
      newState,
      userId,
      sessionId,
      operation,
      duration,
      error,
      context: this.sanitizeData(context)
    };

    this.logs.authStateChanges.push(authLog);
    this.trimLogs(this.logs.authStateChanges);

    if (this.debugMode) {
      console.group(`🔐 Auth State Change: ${previousState} → ${newState}`);
      console.log('Operation:', operation);
      if (userId) console.log('User ID:', userId);
      if (sessionId) console.log('Session ID:', sessionId);
      if (duration) console.log('Duration:', `${duration}ms`);
      if (error) console.error('Error:', error);
      console.log('Context:', context);
      console.groupEnd();
    }
  }

  /**
   * Log component lifecycle events
   */
  logComponentLifecycle(
    componentName: string,
    operation: ComponentLifecycleLog['operation'],
    props?: Record<string, any>,
    state?: Record<string, any>,
    error?: string,
    startTime?: number
  ): string {
    const componentId = this.generateId();
    const timestamp = Date.now();
    const duration = startTime ? timestamp - startTime : undefined;

    const lifecycleLog: ComponentLifecycleLog = {
      componentId,
      componentName,
      operation,
      timestamp,
      props: this.sanitizeData(props),
      state: this.sanitizeData(state),
      error,
      duration
    };

    this.logs.componentLifecycle.push(lifecycleLog);
    this.trimLogs(this.logs.componentLifecycle);

    if (this.debugMode) {
      const operationEmoji = {
        mount: '🔄',
        unmount: '🔚',
        update: '🔄',
        error: '🚨'
      };
      
      console.group(`${operationEmoji[operation]} Component ${operation.toUpperCase()}: ${componentName}`);
      console.log('Component ID:', componentId);
      if (duration) console.log('Duration:', `${duration}ms`);
      if (props) console.log('Props:', this.sanitizeData(props));
      if (state) console.log('State:', this.sanitizeData(state));
      if (error) console.error('Error:', error);
      console.groupEnd();
    }

    return componentId;
  }

  /**
   * Log async operation progress
   */
  logAsyncOperation(
    operationType: string,
    status: AsyncOperationLog['status'],
    context: Record<string, any> = {},
    error?: string,
    retryCount: number = 0,
    operationId?: string,
    startTime?: number
  ): string {
    const id = operationId || this.generateId();
    const timestamp = Date.now();
    const duration = startTime ? timestamp - startTime : undefined;

    const existingLog = this.logs.asyncOperations.find(log => log.operationId === id);
    
    if (existingLog) {
      // Update existing log
      existingLog.status = status;
      existingLog.error = error;
      existingLog.retryCount = retryCount;
      if (duration !== undefined) {
        existingLog.duration = duration;
      }
      existingLog.context = { ...existingLog.context, ...this.sanitizeData(context) };
    } else {
      // Create new log
      const asyncLog: AsyncOperationLog = {
        operationId: id,
        operationType,
        status,
        timestamp,
        duration,
        retryCount,
        error,
        context: this.sanitizeData(context)
      };
      
      this.logs.asyncOperations.push(asyncLog);
      this.trimLogs(this.logs.asyncOperations);
    }

    if (this.debugMode) {
      const statusEmoji = {
        started: '🚀',
        progress: '⏳',
        success: '✅',
        error: '❌',
        timeout: '⏰',
        cancelled: '🚫'
      };
      
      console.group(`${statusEmoji[status]} Async Operation ${status.toUpperCase()}: ${operationType}`);
      console.log('Operation ID:', id);
      if (duration) console.log('Duration:', `${duration}ms`);
      console.log('Retry Count:', retryCount);
      if (error) console.error('Error:', error);
      console.log('Context:', this.sanitizeData(context));
      console.groupEnd();
    }

    return id;
  }

  /**
   * Get logs for debugging
   */
  getLogs() {
    return {
      errors: [...this.logs.errors],
      formSubmissions: [...this.logs.formSubmissions],
      networkRequests: [...this.logs.networkRequests],
      authStateChanges: [...this.logs.authStateChanges],
      componentLifecycle: [...this.logs.componentLifecycle],
      asyncOperations: [...this.logs.asyncOperations]
    };
  }

  /**
   * Get logs by type and time range
   */
  getLogsByTimeRange(
    type: keyof typeof this.logs,
    startTime: number,
    endTime: number
  ) {
    return this.logs[type].filter(log => 
      log.timestamp >= startTime && log.timestamp <= endTime
    );
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = {
      errors: [],
      formSubmissions: [],
      networkRequests: [],
      authStateChanges: [],
      componentLifecycle: [],
      asyncOperations: []
    };
    
    if (this.debugMode) {
      console.log('🧹 All logs cleared');
    }
  }

  /**
   * Export logs for external analysis
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Get summary statistics
   */
  getLogSummary() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    return {
      total: {
        errors: this.logs.errors.length,
        formSubmissions: this.logs.formSubmissions.length,
        networkRequests: this.logs.networkRequests.length,
        authStateChanges: this.logs.authStateChanges.length,
        componentLifecycle: this.logs.componentLifecycle.length,
        asyncOperations: this.logs.asyncOperations.length
      },
      lastHour: {
        errors: this.logs.errors.filter(log => log.timestamp > oneHourAgo).length,
        formSubmissions: this.logs.formSubmissions.filter(log => log.timestamp > oneHourAgo).length,
        networkRequests: this.logs.networkRequests.filter(log => log.timestamp > oneHourAgo).length,
        authStateChanges: this.logs.authStateChanges.filter(log => log.timestamp > oneHourAgo).length,
        componentLifecycle: this.logs.componentLifecycle.filter(log => log.timestamp > oneHourAgo).length,
        asyncOperations: this.logs.asyncOperations.filter(log => log.timestamp > oneHourAgo).length
      }
    };
  }
}

// Export singleton instance
export const errorReporter = ErrorReportingService.getInstance();

// Convenience functions for common logging operations
export const logError = (
  component: string,
  operation: string,
  error: Error | string,
  context?: Record<string, any>,
  userId?: string,
  sessionId?: string
) => errorReporter.logError(component, operation, error, context, userId, sessionId);

export const logFormSubmission = (
  formData: Record<string, any>,
  status: FormSubmissionLog['status'],
  error?: string,
  retryCount?: number,
  submissionId?: string
) => errorReporter.logFormSubmission(formData, status, error, retryCount, submissionId);

export const logNetworkRequest = (
  url: string,
  method: string,
  headers?: Record<string, string>,
  requestBody?: any,
  responseStatus?: number,
  responseHeaders?: Record<string, string>,
  responseBody?: any,
  startTime?: number
) => errorReporter.logNetworkRequest(url, method, headers, requestBody, responseStatus, responseHeaders, responseBody, startTime);

export const logAuthStateChange = (
  previousState: string,
  newState: string,
  operation: string,
  userId?: string,
  sessionId?: string,
  context?: Record<string, any>,
  error?: string,
  startTime?: number
) => errorReporter.logAuthStateChange(previousState, newState, operation, userId, sessionId, context, error, startTime);

export const logComponentLifecycle = (
  componentName: string,
  operation: ComponentLifecycleLog['operation'],
  props?: Record<string, any>,
  state?: Record<string, any>,
  error?: string,
  startTime?: number
) => errorReporter.logComponentLifecycle(componentName, operation, props, state, error, startTime);

export const logAsyncOperation = (
  operationType: string,
  status: AsyncOperationLog['status'],
  context?: Record<string, any>,
  error?: string,
  retryCount?: number,
  operationId?: string,
  startTime?: number
) => errorReporter.logAsyncOperation(operationType, status, context, error, retryCount, operationId, startTime);

// Debug utilities for development
export const debugUtils = {
  getLogs: () => errorReporter.getLogs(),
  getLogSummary: () => errorReporter.getLogSummary(),
  clearLogs: () => errorReporter.clearLogs(),
  exportLogs: () => errorReporter.exportLogs(),
  
  // Helper to monitor form submissions
  monitorFormSubmissions: (timeRangeMinutes: number = 60) => {
    const endTime = Date.now();
    const startTime = endTime - (timeRangeMinutes * 60 * 1000);
    return errorReporter.getLogsByTimeRange('formSubmissions', startTime, endTime);
  },
  
  // Helper to monitor network issues
  monitorNetworkIssues: (timeRangeMinutes: number = 60) => {
    const endTime = Date.now();
    const startTime = endTime - (timeRangeMinutes * 60 * 1000);
    const requests = errorReporter.getLogsByTimeRange('networkRequests', startTime, endTime);
    return requests.filter(req => !req.responseStatus || req.responseStatus >= 400);
  },
  
  // Helper to monitor auth issues
  monitorAuthIssues: (timeRangeMinutes: number = 60) => {
    const endTime = Date.now();
    const startTime = endTime - (timeRangeMinutes * 60 * 1000);
    const authChanges = errorReporter.getLogsByTimeRange('authStateChanges', startTime, endTime);
    return authChanges.filter(change => change.error);
  }
};

// Make debug utilities available globally in development
if (process.env.NODE_ENV === 'development') {
  (window as any).debugUtils = debugUtils;
  console.log('🔧 Debug utilities available at window.debugUtils');
}