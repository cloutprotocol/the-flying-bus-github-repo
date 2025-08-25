import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn()
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    })),
    rpc: vi.fn()
  }
}));

vi.mock('../rateLimitService', () => ({
  default: {
    checkRateLimit: vi.fn(),
    recordAttempt: vi.fn()
  }
}));

vi.mock('../auditLogService', () => ({
  default: {
    logEvent: vi.fn(),
    logInvitationRequest: vi.fn(),
    logTokenValidation: vi.fn()
  }
}));

vi.mock('../inputSanitizationService', () => ({
  default: {
    sanitizeInvitationRequest: vi.fn((data) => data)
  }
}));

vi.mock('../authenticatedApiService', () => ({
  AuthenticatedApiService: {
    sendEmail: vi.fn(),
    validateInvitationToken: vi.fn(),
    markTokenAsUsed: vi.fn()
  }
}));

// Mock fetch
global.fetch = vi.fn();

import { createInvitationRequest, updateInvitationRequestStatus, validateInvitationToken } from '../invitationService';
import { supabase } from '@/integrations/supabase/client';
import RateLimitService from '../rateLimitService';
import AuditLogService from '../auditLogService';
import InputSanitizationService from '../inputSanitizationService';
import { AuthenticatedApiService } from '../authenticatedApiService';

