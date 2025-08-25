import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, AuthContext } from '../AuthProvider';
import { useContext } from 'react';

// Mock the dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn()
    }
  }
}));

vi.mock('@/services/authService', () => ({
  fetchUserProfile: vi.fn(),
  checkRoleAccess: vi.fn(),
  loginWithEmailPassword: vi.fn(),
  logoutUser: vi.fn()
}));

vi.mock('@/services/auth/authService', () => ({
  registerUser: vi.fn()
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

vi.mock('thirdweb/wallets', () => ({
  inAppWallet: () => ({
    disconnect: vi.fn()
  })
}));

// Test component to access auth context
const TestComponent = () => {
  const auth = useContext(AuthContext);
  if (!auth) return <div>No auth context</div>;
  
  return (
    <div>
      <div data-testid="loading">{auth.isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="logged-in">{auth.isLoggedIn ? 'logged-in' : 'not-logged-in'}</div>
      <button 
        data-testid="register-btn" 
        onClick={() => auth.register('test@example.com', 'password123', 'testuser', 'Test User')}
      >
        Register
      </button>
    </div>
  );
};

describe('AuthProvider register functionality', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock initial session check
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null }
    });
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    });
  });

  it('should register user successfully with auto-login', async () => {
    const { registerUser } = await import('@/services/auth/authService');
    const mockProfile = {
      id: 'user-123',
      username: 'testuser',
      display_name: 'Test User',
      email: 'test@example.com',
      role: 'reader'
    };

    (registerUser as any).mockResolvedValue({
      success: true,
      user: mockProfile,
      session: { access_token: 'token-123' }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // Click register button
    const registerBtn = screen.getByTestId('register-btn');
    registerBtn.click();

    // Wait for registration to complete
    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        'testuser',
        'Test User'
      );
    });
  });

  it('should handle registration failure', async () => {
    const { registerUser } = await import('@/services/auth/authService');
    
    (registerUser as any).mockResolvedValue({
      success: false,
      error: { message: 'Email already exists' }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // Click register button
    const registerBtn = screen.getByTestId('register-btn');
    registerBtn.click();

    // Wait for registration to complete
    await waitFor(() => {
      expect(registerUser).toHaveBeenCalled();
    });

    // Should still show not logged in
    expect(screen.getByTestId('logged-in')).toHaveTextContent('not-logged-in');
  });

  it('should handle registration exception', async () => {
    const { registerUser } = await import('@/services/auth/authService');
    
    (registerUser as any).mockRejectedValue(new Error('Network error'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // Click register button
    const registerBtn = screen.getByTestId('register-btn');
    registerBtn.click();

    // Wait for registration to complete
    await waitFor(() => {
      expect(registerUser).toHaveBeenCalled();
    });

    // Should still show not logged in
    expect(screen.getByTestId('logged-in')).toHaveTextContent('not-logged-in');
  });

  it('should set loading state during registration', async () => {
    const { registerUser } = await import('@/services/auth/authService');
    
    // Create a promise that we can control
    let resolveRegistration: (value: any) => void;
    const registrationPromise = new Promise((resolve) => {
      resolveRegistration = resolve;
    });
    
    (registerUser as any).mockReturnValue(registrationPromise);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // Click register button
    const registerBtn = screen.getByTestId('register-btn');
    registerBtn.click();

    // Should show loading during registration
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
    });

    // Resolve the registration
    resolveRegistration!({
      success: true,
      user: { id: 'user-123', username: 'testuser' }
    });

    // Should stop loading after registration
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });
  });
});