/**
 * Integration Examples for Error Reporting Utilities
 * 
 * This file demonstrates how to integrate the error reporting utilities
 * into various parts of the application for comprehensive debugging.
 */

import {
  logError,
  logFormSubmission,
  logNetworkRequest,
  logAuthStateChange,
  logComponentLifecycle,
  logAsyncOperation,
  debugUtils
} from '../errorReporting';

// Example 1: Form Submission with Error Reporting
export const enhancedFormSubmissionExample = async (formData: Record<string, any>) => {
  const submissionId = logFormSubmission(formData, 'started');
  
  try {
    // Log validation step
    logFormSubmission(formData, 'validating', undefined, 0, submissionId);
    
    // Simulate validation
    if (!formData.email) {
      throw new Error('Email is required');
    }
    
    // Log submission step
    logFormSubmission(formData, 'submitting', undefined, 0, submissionId);
    
    // Simulate API call with network logging
    const startTime = Date.now();
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    // Log network request
    logNetworkRequest(
      '/api/submit',
      'POST',
      { 'Content-Type': 'application/json' },
      formData,
      response.status,
      Object.fromEntries(response.headers.entries()),
      await response.json(),
      startTime
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Log success
    logFormSubmission(formData, 'success', undefined, 0, submissionId);
    
    return { success: true, submissionId };
    
  } catch (error) {
    // Log error
    const errorMessage = error instanceof Error ? error.message : String(error);
    logFormSubmission(formData, 'error', errorMessage, 0, submissionId);
    
    // Log detailed error
    logError(
      'FormSubmission',
      'submitForm',
      error as Error,
      { formData, submissionId },
      'current-user-id',
      'current-session-id'
    );
    
    throw error;
  }
};

// Example 2: Component with Lifecycle Logging
export class ExampleComponentWithLogging {
  private componentId: string;
  private isMounted = false;
  
  constructor(private componentName: string, private props: Record<string, any>) {
    this.componentId = this.mount();
  }
  
  private mount(): string {
    const startTime = Date.now();
    
    try {
      // Simulate component mounting logic
      this.isMounted = true;
      
      const componentId = logComponentLifecycle(
        this.componentName,
        'mount',
        this.props,
        { isMounted: this.isMounted },
        undefined,
        startTime
      );
      
      return componentId;
      
    } catch (error) {
      logComponentLifecycle(
        this.componentName,
        'error',
        this.props,
        { isMounted: this.isMounted },
        error instanceof Error ? error.message : String(error),
        startTime
      );
      
      throw error;
    }
  }
  
  update(newProps: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      this.props = { ...this.props, ...newProps };
      
      logComponentLifecycle(
        this.componentName,
        'update',
        this.props,
        { isMounted: this.isMounted },
        undefined,
        startTime
      );
      
    } catch (error) {
      logComponentLifecycle(
        this.componentName,
        'error',
        this.props,
        { isMounted: this.isMounted },
        error instanceof Error ? error.message : String(error),
        startTime
      );
    }
  }
  
  unmount() {
    const startTime = Date.now();
    
    this.isMounted = false;
    
    logComponentLifecycle(
      this.componentName,
      'unmount',
      this.props,
      { isMounted: this.isMounted },
      undefined,
      startTime
    );
  }
}

// Example 3: Async Operation with Retry Logic
export const enhancedAsyncOperationExample = async (
  operationType: string,
  operation: () => Promise<any>,
  maxRetries = 3
) => {
  const operationId = logAsyncOperation(operationType, 'started');
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      const startTime = Date.now();
      
      if (retryCount > 0) {
        logAsyncOperation(
          operationType,
          'progress',
          { retryAttempt: retryCount },
          undefined,
          retryCount,
          operationId
        );
      }
      
      const result = await operation();
      
      logAsyncOperation(
        operationType,
        'success',
        { result },
        undefined,
        retryCount,
        operationId,
        startTime
      );
      
      return result;
      
    } catch (error) {
      retryCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (retryCount > maxRetries) {
        logAsyncOperation(
          operationType,
          'error',
          { finalAttempt: true },
          errorMessage,
          retryCount,
          operationId
        );
        
        throw error;
      } else {
        logAsyncOperation(
          operationType,
          'error',
          { willRetry: true, nextRetryIn: Math.pow(2, retryCount) * 1000 },
          errorMessage,
          retryCount,
          operationId
        );
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }
  }
};

