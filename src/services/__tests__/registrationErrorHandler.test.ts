import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registrationErrorHandler, RegistrationErrorHandler } from '../registrationErrorHandler';
import { AuthError } from '@supabase/supabase-js';

describe('RegistrationErrorHandler', () => {
  let handler: RegistrationErrorHandler;

  beforeEach(() => {
    handler = new RegistrationErrorHandler();
    vi.clearAllMocks();
  });

  describe('handleValidationError', () => {
    it('should handle email validation errors', () => {
      const error = new Error('Invalid email format');
      const result = handler.handleValidationError(error);

      expect(result.type).toBe('validation');
      expect(result.code).toBe('VALIDATION_FAILED');
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toContain('email');
    });

    it('should handle password validation errors', () => {
      const error = new Error('Password is too weak');
      const result = handler.handleValidationError(error);

      expect(result.type).toBe('validation');
      expect(result.userMessage).toContain('Password');
    });

    it('should handle required field errors', () => {
      const error = new Error('First name is required');
      const result = handler.handleValidationError(error);

      expect(result.userMessage).toContain('required');
    });
  });

  describe('handleRLSError', () => {
    it('should handle RLS policy violations', () => {
      const error = new AuthError('RLS policy violation', 'PGRST301');
      const result = handler.handleRLSError(error);

      expect(result.type).toBe('rls');
      expect(result.code).toBe('RLS_POLICY_VIOLATION');
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toContain('creating your account');
    });

    it('should handle permission denied errors', () => {
      const error = new Error('permission denied for table profiles');
      const result = handler.handleRLSError(error);

      expect(result.type).toBe('rls');
      expect(result.retryable).toBe(true);
    });

    it('should include context information', () => {
      const error = new Error('RLS violation');
      const context = { userId: 'test-user', email: 'test@example.com' };
      const result = handler.handleRLSError(error, context);

      expect(result.context).toEqual(expect.objectContaining(context));
    });
  });

  describe('handleNetworkError', () => {
    it('should handle timeout errors', () => {
      const error = new Error('Request timeout');
      const result = handler.handleNetworkError(error);

      expect(result.type).toBe('network');
      expect(result.code).toBe('REQUEST_TIMEOUT');
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toContain('Connection issue');
    });

    it('should handle fetch errors', () => {
      const error = new Error('Failed to fetch');
      const result = handler.handleNetworkError(error);

      expect(result.type).toBe('network');
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.retryable).toBe(true);
    });
  });

  describe('handleSessionError', () => {
    it('should handle session establishment failures', () => {
      const error = new AuthError('Session not found', 'session_not_found');
      const result = handler.handleSessionError(error);

      expect(result.type).toBe('session');
      expect(result.code).toBe('SESSION_ESTABLISHMENT_FAILED');
      expect(result.retryable).toBe(true);
      expect(result.userMessage).toContain('Account created successfully');
    });

    it('should handle invalid token errors', () => {
      const error = new AuthError('Invalid token', 'invalid_grant');
      const result = handler.handleSessionError(error);

      expect(result.type).toBe('session');
      expect(result.retryable).toBe(true);
    });
  });

  describe('handleInvitationError', () => {
    it('should handle expired invitation errors', () => {
      const error = new Error('Invitation has expired');
      const result = handler.handleInvitationError(error);

      expect(result.type).toBe('invitation');
      expect(result.code).toBe('INVITATION_EXPIRED');
      expect(result.retryable).toBe(false);
      expect(result.userMessage).toContain('expired');
    });

    it('should handle invalid invitation errors', () => {
      const error = new Error('Invitation not found');
      const result = handler.handleInvitationError(error);

      expect(result.code).toBe('INVITATION_INVALID');
      expect(result.userMessage).toContain('invalid');
    });

    it('should handle used invitation errors', () => {
      const error = new Error('Invitation already used');
      const result = handler.handleInvitationError(error);

      expect(result.code).toBe('INVITATION_ALREADY_USED');
      expect(result.userMessage).toContain('already been used');
    });
  });

  describe('processError', () => {
    it('should correctly identify validation errors', () => {
      const error = new Error('Email validation failed');
      const result = handler.processError(error);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('validation');
      expect(result.shouldRetry).toBe(false);
    });

    it('should correctly identify RLS errors', () => {
      const error = new Error('RLS policy violation');
      const result = handler.processError(error);

      expect(result.error?.type).toBe('rls');
      expect(result.shouldRetry).toBe(true);
    });

    it('should correctly identify network errors', () => {
      const error = new Error('Network connection failed');
      const result = handler.processError(error);

      expect(result.error?.type).toBe('network');
      expect(result.shouldRetry).toBe(true);
    });

    it('should handle unknown errors', () => {
      const error = new Error('Something completely unexpected');
      const result = handler.processError(error);

      expect(result.error?.type).toBe('unknown');
      expect(result.shouldRetry).toBe(false);
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await handler.executeWithRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue('success');
      
      const result = await handler.executeWithRetry(operation, { maxAttempts: 2 });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Email validation failed'));
      
      await expect(handler.executeWithRetry(operation)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(handler.executeWithRetry(operation, { maxAttempts: 3 })).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should implement exponential backoff', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      const result = await handler.executeWithRetry(operation, { 
        maxAttempts: 3,
        baseDelay: 100,
        backoffMultiplier: 2
      });
      const endTime = Date.now();
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      // Should have waited at least 100ms + 200ms = 300ms
      expect(endTime - startTime).toBeGreaterThan(250);
    });

    it('should add jitter to prevent thundering herd', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue('success');
      
      // Run multiple times to check for jitter variation
      const delays: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await handler.executeWithRetry(operation, { 
          maxAttempts: 2,
          baseDelay: 100
        });
        const endTime = Date.now();
        delays.push(endTime - startTime);
        operation.mockClear();
        operation
          .mockRejectedValueOnce(new Error('Network timeout'))
          .mockResolvedValue('success');
      }
      
      // Delays should vary due to jitter
      const uniqueDelays = new Set(delays.map(d => Math.floor(d / 10) * 10));
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('error type detection', () => {
    it('should detect validation errors correctly', () => {
      const validationErrors = [
        'Email validation failed',
        'Password is required',
        'Invalid format provided',
        'Password is too weak'
      ];

      validationErrors.forEach(message => {
        const error = new Error(message);
        const result = handler.processError(error);
        expect(result.error?.type).toBe('validation');
      });
    });

    it('should detect RLS errors correctly', () => {
      const rlsErrors = [
        new Error('RLS policy violation'),
        new Error('Row level security policy violated'),
        new Error('Permission denied for table')
      ];

      // Test AuthError objects separately with proper structure
      const authError1 = new Error('Policy violation') as any;
      authError1.code = 'PGRST301';
      
      const authError2 = new Error('Access denied') as any;
      authError2.code = '42501';

      const allErrors = [...rlsErrors, authError1, authError2];

      allErrors.forEach(error => {
        const result = handler.processError(error);
        expect(result.error?.type).toBe('rls');
      });
    });

    it('should detect network errors correctly', () => {
      const networkErrors = [
        'Network connection failed',
        'Failed to fetch',
        'Request timeout occurred',
        'Connection refused'
      ];

      networkErrors.forEach(message => {
        const error = new Error(message);
        const result = handler.processError(error);
        expect(result.error?.type).toBe('network');
      });
    });

    it('should detect session errors correctly', () => {
      const sessionErrors = [
        new Error('Session establishment failed'),
        new Error('Invalid authentication token')
      ];

      // Test AuthError objects separately with proper structure
      const authError1 = new Error('Session not found') as any;
      authError1.code = 'session_not_found';
      
      const authError2 = new Error('Invalid grant') as any;
      authError2.code = 'invalid_grant';

      const allErrors = [...sessionErrors, authError1, authError2];

      allErrors.forEach(error => {
        const result = handler.processError(error);
        expect(result.error?.type).toBe('session');
      });
    });

    it('should detect invitation errors correctly', () => {
      const invitationErrors = [
        'Invitation has expired',
        'Invalid invitation token',
        'Invitation not found'
      ];

      invitationErrors.forEach(message => {
        const error = new Error(message);
        const result = handler.processError(error);
        expect(result.error?.type).toBe('invitation');
      });
    });
  });
});