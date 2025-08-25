import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completeInvitation, validateInvitationToken } from '../invitationService';
import { grantAuthorRole, createAuthorAccount } from '../roleService';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      signUp: vi.fn()
    }
  }
}));

// Mock role service
vi.mock('../roleService', () => ({
  grantAuthorRole: vi.fn(),
  createAuthorAccount: vi.fn(),
  activateExistingUserAccount: vi.fn(),
  getRedirectUrlForRole: vi.fn(() => '/admin/dashboard')
}));

// Mock token validation
vi.mock('../invitationService', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    validateInvitationToken: vi.fn(),
    findUserByEmail: vi.fn(),
    markInvitationCompleted: vi.fn(),
    markTokenAsUsed: vi.fn()
  };
});

describe('Invitation Role Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('completeInvitation for existing user', () => {
    it('should activate existing user account successfully', async () => {
      const mockInvitationData = {
        id: 'token-123',
        invitation_id: 'invitation-123',
        email: 'test@example.com',
        expires_at: '2024-12-31T23:59:59Z',
        invitation: {
          id: 'invitation-123',
          parent_name: 'Test Parent',
          parent_email: 'test@example.com',
          child_name: 'Test Child',
          child_age: 10,
          status: 'approved'
        }
      };

      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
        email: 'test@example.com',
        role: 'author' as const,
        bio: '',
        avatar_url: '',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        public_bio: null,
        crypto_wallet_address: null,
        badge_display_preferences: null,
        favorite_categories: null
      };

      // Mock token validation
      (validateInvitationToken as any).mockResolvedValue({
        data: mockInvitationData,
        error: null
      });

      // Mock finding existing user
      const { findUserByEmail } = await import('../invitationService');
      (findUserByEmail as any).mockResolvedValue({
        data: { id: 'user-123', email: 'test@example.com', role: 'reader' }
      });

      // Mock role upgrade
      (grantAuthorRole as any).mockResolvedValue({
        success: true,
        user: mockUser
      });

      const result = await completeInvitation('valid-token');

      expect(result.data?.success).toBe(true);
      expect(result.data?.type).toBe('existing_user');
      expect(result.data?.user?.role).toBe('author');
      expect(result.data?.redirectTo).toBe('/admin/dashboard');
      expect(grantAuthorRole).toHaveBeenCalledWith('user-123');
    });

    it('should handle role upgrade failure', async () => {
      const mockInvitationData = {
        id: 'token-123',
        invitation_id: 'invitation-123',
        email: 'test@example.com',
        expires_at: '2024-12-31T23:59:59Z',
        invitation: {
          id: 'invitation-123',
          parent_name: 'Test Parent',
          parent_email: 'test@example.com',
          child_name: 'Test Child',
          child_age: 10,
          status: 'approved'
        }
      };

      // Mock token validation
      (validateInvitationToken as any).mockResolvedValue({
        data: mockInvitationData,
        error: null
      });

      // Mock finding existing user
      const { findUserByEmail } = await import('../invitationService');
      (findUserByEmail as any).mockResolvedValue({
        data: { id: 'user-123', email: 'test@example.com', role: 'reader' }
      });

      // Mock role upgrade failure
      const { activateExistingUserAccount } = await import('../roleService');
      (activateExistingUserAccount as any).mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      const result = await completeInvitation('valid-token');

      expect(result.error).toBe('Database error');
    });
  });

  describe('completeInvitation for new user', () => {
    it('should create new author account successfully', async () => {
      const mockInvitationData = {
        id: 'token-123',
        invitation_id: 'invitation-123',
        email: 'newuser@example.com',
        expires_at: '2024-12-31T23:59:59Z',
        invitation: {
          id: 'invitation-123',
          parent_name: 'New Parent',
          parent_email: 'newuser@example.com',
          child_name: 'New Child',
          child_age: 8,
          status: 'approved'
        }
      };

      const mockNewUser = {
        id: 'user-456',
        username: 'newuser',
        display_name: 'New Parent',
        email: 'newuser@example.com',
        role: 'author' as const,
        bio: '',
        avatar_url: '',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        public_bio: null,
        crypto_wallet_address: null,
        badge_display_preferences: null,
        favorite_categories: null
      };

      // Mock token validation
      (validateInvitationToken as any).mockResolvedValue({
        data: mockInvitationData,
        error: null
      });

      // Mock user not found (new user)
      const { findUserByEmail } = await import('../invitationService');
      (findUserByEmail as any).mockResolvedValue({
        data: null
      });

      // Mock account creation
      (createAuthorAccount as any).mockResolvedValue({
        success: true,
        user: mockNewUser,
        redirectTo: '/admin/dashboard'
      });

      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        display_name: 'New Parent',
        username: 'newuser'
      };

      const result = await completeInvitation('valid-token', userData);

      expect(result.data?.success).toBe(true);
      expect(result.data?.type).toBe('new_user');
      expect(result.data?.user?.role).toBe('author');
      expect(result.data?.redirectTo).toBe('/admin/dashboard');
      expect(createAuthorAccount).toHaveBeenCalledWith(
        'newuser@example.com',
        'password123',
        'New Parent',
        'newuser'
      );
    });

    it('should handle account creation failure', async () => {
      const mockInvitationData = {
        id: 'token-123',
        invitation_id: 'invitation-123',
        email: 'newuser@example.com',
        expires_at: '2024-12-31T23:59:59Z',
        invitation: {
          id: 'invitation-123',
          parent_name: 'New Parent',
          parent_email: 'newuser@example.com',
          child_name: 'New Child',
          child_age: 8,
          status: 'approved'
        }
      };

      // Mock token validation
      (validateInvitationToken as any).mockResolvedValue({
        data: mockInvitationData,
        error: null
      });

      // Mock user not found (new user)
      const { findUserByEmail } = await import('../invitationService');
      (findUserByEmail as any).mockResolvedValue({
        data: null
      });

      // Mock account creation failure
      (createAuthorAccount as any).mockResolvedValue({
        success: false,
        error: 'Email already exists'
      });

      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        display_name: 'New Parent',
        username: 'newuser'
      };

      const result = await completeInvitation('valid-token', userData);

      expect(result.error).toBe('Email already exists');
    });

    it('should require user data for new user creation', async () => {
      const mockInvitationData = {
        id: 'token-123',
        invitation_id: 'invitation-123',
        email: 'newuser@example.com',
        expires_at: '2024-12-31T23:59:59Z',
        invitation: {
          id: 'invitation-123',
          parent_name: 'New Parent',
          parent_email: 'newuser@example.com',
          child_name: 'New Child',
          child_age: 8,
          status: 'approved'
        }
      };

      // Mock token validation
      (validateInvitationToken as any).mockResolvedValue({
        data: mockInvitationData,
        error: null
      });

      // Mock user not found (new user)
      const { findUserByEmail } = await import('../invitationService');
      (findUserByEmail as any).mockResolvedValue({
        data: null
      });

      const result = await completeInvitation('valid-token');

      expect(result.error).toBe('User data required for new account creation');
    });
  });

  describe('completeInvitation error handling', () => {
    it('should handle invalid token', async () => {
      // Mock token validation failure
      (validateInvitationToken as any).mockResolvedValue({
        data: null,
        error: 'Invalid token'
      });

      const result = await completeInvitation('invalid-token');

      expect(result.error).toBe('Invalid token');
    });

    it('should handle missing invitation data', async () => {
      // Mock token validation with no data
      (validateInvitationToken as any).mockResolvedValue({
        data: null,
        error: null
      });

      const result = await completeInvitation('valid-token');

      expect(result.error).toBe('Invalid token');
    });
  });
});