describe('InvitationService Enhanced Fallback Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock environment variables
    import.meta.env = {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_SITE_URL: 'https://test-site.com'
    };

    // Setup default mocks
    RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true });
    RateLimitService.recordAttempt.mockResolvedValue(undefined);
    AuditLogService.logEvent.mockResolvedValue(undefined);
    AuditLogService.logInvitationRequest.mockResolvedValue(undefined);
    InputSanitizationService.sanitizeInvitationRequest.mockImplementation((data) => data);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createInvitationRequest with enhanced fallback', () => {
    it('should create invitation and send confirmation email using authenticated fallback', async () => {
      // Mock successful database insertion
      (supabase.from as any).mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'test-invitation-id',
                parent_name: 'Test Parent',
                parent_email: 'test@example.com',
                child_name: 'Test Child',
                child_age: 10,
                status: 'pending',
                created_at: '2024-01-01T00:00:00Z'
              },
              error: null
            })
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            error: null
          }))
        }))
      });

      // Mock failed RPC call (trigger failure)
      (supabase.rpc as any).mockResolvedValue({
        error: { message: 'Database trigger failed', code: 'TRIGGER_ERROR' }
      });

      // Mock successful authenticated email service
      AuthenticatedApiService.sendEmail.mockResolvedValue({
        success: true,
        data: { messageId: 'test-message-id' }
      });

      const invitationData = {
        parent_name: 'Test Parent',
        parent_email: 'test@example.com',
        child_name: 'Test Child',
        child_age: 10,
        message: 'Test message'
      };

      const result = await createInvitationRequest(invitationData);

      expect(result.data).toBeDefined();
      expect(result.data.id).toBe('test-invitation-id');
      expect(result.details.emailSent).toBe(true);
      expect(result.details.emailMethod).toBe('client_fallback');

      // Verify that the authenticated API service was called
      expect(AuthenticatedApiService.sendEmail).toHaveBeenCalledWith({
        type: 'invitation_confirmation',
        to: 'test@example.com',
        templateData: {
          parentName: 'Test Parent',
          childName: 'Test Child',
          submissionDate: '1/1/2024'
        }
      });

      // Verify audit logging
      expect(AuditLogService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'confirmation_email_fallback_success'
        })
      );
    });

    it('should handle authentication failure gracefully', async () => {
      // Mock successful database insertion
      (supabase.from as any).mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'test-invitation-id',
                parent_name: 'Test Parent',
                parent_email: 'test@example.com',
                child_name: 'Test Child',
                child_age: 10,
                status: 'pending',
                created_at: '2024-01-01T00:00:00Z'
              },
              error: null
            })
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            error: null
          }))
        }))
      });

      // Mock failed RPC call
      (supabase.rpc as any).mockResolvedValue({
        error: { message: 'Database trigger failed' }
      });

      // Mock failed authenticated email service (authentication issue)
      AuthenticatedApiService.sendEmail.mockResolvedValue({
        success: false,
        error: 'Service role key not available for authenticated call',
        code: 'MISSING_SERVICE_ROLE_KEY',
        retryable: false
      });

      const invitationData = {
        parent_name: 'Test Parent',
        parent_email: 'test@example.com',
        child_name: 'Test Child',
        child_age: 10
      };

      const result = await createInvitationRequest(invitationData);

      expect(result.data).toBeDefined();
      expect(result.data.id).toBe('test-invitation-id');
      expect(result.details.emailSent).toBe(false);
      expect(result.details.emailError).toContain('Service role key not available');
      expect(result.details.userMessage).toContain('confirmation email');

      // Verify audit logging for failure
      expect(AuditLogService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'confirmation_email_fallback_failed'
        })
      );
    });
  });

  describe('updateInvitationRequestStatus with enhanced fallback', () => {
    it('should approve invitation and send invitation email using authenticated fallback', async () => {
      // Mock successful database update
      (supabase.from as any).mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'test-invitation-id',
                  parent_name: 'Test Parent',
                  parent_email: 'test@example.com',
                  child_name: 'Test Child',
                  status: 'approved',
                  reviewed_at: '2024-01-01T00:00:00Z',
                  reviewer_id: 'test-reviewer-id'
                },
                error: null
              })
            }))
          }))
        }))
      });

      // Mock failed RPC call (trigger failure)
      (supabase.rpc as any).mockResolvedValue({
        error: { message: 'Database trigger failed', code: 'TRIGGER_ERROR' }
      });

      // Mock successful authenticated email service (Edge Function handles token generation)
      AuthenticatedApiService.sendEmail.mockResolvedValue({
        success: true,
        data: { messageId: 'test-message-id' }
      });

      const result = await updateInvitationRequestStatus(
        'test-invitation-id',
        'approved',
        'test-reviewer-id'
      );

      expect(result.data).toBeDefined();
      expect(result.data.status).toBe('approved');
      expect(result.details.emailSent).toBe(true);
      expect(result.details.emailMethod).toBe('client_fallback');

      // Verify email sending was called with invitationId (Edge Function handles token generation)
      expect(AuthenticatedApiService.sendEmail).toHaveBeenCalledWith({
        type: 'invitation_approved',
        to: 'test@example.com',
        templateData: expect.objectContaining({
          parentName: 'Test Parent',
          childName: 'Test Child',
          invitationId: 'test-invitation-id'
        })
      });

      // Verify audit logging
      expect(AuditLogService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'invitation_email_fallback_success'
        })
      );
    });

    it('should handle email sending failure in fallback', async () => {
      // Mock successful database update
      (supabase.from as any).mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'test-invitation-id',
                  parent_name: 'Test Parent',
                  parent_email: 'test@example.com',
                  child_name: 'Test Child',
                  status: 'approved'
                },
                error: null
              })
            }))
          }))
        }))
      });

      // Mock failed RPC call
      (supabase.rpc as any).mockResolvedValue({
        error: { message: 'Database trigger failed' }
      });

      // Mock failed email sending (Edge Function handles token generation internally)
      AuthenticatedApiService.sendEmail.mockResolvedValue({
        success: false,
        error: 'Edge Function failed to send email',
        code: 'EMAIL_SEND_FAILED',
        retryable: true
      });

      const result = await updateInvitationRequestStatus(
        'test-invitation-id',
        'approved',
        'test-reviewer-id'
      );

      expect(result.data).toBeDefined();
      expect(result.data.status).toBe('approved');
      expect(result.details.emailSent).toBe(false);
      expect(result.details.emailError).toContain('Edge Function failed to send email');
      expect(result.details.userMessage).toContain('invitation email');

      // Verify audit logging for email failure
      expect(AuditLogService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'invitation_email_fallback_failed'
        })
      );
    });
  });

  describe('validateInvitationToken with enhanced authentication', () => {
    it('should validate token using authenticated API service', async () => {
      // Mock successful rate limit check
      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true });

      // Mock successful token validation
      AuthenticatedApiService.validateInvitationToken.mockResolvedValue({
        success: true,
        data: {
          invitationData: {
            id: 'token-id',
            invitation: {
              id: 'invitation-id',
              parent_email: 'test@example.com',
              parent_name: 'Test Parent',
              child_name: 'Test Child'
            }
          }
        }
      });

      const result = await validateInvitationToken('a'.repeat(64), 'test@example.com');

      expect(result.data).toBeDefined();
      expect(result.data.invitation.parent_email).toBe('test@example.com');

      // Verify authenticated API service was called
      expect(AuthenticatedApiService.validateInvitationToken).toHaveBeenCalledWith({
        token: 'a'.repeat(64),
        email: 'test@example.com'
      });

      // Verify audit logging
      expect(AuditLogService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'token_validation_success'
        })
      );
    });

    it('should handle validation failure with proper error handling', async () => {
      // Mock successful rate limit check
      RateLimitService.checkRateLimit.mockResolvedValue({ allowed: true });

      // Mock failed token validation
      AuthenticatedApiService.validateInvitationToken.mockResolvedValue({
        success: false,
        error: 'Invalid or expired token',
        code: 'TOKEN_NOT_FOUND',
        retryable: false
      });

      const result = await validateInvitationToken('a'.repeat(64), 'test@example.com');

      expect(result.error).toBe('Invalid or expired token');
      expect(result.code).toBe('TOKEN_NOT_FOUND');
      expect(result.retryable).toBe(false);
      expect(result.details.userMessage).toContain('invitation token');

      // Verify audit logging for failure
      expect(AuditLogService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'token_validation_failed'
        })
      );
    });

    it('should handle rate limiting properly', async () => {
      // Mock rate limit exceeded
      RateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        resetTime: Date.now() + 60000,
        remainingAttempts: 0
      });

      const result = await validateInvitationToken('a'.repeat(64), 'test@example.com');

      expect(result.error).toContain('Too many validation attempts');
      expect(result.code).toBe('RATE_LIMITED');
      expect(result.retryable).toBe(true);
      expect(result.details.userMessage).toContain('wait before trying again');

      // Verify rate limit was recorded
      expect(RateLimitService.recordAttempt).toHaveBeenCalledWith(
        'token_validation',
        'test@example.com',
        false,
        expect.objectContaining({
          reason: 'rate_limited'
        })
      );
    });
  });

  describe('error handling and user feedback', () => {
    it('should provide appropriate user messages for different error types', async () => {
      const testCases = [
        {
          mockError: { code: 'MISSING_SERVICE_ROLE_KEY', error: 'Service role key not available' },
          expectedMessage: 'confirmation email'
        },
        {
          mockError: { code: 'NETWORK_ERROR', error: 'Network error occurred' },
          expectedMessage: 'confirmation email'
        },
        {
          mockError: { code: 'TIMEOUT_ERROR', error: 'Request timed out' },
          expectedMessage: 'confirmation email'
        }
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();

        // Mock database operations
        (supabase.from as any).mockReturnValue({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'test-id', parent_email: 'test@example.com' },
                error: null
              })
            }))
          }))
        });

        (supabase.rpc as any).mockResolvedValue({ error: { message: 'Trigger failed' } });

        // Mock failed email service
        AuthenticatedApiService.sendEmail.mockResolvedValue({
          success: false,
          ...testCase.mockError
        });

        const result = await createInvitationRequest({
          parent_name: 'Test',
          parent_email: 'test@example.com',
          child_name: 'Test Child',
          child_age: 10
        });

        expect(result.details.userMessage).toContain(testCase.expectedMessage);
      }
    });
  });
});