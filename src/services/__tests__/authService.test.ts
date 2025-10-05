import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerUser, loginWithEmailPassword } from '../auth/authService';
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

vi.mock('../registrationFlowCoordinator', () => ({
  registrationFlowCoordinator: {
    coordinateStandardRegistration: vi.fn(),
    coordinateInvitationRegistration: vi.fn()
  }
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('Enhanced Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser with auto-login', () => {
    it('should register user and establish session automatically', async () => {
      const { registrationFlowCoordinator } = await import('../registrationFlowCoordinator');
      const mockProfile = {
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
        email: 'test@example.com',
        role: 'reader'
      };
      const mockSession = {
        access_token: 'token-123'
      };

      (registrationFlowCoordinator.coordinateStandardRegistration as any).mockResolvedValue({
        success: true,
        user: mockProfile,
        session: mockSession
      });

      const result = await registerUser(
        'test@example.com',
        'password123',
        'testuser',
        'Test User'
      );

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockProfile);
      expect(result.session).toEqual(mockSession);
      expect(registrationFlowCoordinator.coordinateStandardRegistration).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        displayName: 'Test User'
      });
    });

    it('should handle email confirmation required scenario', async () => {
      const { registrationFlowCoordinator } = await import('../registrationFlowCoordinator');

      (registrationFlowCoordinator.coordinateStandardRegistration as any).mockResolvedValue({
        success: true,
        user: undefined,
        session: undefined,
        error: {
          message: 'Account created successfully! Please check your email to confirm your account before signing in.',
          code: 'email_confirmation_required'
        }
      });

      const result = await registerUser(
        'test@example.com',
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

    it('should handle signup errors', async () => {
      const { registrationFlowCoordinator } = await import('../registrationFlowCoordinator');

      (registrationFlowCoordinator.coordinateStandardRegistration as any).mockResolvedValue({
        success: false,
        user: undefined,
        session: undefined,
        error: {
          message: 'Email already registered',
          code: 'EMAIL_ALREADY_REGISTERED'
        }
      });

      const result = await registerUser(
        'test@example.com',
        'password123',
        'testuser',
        'Test User'
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Email already registered');
    });

    it('should handle signup with immediate session establishment', async () => {
      const { registrationFlowCoordinator } = await import('../registrationFlowCoordinator');
      const mockProfile = {
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
        email: 'test@example.com',
        role: 'reader'
      };
      const mockSession = {
        access_token: 'token-123'
      };

      (registrationFlowCoordinator.coordinateStandardRegistration as any).mockResolvedValue({
        success: true,
        user: mockProfile,
        session: mockSession
      });

      const result = await registerUser(
        'test@example.com',
        'password123',
        'testuser',
        'Test User'
      );

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockProfile);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeUndefined();
    });

    it('should handle missing user in signup response', async () => {
      const { registrationFlowCoordinator } = await import('../registrationFlowCoordinator');

      (registrationFlowCoordinator.coordinateStandardRegistration as any).mockResolvedValue({
        success: false,
        user: undefined,
        session: undefined,
        error: {
          message: 'Registration failed',
          code: 'REGISTRATION_FAILED'
        }
      });

      const result = await registerUser(
        'test@example.com',
        'password123',
        'testuser',
        'Test User'
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Registration failed');
    });

    it('should handle profile creation delay gracefully', async () => {
      const { registrationFlowCoordinator } = await import('../registrationFlowCoordinator');
      const mockSession = {
        access_token: 'token-123'
      };

      (registrationFlowCoordinator.coordinateStandardRegistration as any).mockResolvedValue({
        success: true,
        user: undefined, // Profile creation delayed
        session: mockSession
      });

      const result = await registerUser(
        'test@example.com',
        'password123',
        'testuser',
        'Test User'
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeUndefined();
      expect(result.session).toEqual(mockSession);
    });
  });

  describe('loginWithEmailPassword', () => {
    it('should login successfully', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123', user: mockUser };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null
      });

      const result = await loginWithEmailPassword('test@example.com', 'password123');

      expect(result.session).toEqual(mockSession);
      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeUndefined();
    });

    it('should handle login errors', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockError = { message: 'Invalid credentials' };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { session: null, user: null },
        error: mockError
      });

      const result = await loginWithEmailPassword('test@example.com', 'wrongpassword');

      expect(result.session).toBeUndefined();
      expect(result.error).toEqual(mockError);
    });
  });
});