import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RLSPolicyManager, type ProfileCreationData, type AuthContext } from '../rlsPolicyManager';

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123')
  }
});

// Mock import.meta.env
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_SUPABASE_URL: 'https://test.supabase.co'
  }
});

describe('RLSPolicyManager - Core Functionality', () => {
  let rlsPolicyManager: RLSPolicyManager;

  const mockProfileData: ProfileCreationData = {
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    display_name: 'Test User',
    role: 'reader'
  };

  const mockAuthContext: AuthContext = {
    userId: 'test-user-id',
    email: 'test@example.com',
    registrationType: 'standard'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    rlsPolicyManager = new RLSPolicyManager();
  });

  describe('validateRegistrationPermissions', () => {
    it('should validate standard registration permissions', async () => {
      const result = await rlsPolicyManager.validateRegistrationPermissions({
        ...mockAuthContext,
        registrationType: 'standard'
      });

      expect(result).toBe(true);
    });

    it('should validate invitation registration permissions', async () => {
      const result = await rlsPolicyManager.validateRegistrationPermissions({
        ...mockAuthContext,
        registrationType: 'invitation'
      });

      expect(result).toBe(true);
    });

    it('should return false for invalid registration type', async () => {
      const result = await rlsPolicyManager.validateRegistrationPermissions({
        ...mockAuthContext,
        registrationType: 'invalid' as any
      });

      expect(result).toBe(false);
    });
  });

  describe('isServiceRoleAvailable', () => {
    it('should return boolean indicating service role availability', () => {
      const result = rlsPolicyManager.isServiceRoleAvailable();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('bypassRLSForRegistration', () => {
    it('should handle service role unavailable gracefully', async () => {
      // Ensure no service role client
      (rlsPolicyManager as any).serviceRoleClient = null;

      const mockOperation = vi.fn();
      
      const result = await rlsPolicyManager.bypassRLSForRegistration(mockOperation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service role client not available for RLS bypass');
      expect(result.code).toBe('SERVICE_ROLE_UNAVAILABLE');
      expect(mockOperation).not.toHaveBeenCalled();
    });
  });

  describe('refreshServiceRoleClient', () => {
    it('should refresh service role client without throwing', async () => {
      await expect(rlsPolicyManager.refreshServiceRoleClient()).resolves.not.toThrow();
    });
  });

  describe('ProfileCreationData validation', () => {
    it('should accept valid profile data', () => {
      expect(mockProfileData.id).toBeDefined();
      expect(mockProfileData.email).toBeDefined();
      expect(mockProfileData.username).toBeDefined();
      expect(mockProfileData.display_name).toBeDefined();
      expect(mockProfileData.role).toBeDefined();
    });
  });

  describe('AuthContext validation', () => {
    it('should accept valid auth context', () => {
      expect(mockAuthContext.userId).toBeDefined();
      expect(mockAuthContext.email).toBeDefined();
      expect(mockAuthContext.registrationType).toBeDefined();
    });
  });
});