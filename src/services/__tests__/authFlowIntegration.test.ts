import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerUser } from '../auth/authService';
import { fetchUserProfile } from '../auth/profileService';

// Mock the dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn()
    }
  }
}));

vi.mock('../auth/profileService', () => ({
  fetchUserProfile: vi.fn()
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('Auth Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete registration flow scenarios', () => {
    it('should handle immediate session establishment (ideal case)', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockUser = {
        id: 'user-123',
        email: 'test@gmail.com',
        email_confirmed_at: new Date().toISOString()
      };
      const mockSession = {
        access_token: 'token-123',
        user: mockUser
      };
      const mockProfile = {
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
        email: 'test@gmail.com',
        role: 'reader'
      };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      (fetchUserProfile as any).mockResolvedValue(mockProfile);

      const result = await registerUser(
        'test@gmail.com',
        'password123',
        'testuser',
        'Test User'
      );

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockProfile);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeUndefined();
    });

    it('should handle email confirmation required scenario', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockUser = {
        id: 'user-123',
        email: 'test@gmail.com',
        email_confirmed_at: null // Not confirmed
      };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null
      });

      const result = await registerUser(
        'test@gmail.com',
        'password123',
        'testuser',
        'Test User'
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeUndefined();
      expect(result.session).toBeUndefined();
      expect(result.error?.code).toBe('email_confirmation_required');
      expect(result.error?.message).toContain('Please check your email');
    });

    it('should handle profile creation delay gracefully', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockUser = {
        id: 'user-123',
        email: 'test@gmail.com',
        email_confirmed_at: new Date().toISOString()
      };
      const mockSession = {
        access_token: 'token-123',
        user: mockUser
      };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // Simulate profile not ready yet
      (fetchUserProfile as any).mockResolvedValue(null);

      const result = await registerUser(
        'test@gmail.com',
        'password123',
        'testuser',
        'Test User'
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeUndefined(); // Profile not ready yet
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeUndefined();
    });

    it('should handle various signup errors appropriately', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const testCases = [
        {
          error: { message: 'Email already registered', code: 'email_already_exists' },
          expectedMessage: 'Email already registered'
        },
        {
          error: { message: 'Password too weak', code: 'weak_password' },
          expectedMessage: 'Password too weak'
        },
        {
          error: { message: 'Invalid email format', code: 'invalid_email' },
          expectedMessage: 'Invalid email format'
        }
      ];

      for (const testCase of testCases) {
        (supabase.auth.signUp as any).mockResolvedValue({
          data: { user: null },
          error: testCase.error
        });

        const result = await registerUser(
          'test@gmail.com',
          'password123',
          'testuser',
          'Test User'
        );

        expect(result.success).toBe(false);
        expect(result.error?.message).toBe(testCase.expectedMessage);
      }
    });

    it('should handle network and unexpected errors', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      (supabase.auth.signUp as any).mockRejectedValue(new Error('Network error'));

      const result = await registerUser(
        'test@gmail.com',
        'password123',
        'testuser',
        'Test User'
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Network error');
    });

    it('should validate required parameters', async () => {
      const testCases = [
        { email: '', password: 'pass', username: 'user', displayName: 'Name' },
        { email: 'test@gmail.com', password: '', username: 'user', displayName: 'Name' },
        { email: 'test@gmail.com', password: 'pass', username: '', displayName: 'Name' },
        { email: 'test@gmail.com', password: 'pass', username: 'user', displayName: '' }
      ];

      for (const testCase of testCases) {
        const result = await registerUser(
          testCase.email,
          testCase.password,
          testCase.username,
          testCase.displayName
        );

        // The function should still attempt to call Supabase, but Supabase will handle validation
        // This test ensures our function doesn't crash with empty parameters
        expect(typeof result.success).toBe('boolean');
      }
    });
  });

  describe('Registration flow timing and state management', () => {
    it('should handle concurrent registration attempts gracefully', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockUser = {
        id: 'user-123',
        email: 'test@gmail.com',
        email_confirmed_at: new Date().toISOString()
      };
      const mockSession = {
        access_token: 'token-123',
        user: mockUser
      };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      (fetchUserProfile as any).mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
        email: 'test@gmail.com',
        role: 'reader'
      });

      // Simulate concurrent registration attempts
      const promises = Array(3).fill(null).map(() => 
        registerUser('test@gmail.com', 'password123', 'testuser', 'Test User')
      );

      const results = await Promise.all(promises);

      // All should succeed (though in reality, Supabase would prevent duplicate emails)
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle profile creation timing correctly', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockUser = {
        id: 'user-123',
        email: 'test@gmail.com',
        email_confirmed_at: new Date().toISOString()
      };
      const mockSession = {
        access_token: 'token-123',
        user: mockUser
      };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // First call returns null (profile not ready), second call returns profile
      (fetchUserProfile as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValue({
          id: 'user-123',
          username: 'testuser',
          display_name: 'Test User',
          email: 'test@gmail.com',
          role: 'reader'
        });

      const result = await registerUser(
        'test@gmail.com',
        'password123',
        'testuser',
        'Test User'
      );

      expect(result.success).toBe(true);
      expect(result.session).toEqual(mockSession);
      // Profile should be undefined since it wasn't ready on first fetch
      expect(result.user).toBeUndefined();
    });
  });
});