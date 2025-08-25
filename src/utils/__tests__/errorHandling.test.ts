import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getErrorInfo,
  isRetryableError,
  withRetry,
  formatErrorForUser,
  logError,
  createError,
  validateEmail,
  DEFAULT_RETRY_CONFIG
} from '../errorHandling';

// Mock console methods
const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(mockConsole.error);
  vi.spyOn(console, 'warn').mockImplementation(mockConsole.warn);
  vi.spyOn(console, 'info').mockImplementation(mockConsole.info);
});

afterEach(() => {
  vi.restoreAllMocks();
  mockConsole.error.mockClear();
  mockConsole.warn.mockClear();
  mockConsole.info.mockClear();
});

describe('errorHandling', () => {
  describe('getErrorInfo', () => {
    it('should return correct error info for known error codes', () => {
      const errorInfo = getErrorInfo('INVALID_EMAIL_FORMAT');
      
      expect(errorInfo.code).toBe('INVALID_EMAIL_FORMAT');
      expect(errorInfo.message).toBe('Invalid email address format');
      expect(errorInfo.userMessage).toBe('Please enter a valid email address.');
      expect(errorInfo.retryable).toBe(false);
      expect(errorInfo.severity).toBe('medium');
      expect(errorInfo.category).toBe('validation');
    });

    it('should return default error info for unknown codes', () => {
      const errorInfo = getErrorInfo('UNKNOWN_CODE', 'Custom message');
      
      expect(errorInfo.code).toBe('UNKNOWN_CODE');
      expect(errorInfo.message).toBe('Custom message');
      expect(errorInfo.userMessage).toBe('Something went wrong. Please try again.');
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.severity).toBe('medium');
      expect(errorInfo.category).toBe('server');
    });

    it('should handle empty or null error codes', () => {
      const errorInfo = getErrorInfo('');
      
      expect(errorInfo.code).toBe('UNKNOWN_ERROR');
      expect(errorInfo.retryable).toBe(true);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for retryable error codes', () => {
      const error = { code: 'NETWORK_ERROR' };
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for non-retryable error codes', () => {
      const error = { code: 'INVALID_EMAIL_FORMAT' };
      expect(isRetryableError(error)).toBe(false);
    });

    it('should check retryable property if code is not available', () => {
      const retryableError = { retryable: true };
      const nonRetryableError = { retryable: false };
      
      expect(isRetryableError(retryableError)).toBe(true);
      expect(isRetryableError(nonRetryableError)).toBe(false);
    });

    it('should check error message for retryable patterns', () => {
      const networkError = { message: 'Network connection failed' };
      const timeoutError = { error: 'Request timeout occurred' };
      const validationError = { message: 'Invalid input provided' };
      
      expect(isRetryableError(networkError)).toBe(true);
      expect(isRetryableError(timeoutError)).toBe(true);
      expect(isRetryableError(validationError)).toBe(false);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout error'))
        .mockResolvedValue('success');
      
      const result = await withRetry(operation, { maxAttempts: 3, baseDelay: 10 });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const error = createError('INVALID_EMAIL_FORMAT');
      const operation = vi.fn().mockRejectedValue(error);
      
      await expect(withRetry(operation)).rejects.toThrow(error);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect max attempts', async () => {
      const error = new Error('Network error');
      const operation = vi.fn().mockRejectedValue(error);
      
      await expect(withRetry(operation, { maxAttempts: 2, baseDelay: 10 })).rejects.toThrow(error);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff', async () => {
      const startTime = Date.now();
      const error = new Error('Network error');
      const operation = vi.fn().mockRejectedValue(error);
      
      try {
        await withRetry(operation, { maxAttempts: 3, baseDelay: 50, maxDelay: 1000 });
      } catch (e) {
        // Expected to fail
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should have some delay (at least 50ms for first retry)
      expect(duration).toBeGreaterThan(40);
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('formatErrorForUser', () => {
    it('should format error with known code', () => {
      const error = { code: 'TOKEN_EXPIRED', message: 'Token has expired' };
      const formatted = formatErrorForUser(error);
      
      expect(formatted.message).toBe('This invitation link has expired. Invitation links are valid for 7 days.');
      expect(formatted.code).toBe('TOKEN_EXPIRED');
      expect(formatted.canRetry).toBe(false);
      expect(formatted.recoveryActions).toContain('Request a new invitation');
    });

    it('should format error without code', () => {
      const error = { message: 'Something went wrong' };
      const formatted = formatErrorForUser(error);
      
      expect(formatted.message).toBe('Something went wrong. Please try again.');
      expect(formatted.code).toBe('UNKNOWN_ERROR');
      expect(formatted.canRetry).toBe(true);
    });

    it('should handle string errors', () => {
      const formatted = formatErrorForUser('Simple error message');
      
      expect(formatted.message).toBe('Something went wrong. Please try again.');
      expect(formatted.canRetry).toBe(true);
    });
  });

  describe('logError', () => {
    it('should log critical errors with console.error', () => {
      const error = { code: 'DATABASE_ERROR', message: 'Database connection failed' };
      
      logError(error, { context: 'test' });
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        'HIGH SEVERITY ERROR:',
        expect.objectContaining({
          code: 'DATABASE_ERROR',
          severity: 'high'
        })
      );
    });

    it('should log medium severity errors with console.warn', () => {
      const error = { code: 'INVALID_EMAIL_FORMAT', message: 'Invalid email' };
      
      logError(error);
      
      expect(mockConsole.warn).toHaveBeenCalledWith(
        'MEDIUM SEVERITY ERROR:',
        expect.objectContaining({
          code: 'INVALID_EMAIL_FORMAT',
          severity: 'medium'
        })
      );
    });

    it('should include context in log data', () => {
      const error = { code: 'NETWORK_ERROR' };
      const context = { userId: '123', action: 'sendEmail' };
      
      logError(error, context);
      
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          context: context
        })
      );
    });
  });

  describe('createError', () => {
    it('should create error with known code', () => {
      const error = createError('INVALID_EMAIL_FORMAT', 'Custom message', { field: 'email' });
      
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('INVALID_EMAIL_FORMAT');
      expect(error.message).toBe('Invalid email address format'); // Uses mapped message
      expect(error.details).toEqual({ field: 'email' });
      expect(error.retryable).toBe(false);
    });

    it('should create error with custom message for unknown code', () => {
      const error = createError('CUSTOM_ERROR', 'Custom error message');
      
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.message).toBe('Custom error message');
      expect(error.retryable).toBe(true); // Default for unknown codes
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ];
      
      validEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        '',
        'invalid',
        '@domain.com',
        'user@'
      ];
      
      invalidEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('INVALID_EMAIL_FORMAT');
      });
    });

    it('should handle null and undefined inputs', () => {
      const result1 = validateEmail(null as any);
      const result2 = validateEmail(undefined as any);
      
      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
    });

    it('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@domain.com';
      const result = validateEmail(longEmail);
      
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('INVALID_EMAIL_FORMAT');
      // The specific message may vary, just check it's invalid
    });

    it('should detect suspicious patterns', () => {
      const suspiciousEmails = [
        'user<script>@domain.com',
        'user@domain.com\nBCC: evil@hacker.com',
        'javascript:alert(1)@domain.com',
        'data:text/html,<script>@domain.com'
      ];
      
      suspiciousEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.valid).toBe(false);
        expect(result.error?.code).toBe('INVALID_EMAIL_FORMAT');
        // The specific message may vary, just check it's invalid
      });
    });
  });
});