// Example 4: Authentication Flow with State Logging
export const enhancedAuthFlowExample = async (credentials: { email: string; password: string }) => {
  const startTime = Date.now();
  
  try {
    // Log auth attempt start
    logAuthStateChange(
      'unauthenticated',
      'authenticating',
      'login',
      undefined,
      undefined,
      { email: credentials.email },
      undefined,
      startTime
    );
    
    // Simulate authentication API call
    const authStartTime = Date.now();
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    // Log network request
    logNetworkRequest(
      '/api/auth/login',
      'POST',
      { 'Content-Type': 'application/json' },
      { email: credentials.email }, // Don't log password
      response.status,
      Object.fromEntries(response.headers.entries()),
      undefined, // Don't log response body for security
      authStartTime
    );
    
    if (!response.ok) {
      const errorMessage = `Authentication failed: ${response.status}`;
      
      logAuthStateChange(
        'authenticating',
        'error',
        'login',
        undefined,
        undefined,
        { email: credentials.email, statusCode: response.status },
        errorMessage,
        startTime
      );
      
      throw new Error(errorMessage);
    }
    
    const authData = await response.json();
    
    // Log successful authentication
    logAuthStateChange(
      'authenticating',
      'authenticated',
      'login',
      authData.user?.id,
      authData.session?.id,
      { email: credentials.email },
      undefined,
      startTime
    );
    
    return authData;
    
  } catch (error) {
    logError(
      'AuthFlow',
      'login',
      error as Error,
      { email: credentials.email },
      undefined,
      undefined
    );
    
    throw error;
  }
};

// Example 5: Data Fetching with Comprehensive Logging
export const enhancedDataFetchingExample = async (endpoint: string, params: Record<string, any> = {}) => {
  const operationId = logAsyncOperation('dataFetch', 'started', { endpoint, params });
  
  try {
    const url = new URL(endpoint, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
    
    const startTime = Date.now();
    
    logAsyncOperation(
      'dataFetch',
      'progress',
      { url: url.toString(), stage: 'requesting' },
      undefined,
      0,
      operationId
    );
    
    const response = await fetch(url.toString());
    
    // Log network request
    logNetworkRequest(
      url.toString(),
      'GET',
      {},
      undefined,
      response.status,
      Object.fromEntries(response.headers.entries()),
      undefined, // Will be logged separately
      startTime
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    logAsyncOperation(
      'dataFetch',
      'progress',
      { stage: 'parsing' },
      undefined,
      0,
      operationId
    );
    
    const data = await response.json();
    
    logAsyncOperation(
      'dataFetch',
      'success',
      { recordCount: Array.isArray(data) ? data.length : 1 },
      undefined,
      0,
      operationId,
      startTime
    );
    
    return data;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logAsyncOperation(
      'dataFetch',
      'error',
      { endpoint, params },
      errorMessage,
      0,
      operationId
    );
    
    logError(
      'DataFetching',
      'fetchData',
      error as Error,
      { endpoint, params, operationId }
    );
    
    throw error;
  }
};

// Example 6: Debug Utilities Usage
export const debugUtilitiesExample = () => {
  console.log('=== Error Reporting Debug Utilities ===');
  
  // Get overall log summary
  const summary = debugUtils.getLogSummary();
  console.log('Log Summary:', summary);
  
  // Monitor recent form submissions
  const recentSubmissions = debugUtils.monitorFormSubmissions(30); // Last 30 minutes
  console.log('Recent Form Submissions:', recentSubmissions);
  
  // Monitor network issues
  const networkIssues = debugUtils.monitorNetworkIssues(60); // Last hour
  console.log('Network Issues:', networkIssues);
  
  // Monitor auth issues
  const authIssues = debugUtils.monitorAuthIssues(60); // Last hour
  console.log('Auth Issues:', authIssues);
  
  // Get all logs for detailed analysis
  const allLogs = debugUtils.getLogs();
  console.log('All Logs:', allLogs);
  
  // Export logs for external analysis
  const exportedLogs = debugUtils.exportLogs();
  console.log('Exported Logs (JSON):', exportedLogs);
};

// Example 7: React Hook Integration Example
export const useErrorReportingExample = (componentName: string) => {
  const componentId = React.useRef<string>();
  
  React.useEffect(() => {
    const startTime = Date.now();
    
    // Log component mount
    componentId.current = logComponentLifecycle(
      componentName,
      'mount',
      undefined,
      undefined,
      undefined,
      startTime
    );
    
    return () => {
      // Log component unmount
      logComponentLifecycle(
        componentName,
        'unmount'
      );
    };
  }, [componentName]);
  
  const reportError = React.useCallback((
    operation: string,
    error: Error | string,
    context?: Record<string, any>
  ) => {
    return logError(componentName, operation, error, context);
  }, [componentName]);
  
  const reportAsyncOperation = React.useCallback((
    operationType: string,
    status: 'started' | 'progress' | 'success' | 'error' | 'timeout' | 'cancelled',
    context?: Record<string, any>,
    error?: string,
    retryCount?: number,
    operationId?: string,
    startTime?: number
  ) => {
    return logAsyncOperation(operationType, status, context, error, retryCount, operationId, startTime);
  }, []);
  
  return {
    componentId: componentId.current,
    reportError,
    reportAsyncOperation
  };
};

// Make examples available for testing
if (process.env.NODE_ENV === 'development') {
  (window as any).errorReportingExamples = {
    enhancedFormSubmissionExample,
    ExampleComponentWithLogging,
    enhancedAsyncOperationExample,
    enhancedAuthFlowExample,
    enhancedDataFetchingExample,
    debugUtilitiesExample
  };
}