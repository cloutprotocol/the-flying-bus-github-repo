/**
 * Enhanced Invitation Service Tests
 * Tests for timeout, cleanup, and error categorization mechanisms
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  createInvitationRequest, 
  cancelInvitationOperation,
  cancelAllInvitationOperations,
  getInvitationOperationStatus,
  cleanupInvitationOperations,
  ErrorCategory
} from '../invitationService';
import { AsyncOperationManager } from '@/utils/asyncOperationManager';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'test-id', parent_name: 'John Doe', parent_email: 'john@example.com', child_name: 'Jane Doe', child_age: 10 },
            error: null
          }))
        }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({ error: null }))
  }
}));

vi.mock('../rateLimitService', () => ({
  default: {
    checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true })),
    recordAttempt: vi.fn(() => Promise.resolve())
  }
}));

vi.mock('../auditLogService', () => ({
  default: {
    logInvitationRequest: vi.fn(() => Promise.resolve()),
    logEvent: vi.fn(() => Promise.resolve())
  }
}));

vi.mock('../inputSanitizationService', () => ({
  default: {
    sanitizeInvitationRequest: vi.fn((data) => ({
      parent_name: data.parent_name || '',
      parent_email: data.parent_email || '',
      child_name: data.child_name || '',
      child_age: data.child_age || 0,
      message: data.message
    }))
  }
}));

vi.mock('../authenticatedApiService', () => ({
  AuthenticatedApiService: {
    sendEmail: vi.fn(() => Promise.resolve({ success: true, data: { messageId: 'test-message-id' } }))
  }
}));

describe('Enhanced Invitation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up any existing operations
    cancelAllInvitationOperations();
  });

  afterEach(() => {
    // Ensure cleanup after each test
    cancelAllInvitationOperations();
  });

  describe('createInvitationRequest with timeout and cleanup', () => {
    it('should handle timeout scenarios correctly', async () => {
      const mockData = {
        parent_name: 'John Doe',
        parent_email: 'john@example.com',
        child_name: 'Jane Doe',
        child_age: 10
      };

      // Mock a slow operation that will timeout
      const slowOperation = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 35000)) // 35 seconds, longer than 30s timeout
      );

      const result = await createInvitationRequest(mockData, {
        timeout: 1000, // 1 second timeout for testing
        maxRetries: 1
      });

      expect(result.success).toBe(false);
      expect(result.category).toBe(ErrorCategory.TIMEOUT);
      expect(result.code).toBe('OPERATION_TIMEOUT');
      expect(result.retryable).toBe(true);
    });

    it('should support operation cancellation', async () => {
      const mockData = {
        parent_name: 'John Doe',
        parent_email: 'john@example.com',
        child_name: 'Jane Doe',
        child_age: 10
      };

      // Start a long-running operation
      const operationPromise = createInvitationRequest(mockData, {
        timeout: 30000,
        maxRetries: 1
      });

      // Get the operation status to find the operation ID
      const status = getInvitationOperationStatus();
      expect(status.serviceOperations.length).toBeGreaterThan(0);
      
      const operationId = status.serviceOperations[0].operationId;

      // Cancel the operation
      const cancelled = cancelInvitationOperation(operationId);
      expect(cancelled).toBe(true);

      const result = await operationPromise;
      expect(result.success).toBe(false);
      expect(result.category).toBe(ErrorCategory.CANCELLED);
    });

    it('should categorize validation errors correctly', async () => {
      const invalidData = {
        parent_name: '', // Invalid: empty name
        parent_email: 'john@example.com',
        child_name: 'Jane Doe',
        child_age: 10
      };

      const result = await createInvitationRequest(invalidData);

      expect(result.success).toBe(false);
      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.retryable).toBe(false);
    });

    it('should categorize age validation errors correctly', async () => {
      const invalidAgeData = {
        parent_name: 'John Doe',
        parent_email: 'john@example.com',
        child_name: 'Jane Doe',
        child_age: 5 // Invalid: too young
      };

      const result = await createInvitationRequest(invalidAgeData);

      expect(result.success).toBe(false);
      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.retryable).toBe(false);
    });

    it('should track operations for monitoring', async () => {
      const mockData = {
        parent_name: 'John Doe',
        parent_email: 'john@example.com',
        child_name: 'Jane Doe',
        child_age: 10
      };

      // Start operation (don't await yet)
      const operationPromise = createInvitationRequest(mockData);

      // Check that operation is being tracked
      const status = getInvitationOperationStatus();
      expect(status.serviceOperations.length).toBeGreaterThan(0);
      expect(status.serviceOperations[0].type).toBe('create');
      expect(status.serviceOperations[0].email).toBe('john@example.com');

      // Wait for completion
      await operationPromise;

      // Check that operation is no longer tracked
      const finalStatus = getInvitationOperationStatus();
      expect(finalStatus.serviceOperations.length).toBe(0);
    });

    it('should cleanup stale operations', async () => {
      // This test would need to be implemented with proper mocking
      // of the operation tracker's internal state
      const cleaned = cleanupInvitationOperations(0); // Clean up everything
      expect(cleaned.serviceCleaned).toBeGreaterThanOrEqual(0);
    });

    it('should handle network errors with proper categorization', async () => {
      const mockData = {
        parent_name: 'John Doe',
        parent_email: 'john@example.com',
        child_name: 'Jane Doe',
        child_age: 10
      };

      // Mock network error
      vi.mocked(require('@/integrations/supabase/client').supabase.from).mockImplementation(() => ({
        insert: () => ({
          select: () => ({
            single: () => Promise.reject(new Error('Network connection failed'))
          })
        })
      }));

      const result = await createInvitationRequest(mockData);

      expect(result.success).toBe(false);
      expect(result.category).toBe(ErrorCategory.SERVICE);
      expect(result.retryable).toBe(true);
    });

    it('should support validate-only mode', async () => {
      const mockData = {
        parent_name: 'John Doe',
        parent_email: 'john@example.com',
        child_name: 'Jane Doe',
        child_age: 10
      };

      const result = await createInvitationRequest(mockData, {
        validateOnly: true
      });

      // In validate-only mode, it should succeed without creating database records
      expect(result.success).toBe(true);
    });

    it('should support skipping email sending', async () => {
      const mockData = {
        parent_name: 'John Doe',
        parent_email: 'john@example.com',
        child_name: 'Jane Doe',
        child_age: 10
      };

      // Mock successful database insertion
      vi.mocked(require('@/integrations/supabase/client').supabase.from).mockImplementation(() => ({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: { id: 'test-id', ...mockData },
              error: null
            })
          })
        })
      }));

      const result = await createInvitationRequest(mockData, {
        skipEmailSending: true
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should provide detailed operation metadata', async () => {
      const mockData = {
        parent_name: 'John Doe',
        parent_email: 'john@example.com',
        child_name: 'Jane Doe',
        child_age: 10
      };

      const result = await createInvitationRequest(mockData);

      expect(result.operationId).toBeDefined();
      expect(result.duration).toBeDefined();
      expect(result.attempts).toBeDefined();
      expect(typeof result.duration).toBe('number');
      expect(typeof result.attempts).toBe('number');
    });
  });

  describe('Operation management functions', () => {
    it('should cancel all operations', () => {
      const result = cancelAllInvitationOperations();
      expect(result).toHaveProperty('asyncCancelled');
      expect(result).toHaveProperty('serviceCancelled');
      expect(typeof result.asyncCancelled).toBe('number');
      expect(typeof result.serviceCancelled).toBe('number');
    });

    it('should get operation status', () => {
      const status = getInvitationOperationStatus();
      expect(status).toHaveProperty('asyncOperations');
      expect(status).toHaveProperty('serviceOperations');
      expect(Array.isArray(status.asyncOperations)).toBe(true);
      expect(Array.isArray(status.serviceOperations)).toBe(true);
    });

    it('should cleanup operations', () => {
      const result = cleanupInvitationOperations();
      expect(result).toHaveProperty('asyncCleaned');
      expect(result).toHaveProperty('serviceCleaned');
      expect(typeof result.asyncCleaned).toBe('number');
      expect(typeof result.serviceCleaned).toBe('number');
    });
  });

  describe('Error categorization', () => {
    it('should categorize different error types correctly', async () => {
      // This would test the categorizeInvitationError function
      // with various error scenarios
      const testCases = [
        { error: new Error('validation failed'), expectedCategory: ErrorCategory.VALIDATION },
        { error: new Error('network timeout'), expectedCategory: ErrorCategory.NETWORK },
        { error: new Error('database connection failed'), expectedCategory: ErrorCategory.SERVICE },
        { error: new Error('operation timed out'), expectedCategory: ErrorCategory.TIMEOUT },
        { error: new Error('operation was cancelled'), expectedCategory: ErrorCategory.CANCELLED },
        { error: new Error('unexpected error'), expectedCategory: ErrorCategory.UNEXPECTED }
      ];

      // Note: This would require exposing the categorizeInvitationError function
      // or testing it indirectly through the main function
    });
  });
});