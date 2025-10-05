import { describe, it, expect } from 'vitest';
import { rlsPolicyManager } from '../rlsPolicyManager';

describe('RLSPolicyManager Integration Tests', () => {

  it('should be able to initialize without errors', () => {
    expect(rlsPolicyManager).toBeDefined();
    expect(typeof rlsPolicyManager.isServiceRoleAvailable).toBe('function');
    expect(typeof rlsPolicyManager.validateRegistrationPermissions).toBe('function');
  });

  it('should validate registration permissions for different types', async () => {
    const standardResult = await rlsPolicyManager.validateRegistrationPermissions({
      userId: 'test-user',
      email: 'test@example.com',
      registrationType: 'standard'
    });

    const invitationResult = await rlsPolicyManager.validateRegistrationPermissions({
      userId: 'test-user',
      email: 'test@example.com',
      registrationType: 'invitation'
    });

    expect(standardResult).toBe(true);
    expect(invitationResult).toBe(true);
  });

  it('should handle service role availability check', () => {
    const isAvailable = rlsPolicyManager.isServiceRoleAvailable();
    expect(typeof isAvailable).toBe('boolean');
  });

  it('should handle RLS bypass operation when service role is unavailable', async () => {
    // Force service role to be unavailable for this test
    const originalClient = (rlsPolicyManager as any).serviceRoleClient;
    (rlsPolicyManager as any).serviceRoleClient = null;

    const result = await rlsPolicyManager.bypassRLSForRegistration(async () => {
      return { test: 'data' };
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe('SERVICE_ROLE_UNAVAILABLE');

    // Restore original client
    (rlsPolicyManager as any).serviceRoleClient = originalClient;
  });
});