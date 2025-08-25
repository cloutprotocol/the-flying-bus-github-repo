import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configurationValidationService } from '../configurationValidationService';
import { ConfigurationUtils } from '@/utils/configurationUtils';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        })),
        limit: vi.fn(() => ({
          single: vi.fn()
        })),
        in: vi.fn()
      }))
    })),
    rpc: vi.fn()
  }
}));

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key'
  }
}));

describe('ConfigurationValidationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateStartupConfiguration', () => {
    it('should return valid result when all checks pass', async () => {
      // Mock successful responses
      const mockSupabase = await import('@/integrations/supabase/client');
      
      // Mock database connection
      mockSupabase.supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE5MDA0NDQ0NDR9.test-signature' },
              error: null
            })
          }),
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: {}, error: null })
          }),
          in: vi.fn().mockResolvedValue({
            data: [
              { key: 'supabase_service_role_key', value: 'test-key' },
              { key: 'resend_api_key', value: 'test-resend-key' },
              { key: 'app_url', value: 'https://test.com' }
            ],
            error: null
          })
        })
      });

      // Mock fetch for Edge Function tests
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true
      });

      const result = await configurationValidationService.validateStartupConfiguration();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.details.environment.requiredVars).toBe(true);
      expect(result.details.environment.supabaseConfig).toBe(true);
    });

    it('should return invalid result when database configuration is missing', async () => {
      const mockSupabase = await import('@/integrations/supabase/client');
      
      // Mock missing service role key in database
      mockSupabase.supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('No rows returned')
            })
          }),
          limit: vi.fn().mockResolvedValue({ data: {}, error: null }),
          in: vi.fn().mockResolvedValue({
            data: [], // No configuration keys found
            error: null
          })
        })
      });

      const result = await configurationValidationService.validateStartupConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Service role key not found'))).toBe(true);
    });

    it('should handle database connection errors', async () => {
      const mockSupabase = await import('@/integrations/supabase/client');
      
      mockSupabase.supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            error: new Error('Database connection failed')
          })
        })
      });

      const result = await configurationValidationService.validateStartupConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Database connection failed'))).toBe(true);
    });
  });

  describe('performHealthCheck', () => {
    it('should return healthy status when all checks pass', async () => {
      const mockSupabase = await import('@/integrations/supabase/client');
      
      // Mock successful database queries
      mockSupabase.supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: {}, error: null }),
          in: vi.fn().mockResolvedValue({
            data: [
              { key: 'supabase_service_role_key', value: 'test-key' },
              { key: 'resend_api_key', value: 'test-resend-key' },
              { key: 'app_url', value: 'https://test.com' }
            ],
            error: null
          }),
          gte: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [{ success: true }, { success: true }],
              error: null
            })
          })
        })
      });

      // Mock successful fetch
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true
      });

      const result = await configurationValidationService.performHealthCheck();

      expect(result.status).toBe('healthy');
      expect(result.checks.database.status).toBe('pass');
      expect(result.checks.configuration.status).toBe('pass');
      expect(result.timestamp).toBeDefined();
    });

    it('should return degraded status when some checks have warnings', async () => {
      const mockSupabase = await import('@/integrations/supabase/client');
      
      // Mock database success but Edge Function issues
      mockSupabase.supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: {}, error: null }),
          in: vi.fn().mockResolvedValue({
            data: [
              { key: 'supabase_service_role_key', value: 'test-key' },
              { key: 'resend_api_key', value: 'test-resend-key' },
              { key: 'app_url', value: 'https://test.com' }
            ],
            error: null
          }),
          gte: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [{ success: false }, { success: true }], // Low success rate
              error: null
            })
          })
        })
      });

      // Mock Edge Function connectivity success but authentication failure
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ status: 200, ok: true }) // Connectivity test passes
        .mockResolvedValueOnce({ status: 401, ok: false }); // Authentication test fails

      const result = await configurationValidationService.performHealthCheck();

      expect(result.status).toBe('degraded');
      expect(result.checks.emailSystem.status).toBe('warn'); // Low success rate should cause warning
    });
  });
});

describe('ConfigurationUtils', () => {
  describe('isValidServiceRoleKeyFormat', () => {
    it('should validate correct service role key format', () => {
      const validKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE5MDA0NDQ0NDR9.test-signature-that-makes-this-key-long-enough-to-pass-validation';
      
      expect(ConfigurationUtils.isValidServiceRoleKeyFormat(validKey)).toBe(true);
    });

    it('should reject invalid service role key formats', () => {
      expect(ConfigurationUtils.isValidServiceRoleKeyFormat('')).toBe(false);
      expect(ConfigurationUtils.isValidServiceRoleKeyFormat('short')).toBe(false);
      expect(ConfigurationUtils.isValidServiceRoleKeyFormat('not-jwt-format')).toBe(false);
      expect(ConfigurationUtils.isValidServiceRoleKeyFormat('eyJ.invalid')).toBe(false); // Not 3 parts
    });

    it('should handle null and undefined inputs', () => {
      expect(ConfigurationUtils.isValidServiceRoleKeyFormat(null as any)).toBe(false);
      expect(ConfigurationUtils.isValidServiceRoleKeyFormat(undefined as any)).toBe(false);
    });
  });

  describe('validateEnvironmentVariables', () => {
    it('should pass when all required variables are present', () => {
      const result = ConfigurationUtils.validateEnvironmentVariables();
      expect(result.success).toBe(true);
    });
  });

  describe('performInitialSetup', () => {
    it('should complete setup when all validations pass', async () => {
      const mockSupabase = await import('@/integrations/supabase/client');
      
      // Mock all successful responses
      mockSupabase.supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: {}, error: null })
        })
      });

      mockSupabase.supabase.rpc
        .mockResolvedValueOnce({ // validate_system_configuration
          data: { is_valid: true, missing_keys: [], invalid_keys: [] },
          error: null
        })
        .mockResolvedValueOnce({ // test_edge_function_connectivity
          data: { success: true },
          error: null
        });

      const result = await ConfigurationUtils.performInitialSetup();

      expect(result.success).toBe(true);
      expect(result.message).toContain('completed successfully');
    });

    it('should handle setup failures gracefully', async () => {
      const mockSupabase = await import('@/integrations/supabase/client');
      
      // Mock database connection failure
      mockSupabase.supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ 
            data: null, 
            error: new Error('Connection failed') 
          })
        })
      });

      const result = await ConfigurationUtils.performInitialSetup();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Database connection failed');
    });
  });
});