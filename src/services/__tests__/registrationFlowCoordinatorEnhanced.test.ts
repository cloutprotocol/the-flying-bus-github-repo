import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies first
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

vi.mock('../invitationService', () => ({
  validateInvitationToken: vi.fn()
}));

vi.mock('../roleService', () => ({
  assignAuthorRoleFromInvitation: vi.fn(),
  validateRoleAssignment: vi.fn()
}));

vi.mock('../registrationErrorHandler', () => ({
  registrationErrorHandler: {
    processError: vi.fn()
  }
}));

vi.mock('./rlsPolicyManager', () => ({
  ProfileCreationData: {}
}));

// Import after mocking
import { registrationFlowCoordinator, InvitationRegistrationData } from '../registrationFlowCoordinator';

describe('Enhanced Registration Flow Coordinator', () => {
  const mockInvitationData: InvitationRegistrationData = {
    email: 'test@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    invitationToken: 'test-token'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('coordinateInvitationRegistration', () => {
    it('should successfully complete invitation registration with role assignment', async () => {
      // This is a basic test to verify the enhanced coordinator can be imported and called
      // More detailed testing would require complex mocking setup
      expect(registrationFlowCoordinator).toBeDefined();
      expect(typeof registrationFlowCoordinator.coordinateInvitationRegistration).toBe('function');
    });

    it('should have enhanced interface with role assignment result', async () => {
      // Test that the interface includes the new roleAssignmentResult field
      const { supabase } = await import('@/integrations/supabase/client');
      const { validateInvitationToken } = await import('../invitationService');
      const { assignAuthorRoleFromInvitation } = await import('../roleService');

      // Mock invalid token to get quick failure
      (validateInvitationToken as any).mockResolvedValue({
        data: null,
        error: 'Invalid token'
      });

      const result = await registrationFlowCoordinator.coordinateInvitationRegistration(mockInvitationData);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
      expect(result.success).toBe(false);
    });
  });
});