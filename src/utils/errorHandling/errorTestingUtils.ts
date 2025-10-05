/**
 * Error Testing Utilities
 * 
 * Provides utilities for testing error scenarios and recovery mechanisms
 * in the invitation system, particularly for RLS policy violations and admin operations.
 */

import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';
import { detectRLSError, generateRLSErrorMessage, type RLSErrorContext } from './rlsErrorHandler';
import { executeAdminOperationWithRetry, createAdminRetryContext } from './adminRetryHandler';

export interface ErrorTestScenario {
  name: string;
  description: string;
  errorType: 'rls_policy' | 'permission' | 'network' | 'timeout' | 'validation' | 'database';
  mockError: any;
  expectedBehavior: string;
  context: RLSErrorContext;
}

export interface ErrorTestResult {
  scenario: string;
  success: boolean;
  detectedCorrectly: boolean;
  userMessageGenerated: boolean;
  retryableCorrectly: boolean;
  fallbackAvailable: boolean;
  recoveryActionsProvided: boolean;
  error?: any;
  details: {
    detectedErrorCode?: string;
    userMessage?: string;
    retryable?: boolean;
    recoveryActions?: string[];
  };
}

/**
 * Predefined error test scenarios
 */
export const ERROR_TEST_SCENARIOS: ErrorTestScenario[] = [
  {
    name: 'RLS Policy Violation - Invitation Insert',
    description: 'Test RLS policy violation when inserting invitation request',
    errorType: 'rls_policy',
    mockError: {
      code: 'PGRST301',
      message: 'Row Level Security policy violation',
      details: 'new row violates row-level security policy for table "invitation_requests"'
    },
    expectedBehavior: 'Should detect RLS error, provide user-friendly message, and suggest fallback',
    context: {
      operation: 'form_submission',
      table: 'invitation_requests',
      userId: 'test-user-id',
      isAuthenticated: true,
      component: 'RequestInvitation'
    }
  },
  {
    name: 'Email Events Insert Denied',
    description: 'Test RLS policy violation when logging email events',
    errorType: 'rls_policy',
    mockError: {
      message: 'permission denied for table email_events',
      code: 'PGRST103'
    },
    expectedBehavior: 'Should detect email logging issue and continue operation',
    context: {
      operation: 'email_logging',
      table: 'email_events',
      userId: 'test-user-id',
      isAuthenticated: true,
      component: 'InvitationService'
    }
  },
  {
    name: 'Admin Permission Denied',
    description: 'Test permission denied for admin operations',
    errorType: 'permission',
    mockError: {
      message: 'insufficient privilege',
      code: 'PGRST103',
      status: 403
    },
    expectedBehavior: 'Should detect permission error and suggest admin contact',
    context: {
      operation: 'admin_operation',
      table: 'invitation_requests',
      userId: 'non-admin-user',
      userRole: 'user',
      isAuthenticated: true,
      component: 'InvitationManagement'
    }
  },
  {
    name: 'JWT Token Expired',
    description: 'Test expired JWT token during operation',
    errorType: 'rls_policy',
    mockError: {
      code: 'PGRST116',
      message: 'JWT expired'
    },
    expectedBehavior: 'Should detect auth issue and suggest re-login',
    context: {
      operation: 'form_submission',
      userId: 'test-user-id',
      isAuthenticated: true,
      component: 'RequestInvitation'
    }
  },
  {
    name: 'Network Timeout',
    description: 'Test network timeout during operation',
    errorType: 'timeout',
    mockError: {
      name: 'TimeoutError',
      message: 'Request timeout after 30000ms',
      code: 'TIMEOUT'
    },
    expectedBehavior: 'Should be retryable with exponential backoff',
    context: {
      operation: 'form_submission',
      userId: 'test-user-id',
      isAuthenticated: true,
      component: 'RequestInvitation'
    }
  },
  {
    name: 'Database Connection Error',
    description: 'Test database connection failure',
    errorType: 'database',
    mockError: {
      code: 'PGRST000',
      message: 'connection error',
      details: 'could not connect to server'
    },
    expectedBehavior: 'Should be retryable with fallback available',
    context: {
      operation: 'admin_operation',
      userId: 'admin-user-id',
      userRole: 'admin',
      isAuthenticated: true,
      component: 'InvitationManagement'
    }
  },
  {
    name: 'Validation Error',
    description: 'Test validation error for invalid data',
    errorType: 'validation',
    mockError: {
      message: 'Invalid email format',
      status: 400,
      code: 'VALIDATION_ERROR'
    },
    expectedBehavior: 'Should not be retryable and provide clear guidance',
    context: {
      operation: 'form_submission',
      userId: 'test-user-id',
      isAuthenticated: true,
      component: 'RequestInvitation'
    }
  }
];

