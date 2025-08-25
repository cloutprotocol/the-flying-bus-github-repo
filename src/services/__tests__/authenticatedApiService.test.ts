import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}));

import { AuthenticatedApiService } from '../authenticatedApiService';
import { supabase } from '@/integrations/supabase/client';

// Mock fetch
global.fetch = vi.fn();

describe('AuthenticatedApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock environment variables
    import.meta.env = {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key'
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('makeAuthenticatedCall', () => {
    it('should successfully make an authenticated API call with service role key', async () => {
      // Mock service role key retrieval
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { value: 'test-service-role-key' },
              error: null
            })
          }))
        }))
      });

      // Mock successful fetch response
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true, data: 'test-data' })
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await AuthenticatedApiService.makeAuthenticatedCall('/test-endpoint', {
        method: 'POST',
        body: { test: 'data' },
        requiresServiceRole: true
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true, data: 'test-data' });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/test-endpoint',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-service-role-key'
          }),
          body: JSON.stringify({ test: 'data' })
        })
      );
    });

    it('should handle missing service role key gracefully', async () => {
      // Mock missing service role key
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          }))
        }))
      });

      const result = await AuthenticatedApiService.makeAuthenticatedCall('/test-endpoint', {
        requiresServiceRole: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service role key not available for authenticated call');
      expect(result.code).toBe('MISSING_SERVICE_ROLE_KEY');
      expect(result.retryable).toBe(false);
    });

    it('should retry on retryable errors with exponential backoff', async () => {
      // Mock service role key retrieval
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { value: 'test-service-role-key' },
              error: null
            })
          }))
        }))
      });

      // Mock fetch to fail twice then succeed
      const mockFailResponse = {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: vi.fn().mockResolvedValue('Service temporarily unavailable')
      };
      
      const mockSuccessResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true, data: 'success-data' })
      };

      (global.fetch as any)
        .mockResolvedValueOnce(mockFailResponse)
        .mockResolvedValueOnce(mockFailResponse)
        .mockResolvedValueOnce(mockSuccessResponse);

      const result = await AuthenticatedApiService.makeAuthenticatedCall('/test-endpoint', {
        retryConfig: {
          maxAttempts: 3,
          baseDelay: 10, // Short delay for testing
          maxDelay: 100,
          backoffMultiplier: 2,
          jitterMax: 5
        }
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true, data: 'success-data' });
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle non-retryable errors immediately', async () => {
      // Mock service role key retrieval
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { value: 'test-service-role-key' },
              error: null
            })
          }))
        }))
      });

      // Mock 401 unauthorized response (non-retryable)
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: vi.fn().mockResolvedValue('{"error": "Invalid credentials"}')
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await AuthenticatedApiService.makeAuthenticatedCall('/test-endpoint');

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 401');
      expect(result.code).toBe('UNAUTHORIZED');
      expect(result.retryable).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retries for 401
    });

    it('should use anon key when service role is not required', async () => {
      // Mock successful fetch response
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: true, data: 'test-data' })
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await AuthenticatedApiService.makeAuthenticatedCall('/test-endpoint', {
        requiresServiceRole: false
      });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/test-endpoint',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-anon-key'
          })
        })
      );
    });
  });

  describe('sendEmail', () => {
    it('should send email with proper authentication', async () => {
      // Mock service role key retrieval
      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { value: 'test-service-role-key' },
              error: null
            })
          }))
        }))
      });

      // Mock successful email response
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ 
          success: true, 
          messageId: 'test-message-id' 
        })
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const emailData = {
        type: 'invitation_confirmation',
        to: 'test@example.com',
        templateData: {
          parentName: 'Test Parent',
          childName: 'Test Child'
        }
      };

      const result = await AuthenticatedApiService.sendEmail(emailData);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/send-email',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-service-role-key'
          }),
          body: JSON.stringify(emailData)
        })
      );
    });
  });


  describe('validateInvitationToken', () => {
    it('should validate token using anon key (not service role)', async () => {
      // Mock successful validation response
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ 
          success: true, 
          invitationData: { id: 'token-id', invitation: { id: 'inv-id' } }
        })
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const tokenData = {
        token: 'test-token-123',
        email: 'test@example.com'
      };

      const result = await AuthenticatedApiService.validateInvitationToken(tokenData);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/invitation-tokens?action=validate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-anon-key' // Uses anon key, not service role
          }),
          body: JSON.stringify(tokenData)
        })
      );
    });
  });

  describe('error handling', () => {
    it('should properly categorize different error types', async () => {
      const testCases = [
        { status: 400, expectedCode: 'BAD_REQUEST' },
        { status: 401, expectedCode: 'UNAUTHORIZED' },
        { status: 403, expectedCode: 'FORBIDDEN' },
        { status: 404, expectedCode: 'NOT_FOUND' },
        { status: 429, expectedCode: 'RATE_LIMITED' },
        { status: 500, expectedCode: 'INTERNAL_SERVER_ERROR' },
        { status: 502, expectedCode: 'BAD_GATEWAY' },
        { status: 503, expectedCode: 'SERVICE_UNAVAILABLE' },
        { status: 504, expectedCode: 'GATEWAY_TIMEOUT' }
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        
        const mockResponse = {
          ok: false,
          status: testCase.status,
          statusText: 'Error',
          text: vi.fn().mockResolvedValue('{"error": "Test error"}')
        };
        (global.fetch as any).mockResolvedValue(mockResponse);

        const result = await AuthenticatedApiService.makeAuthenticatedCall('/test', {
          requiresServiceRole: false,
          retryConfig: { maxAttempts: 1 }
        });

        expect(result.success).toBe(false);
        expect(result.code).toBe(testCase.expectedCode);
      }
    });

    it('should handle timeout errors properly', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';
      (global.fetch as any).mockRejectedValue(timeoutError);

      const result = await AuthenticatedApiService.makeAuthenticatedCall('/test', {
        requiresServiceRole: false,
        retryConfig: { maxAttempts: 1 }
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('TIMEOUT_ERROR');
      expect(result.retryable).toBe(true);
    });
  });
});