import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  grantAuthorRole, 
  createAuthorAccount, 
  activateExistingUserAccount,
  hasAuthorPrivileges,
  hasAdminPrivileges,
  hasModeratorPrivileges,
  canUpgradeRole,
  getRedirectUrlForRole
} from '../roleService';
import { ReaderProfile } from '@/types/ReaderProfile';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    })),
    auth: {
      signUp: vi.fn()
    }
  }
}));

describe('Role Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('grantAuthorRole', () => {
    it('should successfully grant author role to user', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
        email: 'test@example.com',
        role: 'author',
        bio: '',
        avatar_url: '',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        public_bio: null,
        crypto_wallet_address: null,
        badge_display_preferences: null,
        favorite_categories: null
      };

      const { supabase } = await import('@/integrations/supabase/client');
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
          })
        })
      });
      
      (supabase.from as any).mockReturnValue({
        update: mockUpdate
      });

      const result = await grantAuthorRole('user-123');

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('author');
      expect(mockUpdate).toHaveBeenCalledWith({
        role: 'author',
        updated_at: expect.any(String)
      });
    });

    it('should handle database errors', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'User not found' } 
            })
          })
        })
      });
      
      (supabase.from as any).mockReturnValue({
        update: mockUpdate
      });

      const result = await grantAuthorRole('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('createAuthorAccount', () => {
    it('should successfully create new author account', async () => {
      const mockAuthUser = {
        id: 'user-123',
        email: 'test@example.com'
      };

      const mockProfile = {
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
        email: 'test@example.com',
        role: 'author',
        bio: '',
        avatar_url: '',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        public_bio: null,
        crypto_wallet_address: null,
        badge_display_preferences: null,
        favorite_categories: null
      };

      const { supabase } = await import('@/integrations/supabase/client');
      
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockAuthUser },
        error: null
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
        })
      });
      
      (supabase.from as any).mockReturnValue({
        insert: mockInsert
      });

      const result = await createAuthorAccount(
        'test@example.com',
        'password123',
        'Test User',
        'testuser'
      );

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('author');
      expect(result.redirectTo).toBe('/admin/dashboard');
    });

    it('should handle auth signup errors', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already registered' }
      });

      const result = await createAuthorAccount(
        'test@example.com',
        'password123',
        'Test User'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already registered');
    });
  });

  describe('Role checking functions', () => {
    const createMockUser = (role: string): ReaderProfile => ({
      id: 'user-123',
      username: 'testuser',
      display_name: 'Test User',
      email: 'test@example.com',
      role: role as any,
      bio: '',
      avatar_url: '',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      public_bio: null,
      crypto_wallet_address: null,
      badge_display_preferences: null,
      favorite_categories: null
    });

    describe('hasAuthorPrivileges', () => {
      it('should return true for author role', () => {
        expect(hasAuthorPrivileges(createMockUser('author'))).toBe(true);
      });

      it('should return true for moderator role', () => {
        expect(hasAuthorPrivileges(createMockUser('moderator'))).toBe(true);
      });

      it('should return true for admin role', () => {
        expect(hasAuthorPrivileges(createMockUser('admin'))).toBe(true);
      });

      it('should return false for reader role', () => {
        expect(hasAuthorPrivileges(createMockUser('reader'))).toBe(false);
      });

      it('should return false for null user', () => {
        expect(hasAuthorPrivileges(null)).toBe(false);
      });
    });

    describe('hasAdminPrivileges', () => {
      it('should return true only for admin role', () => {
        expect(hasAdminPrivileges(createMockUser('admin'))).toBe(true);
        expect(hasAdminPrivileges(createMockUser('moderator'))).toBe(false);
        expect(hasAdminPrivileges(createMockUser('author'))).toBe(false);
        expect(hasAdminPrivileges(createMockUser('reader'))).toBe(false);
      });
    });

    describe('hasModeratorPrivileges', () => {
      it('should return true for moderator and admin roles', () => {
        expect(hasModeratorPrivileges(createMockUser('admin'))).toBe(true);
        expect(hasModeratorPrivileges(createMockUser('moderator'))).toBe(true);
        expect(hasModeratorPrivileges(createMockUser('author'))).toBe(false);
        expect(hasModeratorPrivileges(createMockUser('reader'))).toBe(false);
      });
    });
  });

  describe('canUpgradeRole', () => {
    it('should allow valid role upgrades', () => {
      expect(canUpgradeRole('reader', 'author')).toBe(true);
      expect(canUpgradeRole('author', 'moderator')).toBe(true);
      expect(canUpgradeRole('moderator', 'admin')).toBe(true);
      expect(canUpgradeRole('reader', 'admin')).toBe(true);
    });

    it('should not allow downgrades or same role', () => {
      expect(canUpgradeRole('author', 'reader')).toBe(false);
      expect(canUpgradeRole('admin', 'moderator')).toBe(false);
      expect(canUpgradeRole('author', 'author')).toBe(false);
    });

    it('should handle invalid roles', () => {
      expect(canUpgradeRole('invalid', 'author')).toBe(false);
      expect(canUpgradeRole('reader', 'invalid')).toBe(false);
    });
  });

  describe('getRedirectUrlForRole', () => {
    it('should return admin dashboard for privileged roles', () => {
      expect(getRedirectUrlForRole('admin')).toBe('/admin/dashboard');
      expect(getRedirectUrlForRole('moderator')).toBe('/admin/dashboard');
      expect(getRedirectUrlForRole('author')).toBe('/admin/dashboard');
    });

    it('should return home for reader role', () => {
      expect(getRedirectUrlForRole('reader')).toBe('/');
    });

    it('should return home for unknown roles', () => {
      expect(getRedirectUrlForRole('unknown')).toBe('/');
    });
  });
});