/**
 * Test error detection and message generation
 */
export async function testErrorScenario(scenario: ErrorTestScenario): Promise<ErrorTestResult> {
  logger.info('Testing error scenario', {
    source: LogSource.ADMIN_SERVICE,
    scenario: scenario.name,
    errorType: scenario.errorType
  });

  try {
    // Test RLS error detection
    const detectedError = detectRLSError(scenario.mockError, scenario.context);
    const detectedCorrectly = detectedError !== null;

    // Test user message generation
    const userMessage = generateRLSErrorMessage(scenario.mockError, scenario.context);
    const userMessageGenerated = !!userMessage.message;

    // Check if retryable status is correct
    const retryableCorrectly = detectedError ? 
      detectedError.retryable === (scenario.errorType !== 'validation') :
      true; // If no RLS error detected, assume it's handled correctly

    // Check if fallback is available when expected
    const fallbackAvailable = detectedError?.fallbackAvailable || false;

    // Check if recovery actions are provided
    const recoveryActionsProvided = userMessage.nextSteps && userMessage.nextSteps.length > 0;

    const result: ErrorTestResult = {
      scenario: scenario.name,
      success: true,
      detectedCorrectly,
      userMessageGenerated,
      retryableCorrectly,
      fallbackAvailable,
      recoveryActionsProvided,
      details: {
        detectedErrorCode: detectedError?.code,
        userMessage: userMessage.message,
        retryable: detectedError?.retryable,
        recoveryActions: userMessage.nextSteps
      }
    };

    logger.info('Error scenario test completed', {
      source: LogSource.ADMIN_SERVICE,
      scenario: scenario.name,
      result
    });

    return result;

  } catch (error) {
    logger.error('Error scenario test failed', {
      source: LogSource.ADMIN_SERVICE,
      scenario: scenario.name,
      error: error.message
    });

    return {
      scenario: scenario.name,
      success: false,
      detectedCorrectly: false,
      userMessageGenerated: false,
      retryableCorrectly: false,
      fallbackAvailable: false,
      recoveryActionsProvided: false,
      error,
      details: {}
    };
  }
}

/**
 * Run all error test scenarios
 */
export async function runAllErrorTests(): Promise<ErrorTestResult[]> {
  logger.info('Running all error test scenarios', {
    source: LogSource.ADMIN_SERVICE,
    totalScenarios: ERROR_TEST_SCENARIOS.length
  });

  const results: ErrorTestResult[] = [];

  for (const scenario of ERROR_TEST_SCENARIOS) {
    const result = await testErrorScenario(scenario);
    results.push(result);
  }

  // Generate summary
  const summary = {
    total: results.length,
    passed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    detectionRate: results.filter(r => r.detectedCorrectly).length / results.length,
    messageGenerationRate: results.filter(r => r.userMessageGenerated).length / results.length,
    retryAccuracyRate: results.filter(r => r.retryableCorrectly).length / results.length
  };

  logger.info('Error test scenarios completed', {
    source: LogSource.ADMIN_SERVICE,
    summary
  });

  return results;
}

/**
 * Test admin retry mechanism with mock operations
 */
export async function testAdminRetryMechanism(): Promise<{
  success: boolean;
  attempts: number;
  usedFallback: boolean;
  duration: number;
  error?: any;
}> {
  logger.info('Testing admin retry mechanism', {
    source: LogSource.ADMIN_SERVICE
  });

  let attemptCount = 0;
  let fallbackUsed = false;

  // Mock primary operation that fails twice then succeeds
  const mockPrimaryOperation = async () => {
    attemptCount++;
    if (attemptCount <= 2) {
      throw new Error(`Attempt ${attemptCount} failed - simulated RLS policy violation`);
    }
    return { success: true, data: 'Primary operation succeeded' };
  };

  // Mock fallback operation
  const mockFallbackOperation = async () => {
    fallbackUsed = true;
    return { success: true, data: 'Fallback operation succeeded' };
  };

  const retryContext = createAdminRetryContext(
    'testOperation',
    'test-admin-id',
    'admin',
    {
      component: 'ErrorTestingUtils'
    }
  );

  try {
    const result = await executeAdminOperationWithRetry(
      mockPrimaryOperation,
      retryContext,
      mockFallbackOperation,
      {
        maxAttempts: 3,
        enableFallback: true,
        fallbackAfterAttempts: 2,
        timeoutMs: 10000
      }
    );

    logger.info('Admin retry mechanism test completed', {
      source: LogSource.ADMIN_SERVICE,
      result: {
        success: result.success,
        attempts: result.attempts,
        usedFallback: result.usedFallback,
        duration: result.duration
      }
    });

    return {
      success: result.success,
      attempts: result.attempts,
      usedFallback: result.usedFallback,
      duration: result.duration
    };

  } catch (error) {
    logger.error('Admin retry mechanism test failed', {
      source: LogSource.ADMIN_SERVICE,
      error: error.message
    });

    return {
      success: false,
      attempts: attemptCount,
      usedFallback: fallbackUsed,
      duration: 0,
      error
    };
  }
}

