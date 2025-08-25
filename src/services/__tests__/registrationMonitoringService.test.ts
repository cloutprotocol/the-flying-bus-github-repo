import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { registrationMonitoring, RegistrationMonitoringService } from '../registrationMonitoringService';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ single: vi.fn() }))
      })),
      select: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({ single: vi.fn() }))
        }))
      }))
    }))
  }
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'test-user-agent'
  },
  writable: true
});

describe('RegistrationMonitoringService', () => {
  let service: RegistrationMonitoringService;
  const mockSupabaseFrom = vi.mocked(supabase.from);

  beforeEach(() => {
    service = RegistrationMonitoringService.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Performance Tracking', () => {
    it('should start and end performance tracking correctly', () => {
      const attemptId = 'test-attempt-123';
      
      // Start tracking
      service.startPerformanceTracking(attemptId);
      expect(logger.info).toHaveBeenCalledWith(
        'Registration performance tracking started',
        { attemptId }
      );

      // End tracking
      const duration = service.endPerformanceTracking(attemptId);
      expect(duration).toBeGreaterThan(0);
      expect(logger.info).toHaveBeenCalledWith(
        'Registration performance tracking completed',
        { attemptId, duration_ms: duration }
      );
    });

    it('should handle missing performance tracking gracefully', () => {
      const attemptId = 'non-existent-attempt';
      
      const duration = service.endPerformanceTracking(attemptId);
      expect(duration).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(
        'Performance tracking not found for attempt',
        { attemptId }
      );
    });

    it('should clean up performance marks after tracking', () => {
      const attemptId = 'cleanup-test';
      
      service.startPerformanceTracking(attemptId);
      service.endPerformanceTracking(attemptId);
      
      // Second call should return 0 (mark was cleaned up)
      const secondDuration = service.endPerformanceTracking(attemptId);
      expect(secondDuration).toBe(0);
    });
  });

  describe('Registration Attempt Logging', () => {
    it('should log successful registration attempt', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockReturnValue({
        insert: mockInsert
      } as any);

      const attempt = {
        user_id: 'user-123',
        registration_type: 'standard' as const,
        email: 'test@example.com',
        attempt_timestamp: new Date().toISOString(),
        success: true,
        completion_time_ms: 1500
      };

      await service.logRegistrationAttempt(attempt);

      expect(mockSupabaseFrom).toHaveBeenCalledWith('registration_attempts');
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: attempt.user_id,
        registration_type: attempt.registration_type,
        email: attempt.email,
        attempt_timestamp: attempt.attempt_timestamp,
        success: attempt.success,
        error_type: attempt.error_type,
        error_message: attempt.error_message,
        completion_time_ms: attempt.completion_time_ms,
        rls_bypass_used: false,
        service_role_used: false,
        invitation_token: attempt.invitation_token,
        user_agent: undefined,
        ip_address: attempt.ip_address,
        metadata: {}
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Registration attempt logged',
        expect.objectContaining({
          registration_type: 'standard',
          email: 'test@example.com',
          success: true
        })
      );
    });

    it('should handle database insertion errors gracefully', async () => {
      const mockError = new Error('Database connection failed');
      const mockInsert = vi.fn().mockResolvedValue({ error: mockError });
      mockSupabaseFrom.mockReturnValue({
        insert: mockInsert
      } as any);

      const attempt = {
        registration_type: 'standard' as const,
        email: 'test@example.com',
        attempt_timestamp: new Date().toISOString(),
        success: false,
        error_type: 'NETWORK_ERROR',
        error_message: 'Connection timeout'
      };

      await service.logRegistrationAttempt(attempt);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to store registration attempt in database',
        { error: mockError, attempt }
      );
    });
  });

  describe('Successful Registration Logging', () => {
    it('should log successful standard registration', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockReturnValue({
        insert: mockInsert
      } as any);

      await service.logSuccessfulRegistration(
        'standard',
        'user-123',
        'test@example.com',
        2000,
        {
          rlsBypassUsed: false,
          serviceRoleUsed: true,
          metadata: { username: 'testuser' }
        }
      );

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          registration_type: 'standard',
          email: 'test@example.com',
          success: true,
          completion_time_ms: 2000,
          rls_bypass_used: false,
          service_role_used: true,
          metadata: { username: 'testuser' }
        })
      );
    });

    it('should log successful invitation registration', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockReturnValue({
        insert: mockInsert
      } as any);

      await service.logSuccessfulRegistration(
        'invitation',
        'user-456',
        'author@example.com',
        3000,
        {
          rlsBypassUsed: true,
          serviceRoleUsed: true,
          invitationToken: 'token-123',
          metadata: { firstName: 'John', lastName: 'Doe' }
        }
      );

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-456',
          registration_type: 'invitation',
          email: 'author@example.com',
          success: true,
          completion_time_ms: 3000,
          rls_bypass_used: true,
          service_role_used: true,
          invitation_token: 'token-123',
          metadata: { firstName: 'John', lastName: 'Doe' }
        })
      );
    });
  });

  describe('Failed Registration Logging', () => {
    it('should log failed registration with error categorization', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockReturnValue({
        insert: mockInsert
      } as any);

      const error = new Error('RLS policy violation detected');
      
      await service.logFailedRegistration(
        'standard',
        'test@example.com',
        error,
        1200,
        {
          rlsBypassUsed: false,
          metadata: { attemptNumber: 1 }
        }
      );

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          registration_type: 'standard',
          email: 'test@example.com',
          success: false,
          error_type: 'RLS_VIOLATION',
          error_message: 'RLS policy violation detected',
          completion_time_ms: 1200,
          rls_bypass_used: false,
          metadata: { attemptNumber: 1 }
        })
      );
    });

    it('should categorize different error types correctly', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockReturnValue({
        insert: mockInsert
      } as any);

      const testCases = [
        { error: new Error('timeout occurred'), expectedType: 'TIMEOUT_ERROR' },
        { error: new Error('Invalid email format'), expectedType: 'VALIDATION_ERROR' },
        { error: new Error('Database connection failed'), expectedType: 'DATABASE_ERROR' },
        { error: new Error('Authentication failed'), expectedType: 'AUTH_ERROR' },
        { error: new Error('Fetch request failed'), expectedType: 'NETWORK_ERROR' },
        { error: new Error('Something unexpected'), expectedType: 'UNKNOWN_ERROR' }
      ];

      for (const testCase of testCases) {
        await service.logFailedRegistration(
          'standard',
          'test@example.com',
          testCase.error,
          1000
        );

        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            error_type: testCase.expectedType,
            error_message: testCase.error.message
          })
        );
      }
    });
  });

  describe('RLS Violation Logging', () => {
    it('should log RLS violations with context', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockReturnValue({
        insert: mockInsert
      } as any);

      await service.logRLSViolation(
        'profile_creation',
        'standard_insert',
        'user-123',
        { registrationType: 'standard', table: 'profiles' }
      );

      expect(mockSupabaseFrom).toHaveBeenCalledWith('rls_violations');
      expect(mockInsert).toHaveBeenCalledWith({
        context: 'profile_creation',
        operation: 'standard_insert',
        user_id: 'user-123',
        violation_timestamp: expect.any(String),
        details: { registrationType: 'standard', table: 'profiles' },
        resolved: false
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'RLS policy violation detected',
        expect.objectContaining({
          context: 'profile_creation',
          operation: 'standard_insert',
          userId: 'user-123'
        })
      );
    });

    it('should handle RLS violation logging errors', async () => {
      const mockError = new Error('Failed to insert violation');
      const mockInsert = vi.fn().mockRejectedValue(mockError);
      mockSupabaseFrom.mockReturnValue({
        insert: mockInsert
      } as any);

      await service.logRLSViolation('test_context', 'test_operation');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to log RLS violation to database',
        { error: mockError }
      );
    });
  });

  describe('Service Role Usage Logging', () => {
    it('should log successful service role usage', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockReturnValue({
        insert: mockInsert
      } as any);

      await service.logServiceRoleUsage(
        'profile_creation',
        'registration_flow',
        'user-123',
        true,
        { registrationType: 'invitation' }
      );

      expect(mockSupabaseFrom).toHaveBeenCalledWith('service_role_usage');
      expect(mockInsert).toHaveBeenCalledWith({
        operation: 'profile_creation',
        context: 'registration_flow',
        user_id: 'user-123',
        usage_timestamp: expect.any(String),
        success: true,
        details: { registrationType: 'invitation' }
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Service role usage logged',
        expect.objectContaining({
          operation: 'profile_creation',
          context: 'registration_flow',
          userId: 'user-123',
          success: true
        })
      );
    });

    it('should log failed service role usage', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockReturnValue({
        insert: mockInsert
      } as any);

      await service.logServiceRoleUsage(
        'profile_creation',
        'registration_flow',
        'user-456',
        false,
        { error: 'Permission denied' }
      );

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          details: { error: 'Permission denied' }
        })
      );
    });
  });

  describe('Metrics Calculation', () => {
    it('should fetch and calculate registration metrics', async () => {
      const mockAttempts = [
        {
          registration_type: 'standard',
          success: true,
          completion_time_ms: 1000,
          rls_bypass_used: false,
          service_role_used: true,
          error_type: null
        },
        {
          registration_type: 'standard',
          success: false,
          completion_time_ms: 800,
          rls_bypass_used: false,
          service_role_used: false,
          error_type: 'VALIDATION_ERROR'
        },
        {
          registration_type: 'invitation',
          success: true,
          completion_time_ms: 1500,
          rls_bypass_used: true,
          service_role_used: true,
          error_type: null
        }
      ];

      const mockSelect = vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue({ data: mockAttempts, error: null })
        })
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect
      } as any);

      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-01-02T00:00:00Z';

      const metrics = await service.getRegistrationMetrics(startDate, endDate);

      expect(metrics).toEqual({
        total_attempts: 3,
        successful_registrations: 2,
        failed_registrations: 1,
        success_rate: expect.closeTo(66.67, 0.01),
        average_completion_time_ms: 1100,
        rls_violations: 1,
        service_role_usage: 2,
        by_type: {
          standard: {
            attempts: 2,
            success_rate: 50,
            avg_completion_time: 900
          },
          invitation: {
            attempts: 1,
            success_rate: 100,
            avg_completion_time: 1500
          }
        },
        error_breakdown: {
          VALIDATION_ERROR: 1
        }
      });
    });

    it('should handle empty metrics gracefully', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect
      } as any);

      const metrics = await service.getRegistrationMetrics('2024-01-01', '2024-01-02');

      expect(metrics).toEqual({
        total_attempts: 0,
        successful_registrations: 0,
        failed_registrations: 0,
        success_rate: 0,
        average_completion_time_ms: 0,
        rls_violations: 0,
        service_role_usage: 0,
        by_type: {
          standard: {
            attempts: 0,
            success_rate: 0,
            avg_completion_time: 0
          },
          invitation: {
            attempts: 0,
            success_rate: 0,
            avg_completion_time: 0
          }
        },
        error_breakdown: {}
      });
    });
  });

  describe('Current Success Rate', () => {
    it('should get current success rate for specified hours', async () => {
      const mockAttempts = [
        { success: true },
        { success: true },
        { success: false },
        { success: true }
      ];

      const mockSelect = vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue({ data: mockAttempts, error: null })
        })
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect
      } as any);

      const successRate = await service.getCurrentSuccessRate(24);

      expect(successRate).toBe(75); // 3 out of 4 successful
    });

    it('should return 0 for no attempts', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect
      } as any);

      const successRate = await service.getCurrentSuccessRate(24);

      expect(successRate).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = RegistrationMonitoringService.getInstance();
      const instance2 = RegistrationMonitoringService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});