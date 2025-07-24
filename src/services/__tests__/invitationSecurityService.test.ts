import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invitationSecurityService } from '../invitationSecurityService';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('@/utils/logger/logger');

const mockSupabase = vi.mocked(supabase);

describe('InvitationSecurityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkTokenValidationRateLimit', () => {
    it('should allow validation when under rate limit', async () => {
      const mockIpAddress = '192.168.1.1';
      const mockToken = 'test-token';

      // Mock rate limit check - return low count
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: [{ count: 5 }], // Under limit
              error: null
            })
          })
        })
      } as any);

      const result = await invitationSecurityService.checkTokenValidationRateLimit(mockIpAddress, mockToken);

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBeGreaterThan(0);
    });

    it('should block validation when rate limit exceeded', async () => {
      const mockIpAddress = '192.168.1.1';
      const mockToken = 'test-token';

      // Mock rate limit check - return high count
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: Array(50).fill({ count: 1 }), // Over limit
              error: null
            })
          })
        })
      } as any);

      const result = await invitationSecurityService.checkTokenValidationRateLimit(mockIpAddress, mockToken);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('rate limit');
    });

    it('should handle database errors gracefully', async () => {
      const mockIpAddress = '192.168.1.1';
      const mockToken = 'test-token';

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      } as any);

      const result = await invitationSecurityService.checkTokenValidationRateLimit(mockIpAddress, mockToken);

      // Should allow on error to avoid blocking legitimate users
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkReplayAttack', () => {
    it('should detect replay attacks', async () => {
      const mockToken = 'replay-token';
      const mockIpAddress = '192.168.1.1';

      // Mock recent identical requests
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [
                    { created_at: new Date().toISOString() },
                    { created_at: new Date().toISOString() },
                    { created_at: new Date().toISOString() }
                  ],
                  error: null
                })
              })
            })
          })
        })
      } as any);

      const result = await invitationSecurityService.checkReplayAttack(mockToken, mockIpAddress);

      expect(result.isReplay).toBe(true);
      expect(result.reason).toContain('replay');
    });

    it('should allow legitimate requests', async () => {
      const mockToken = 'legitimate-token';
      const mockIpAddress = '192.168.1.1';

      // Mock no recent requests
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        })
      } as any);

      const result = await invitationSecurityService.checkReplayAttack(mockToken, mockIpAddress);

      expect(result.isReplay).toBe(false);
    });
  });

  describe('checkSuspiciousActivity', () => {
    it('should detect suspicious activity patterns', async () => {
      const mockIpAddress = '192.168.1.1';

      // Mock high activity from IP
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: Array(100).fill({ event_type: 'token_validation_attempt' }),
              error: null
            })
          })
        })
      } as any);

      const result = await invitationSecurityService.checkSuspiciousActivity(mockIpAddress);

      expect(result.isSuspicious).toBe(true);
      expect(result.riskScore).toBeGreaterThan(50);
    });

    it('should allow normal activity', async () => {
      const mockIpAddress = '192.168.1.1';

      // Mock normal activity
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: [{ event_type: 'token_validation_attempt' }],
              error: null
            })
          })
        })
      } as any);

      const result = await invitationSecurityService.checkSuspiciousActivity(mockIpAddress);

      expect(result.isSuspicious).toBe(false);
      expect(result.riskScore).toBeLessThan(50);
    });
  });

  describe('validateTokenIntegrity', () => {
    it('should validate properly formatted tokens', async () => {
      const validToken = 'abcdefghijklmnopqrstuvwxyz123456';

      const result = await invitationSecurityService.validateTokenIntegrity(validToken);

      expect(result.valid).toBe(true);
    });

    it('should reject tokens that are too short', async () => {
      const shortToken = 'short';

      const result = await invitationSecurityService.validateTokenIntegrity(shortToken);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('too short');
    });

    it('should reject tokens with invalid characters', async () => {
      const invalidToken = 'token-with-invalid-chars!@#$%';

      const result = await invitationSecurityService.validateTokenIntegrity(invalidToken);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('invalid characters');
    });

    it('should reject null or undefined tokens', async () => {
      const result1 = await invitationSecurityService.validateTokenIntegrity(null as any);
      const result2 = await invitationSecurityService.validateTokenIntegrity(undefined as any);

      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security events successfully', async () => {
      const mockEvent = {
        eventType: 'token_validation_attempt' as const,
        ipAddress: '192.168.1.1',
        tokenHash: 'abc123',
        details: { test: 'data' },
        severity: 'low' as const
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: { id: 'event-123' },
          error: null
        })
      } as any);

      const result = await invitationSecurityService.logSecurityEvent(mockEvent);

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('security_audit_log');
    });

    it('should handle logging errors gracefully', async () => {
      const mockEvent = {
        eventType: 'token_validation_attempt' as const,
        ipAddress: '192.168.1.1',
        tokenHash: 'abc123',
        details: { test: 'data' },
        severity: 'low' as const
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      } as any);

      const result = await invitationSecurityService.logSecurityEvent(mockEvent);

      expect(result).toBe(false);
    });
  });

  describe('checkClaimRateLimit', () => {
    it('should allow claims when under rate limit', async () => {
      const mockIpAddress = '192.168.1.1';
      const mockEmail = 'test@example.com';

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: [{ count: 2 }], // Under limit
              error: null
            })
          })
        })
      } as any);

      const result = await invitationSecurityService.checkClaimRateLimit(mockIpAddress, mockEmail);

      expect(result.allowed).toBe(true);
    });

    it('should block claims when rate limit exceeded', async () => {
      const mockIpAddress = '192.168.1.1';
      const mockEmail = 'test@example.com';

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: Array(10).fill({ count: 1 }), // Over limit
              error: null
            })
          })
        })
      } as any);

      const result = await invitationSecurityService.checkClaimRateLimit(mockIpAddress, mockEmail);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('rate limit');
    });
  });

  describe('verifyEmailOwnership', () => {
    it('should verify email ownership for existing users', async () => {
      const mockEmail = 'existing@example.com';
      const mockToken = 'test-token';

      // Mock existing user
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'user-123', email: mockEmail },
              error: null
            })
          })
        })
      } as any);

      const result = await invitationSecurityService.verifyEmailOwnership(mockEmail, mockToken);

      expect(result.requiresVerification).toBe(true);
      expect(result.verified).toBe(true);
    });

    it('should handle new users without verification requirement', async () => {
      const mockEmail = 'new@example.com';
      const mockToken = 'test-token';

      // Mock no existing user
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' } // No rows returned
            })
          })
        })
      } as any);

      const result = await invitationSecurityService.verifyEmailOwnership(mockEmail, mockToken);

      expect(result.requiresVerification).toBe(false);
      expect(result.verified).toBe(true);
    });
  });

  describe('getSecurityMetrics', () => {
    it('should return security metrics', async () => {
      const mockMetrics = [
        { event_type: 'token_validation_attempt', count: 100 },
        { event_type: 'suspicious_validation_attempt', count: 5 },
        { event_type: 'rate_limit_exceeded', count: 10 }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            group: vi.fn().mockResolvedValue({
              data: mockMetrics,
              error: null
            })
          })
        })
      } as any);

      const result = await invitationSecurityService.getSecurityMetrics();

      expect(result.data).toBeDefined();
      expect(result.data?.totalEvents).toBe(115);
      expect(result.data?.suspiciousEvents).toBe(5);
      expect(result.data?.rateLimitEvents).toBe(10);
    });

    it('should handle metrics fetch errors', async () => {
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

      const result = await invitationSecurityService.getSecurityMetrics();

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('SECURITY_METRICS_FETCH_FAILED');
    });
  });

  describe('error handling', () => {
    it('should handle exceptions in checkTokenValidationRateLimit', async () => {
      const mockIpAddress = '192.168.1.1';
      const mockToken = 'test-token';

      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await invitationSecurityService.checkTokenValidationRateLimit(mockIpAddress, mockToken);

      // Should allow on exception to avoid blocking legitimate users
      expect(result.allowed).toBe(true);
    });

    it('should handle exceptions in logSecurityEvent', async () => {
      const mockEvent = {
        eventType: 'token_validation_attempt' as const,
        ipAddress: '192.168.1.1',
        tokenHash: 'abc123',
        details: { test: 'data' },
        severity: 'low' as const
      };

      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await invitationSecurityService.logSecurityEvent(mockEvent);

      expect(result).toBe(false);
    });
  });
});