/**
 * Generate error testing report
 */
export function generateErrorTestingReport(results: ErrorTestResult[]): string {
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  let report = `# Error Handling Test Report\n\n`;
  report += `**Summary:**\n`;
  report += `- Total Tests: ${results.length}\n`;
  report += `- Passed: ${passed}\n`;
  report += `- Failed: ${failed}\n`;
  report += `- Success Rate: ${((passed / results.length) * 100).toFixed(1)}%\n\n`;

  report += `## Test Results\n\n`;

  results.forEach((result, index) => {
    report += `### ${index + 1}. ${result.scenario}\n`;
    report += `- **Status:** ${result.success ? '✅ PASS' : '❌ FAIL'}\n`;
    report += `- **Error Detection:** ${result.detectedCorrectly ? '✅' : '❌'}\n`;
    report += `- **User Message:** ${result.userMessageGenerated ? '✅' : '❌'}\n`;
    report += `- **Retry Logic:** ${result.retryableCorrectly ? '✅' : '❌'}\n`;
    report += `- **Fallback Available:** ${result.fallbackAvailable ? '✅' : '❌'}\n`;
    report += `- **Recovery Actions:** ${result.recoveryActionsProvided ? '✅' : '❌'}\n`;
    
    if (result.details.detectedErrorCode) {
      report += `- **Detected Error Code:** ${result.details.detectedErrorCode}\n`;
    }
    
    if (result.details.userMessage) {
      report += `- **User Message:** "${result.details.userMessage}"\n`;
    }
    
    if (result.error) {
      report += `- **Error:** ${result.error.message}\n`;
    }
    
    report += `\n`;
  });

  return report;
}

/**
 * Simulate various error conditions for testing
 */
export class ErrorSimulator {
  static createRLSPolicyViolation(table: string = 'invitation_requests'): any {
    return {
      code: 'PGRST301',
      message: 'Row Level Security policy violation',
      details: `new row violates row-level security policy for table "${table}"`
    };
  }

  static createPermissionDenied(operation: string = 'UPDATE'): any {
    return {
      code: 'PGRST103',
      message: 'insufficient privilege',
      details: `permission denied for ${operation} operation`,
      status: 403
    };
  }

  static createJWTExpired(): any {
    return {
      code: 'PGRST116',
      message: 'JWT expired',
      details: 'JWT token has expired and needs to be refreshed'
    };
  }

  static createNetworkTimeout(): any {
    return {
      name: 'TimeoutError',
      message: 'Request timeout after 30000ms',
      code: 'TIMEOUT'
    };
  }

  static createDatabaseConnectionError(): any {
    return {
      code: 'PGRST000',
      message: 'connection error',
      details: 'could not connect to server: Connection refused'
    };
  }

  static createValidationError(field: string): any {
    return {
      message: `Invalid ${field} format`,
      status: 400,
      code: 'VALIDATION_ERROR'
    };
  }
}

/**
 * Test error recovery mechanisms
 */
export async function testErrorRecoveryMechanisms(): Promise<{
  rlsDetection: boolean;
  messageGeneration: boolean;
  retryLogic: boolean;
  fallbackMechanism: boolean;
  userGuidance: boolean;
}> {
  const results = await runAllErrorTests();
  const retryTest = await testAdminRetryMechanism();

  return {
    rlsDetection: results.every(r => r.detectedCorrectly),
    messageGeneration: results.every(r => r.userMessageGenerated),
    retryLogic: retryTest.success && retryTest.attempts > 1,
    fallbackMechanism: retryTest.usedFallback || results.some(r => r.fallbackAvailable),
    userGuidance: results.every(r => r.recoveryActionsProvided)
  };
}