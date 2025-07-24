import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invitationErrorHandler } from '../invitationErrorHandler';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('@/utils/logger/logger');

const mockSupabase = vi.mocked(supabase);

describe('InvitationErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleError', () => {
    it('should handle database errors', async () => {
      const mockError = {
        code: 'PGRST301',
        message: 'Database connection failed',
        details: 'Connection timeout'
      };

      const mockContext = {
        operation: 'validateToken',
        invitationId: 'invitation-123',
        ipAddress: '192.168.1.1'
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: { id: 'error-log-123' },
          error: null
        })
      } as any);

      const result = await invitationErrorHandler.handleError(mockError, mockContext);

      expect(result.code).toBe('DATABASE_ERROR');
      expect(result.message).toContain('Database operation failed');
      expect(mockSupabase.from).toHaveBeenCalledWith('error_logs');
    });

    it('should handle network errors', async () => {
      const mockError = new Error('Network timeout');
      mockError.name = 'NetworkError';

      const mockContext = {
        operation: 'sendEmail',
        invitationId: 'invitation-123'
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: { id: 'error-log-123' },
          error: null
        })
      } as any);

      const result = await invitationErrorHandler.handleError(mockError, mockContext);

      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.message).toContain('Network operation failed');
    });

    it('should handle validation errors', async () => {
      const mockError = {
        code: 'VALIDATION_FAILED',
        message: 'Invalid input data',
        field: 'email'
      };

      const mockContext = {
        operation: 'validateInput',
        invitationId: 'invitation-123'
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: { id: 'error-log-123' },
          error: null
        })
      } as any);

      const result = await invitationErrorHandler.handleError(mockError, mockContext);

      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('Input validation failed');
    });

    it('should handle authentication errors', async () => {
      const mockError = {
        code: 'AUTH_FAILED',
        message: 'Invalid credentials'
      };

      const mockContext = {
        operation: 'authenticateUser',
        userId: 'user-123'
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: { id: 'error-log-123' },
          error: null
        })
      } as any);

      const result = await invitationErrorHandler.handleError(mockError, mockContext);

      expect(result.code).toBe('AUTHENTICATION_ERROR');
      expect(result.message).toContain('Authentication failed');
    });

    it('should handle rate limiting errors', async () => {
      const mockError = {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests'
      };

      const mockContext = {
        operation: 'validateToken',
        ipAddress: '192.168.1.1'
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: { id: 'error-log-123' },
          error: null
        })
      } as any);

      const result = await invitationErrorHandler.handleError(mockError, mockContext);

      expect(result.code).toBe('RATE_LIMIT_ERROR');
      expect(result.message).toContain('Rate limit exceeded');
    });

    it('should handle unknown errors', async () => {
      const mockError = new Error('Unknown error occurred');

      const mockContext = {
        operation: 'unknownOperation'
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: { id: 'error-log-123' },
          error: null
        })
      } as any);

      const result = await invitationErrorHandler.handleError(mockError, mockContext);

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toContain('An unexpected error occurred');
    });

    it('should handle string errors', async () => {
      const mockError = 'Simple error message';

      const mockContext = {
        operation: 'testOperation'
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: { id: 'error-log-123' },
          error: null
        })
      } as any);

      const result = await invitationErrorHandler.handleError(mockError, mockContext);

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toContain('An unexpected error occurred');
    });
  });

  describe('logError', () => {
    it('should log errors to database successfully', async () => {
      const mockError = new Error('Test error');
      const mockContext = {
        operation: 'testOperation',
        invitationId: 'invitation-123'
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: { id: 'error-log-123' },
          error: null
        })
      } as any);

      const result = await invitationErrorHandler.logError(mockError, mockContext);

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('error_logs');
    });

    it('should handle logging failures gracefully', async () => {
      const mockError = new Error('Test error');
      const mockContext = {
        operation: 'testOperation'
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      } as any);

      const result = await invitationErrorHandler.logError(mockError, mockContext);

      expect(result).toBe(false);
    });

    it('should handle exceptions during logging', async () => {
      const mockError = new Error('Test error');
      const mockContext = {
        operation: 'testOperation'
      };

      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await invitationErrorHandler.logError(mockError, mockContext);

      expect(result).toBe(false);
    });
  });

  describe('getErrorStats', () => {
    it('should return error statistics', async () => {
      const mockStats = [
        { error_type: 'DATABASE_ERROR', count: 10 },
        { error_type: 'NETWORK_ERROR', count: 5 },
        { error_type: 'VALIDATION_ERROR', count: 3 }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            group: vi.fn().mockResolvedValue({
              data: mockStats,
              error: null
            })
          })
        })
      } as any);

      const result = await invitationErrorHandler.getErrorStats();

      expect(result.data).toBeDefined();
      expect(result.data?.totalErrors).toBe(18);
      expect(result.data?.errorsByType).toEqual({
        DATABASE_ERROR: 10,
        NETWORK_ERROR: 5,
        VALIDATION_ERROR: 3
      });
    });

    it('should handle stats fetch errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            group: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      } as any);

      const result = await invitationErrorHandler.getErrorStats();

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('ERROR_STATS_FETCH_FAILED');
    });
  });

  describe('getRecentErrors', () => {
    it('should return recent errors', async () => {
      const mockErrors = [
        {
          id: 'error-1',
          error_type: 'DATABASE_ERROR',
          error_message: 'Connection failed',
          operation: 'validateToken',
          created_at: new Date().toISOString()
        },
        {
          id: 'error-2',
          error_type: 'NETWORK_ERROR',
          error_message: 'Timeout',
          operation: 'sendEmail',
          created_at: new Date().toISOString()
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: mockErrors,
              error: null
            })
          })
        })
      } as any);

      const result = await invitationErrorHandler.getRecentErrors(10);

      expect(result.data).toEqual(mockErrors);
      expect(result.error).toBeUndefined();
    });

    it('should handle recent errors fetch errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      } as any);

      const result = await invitationErrorHandler.getRecentErrors(10);

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('RECENT_ERRORS_FETCH_FAILED');
    });
  });

  describe('clearOldErrors', () => {
    it('should clear old errors successfully', async () => {
      const mockDeletedErrors = [
        { id: 'error-1' },
        { id: 'error-2' }
      ];

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: mockDeletedErrors,
              error: null
            })
          })
        })
      } as any);

      const result = await invitationErrorHandler.clearOldErrors(30);

      expect(result.deletedCount).toBe(2);
      expect(result.error).toBeUndefined();
    });

    it('should handle clear errors failures', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      } as any);

      const result = await invitationErrorHandler.clearOldErrors(30);

      expect(result.deletedCount).toBe(0);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('ERROR_CLEANUP_FAILED');
    });
  });

  describe('error categorization', () => {
    it('should categorize Supabase errors correctly', async () => {
      const supabaseError = {
        code: 'PGRST301',
        message: 'Database connection failed'
      };

      const mockContext = {
        operation: 'testOperation'
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: { id: 'error-log-123' },
          error: null
        })
      } as any);

      const result = await invitationErrorHandler.handleError(supabaseError, mockContext);

      expect(result.code).toBe('DATABASE_ERROR');
    });

    it('should categorize timeout errors correctly', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';

      const mockContext = {
        operation: 'testOperation'
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: { id: 'error-log-123' },
          error: null
        })
      } as any);

      const result = await invitationErrorHandler.handleError(timeoutError, mockContext);

      expect(result.code).toBe('NETWORK_ERROR');
    });

    it('should categorize permission errors correctly', async () => {
      const permissionError = {
        code: 'PGRST401',
        message: 'Insufficient permissions'
      };

      const mockContext = {
        operation: 'testOperation'
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: { id: 'error-log-123' },
          error: null
        })
      } as any);

      const result = await invitationErrorHandler.handleError(permissionError, mockContext);

      expect(result.code).toBe('AUTHENTICATION_ERROR');
    });
  });
});