import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SignUpForm from '../SignUpForm';
import { AuthContext } from '@/providers/AuthProvider';
import { AuthContextType } from '@/types/auth/AuthTypes';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

// Mock the registration error hook
const mockSetRegistrationError = vi.fn();
const mockClearError = vi.fn();
const mockHandleRegistrationError = vi.fn();
vi.mock('@/hooks/useRegistrationError', () => ({
  useRegistrationError: () => ({
    registrationError: null,
    setRegistrationError: mockSetRegistrationError,
    clearError: mockClearError,
    handleRegistrationError: mockHandleRegistrationError,
  })
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('SignUpForm with auto-login', () => {
  const mockRegister = vi.fn();
  const mockAuthContext: AuthContextType = {
    currentUser: null,
    isLoggedIn: false,
    login: vi.fn(),
    register: mockRegister,
    registerWithInvitation: vi.fn(),
    logout: vi.fn(),
    refreshUserProfile: vi.fn(),
    isLoading: false,
    checkRoleAccess: vi.fn(),
    session: null,
    user: null,
    establishSession: vi.fn(),
    syncAuthState: vi.fn()
  };

  const renderSignUpForm = (authContext = mockAuthContext) => {
    return render(
      <BrowserRouter>
        <AuthContext.Provider value={authContext}>
          <SignUpForm onSwitchTab={vi.fn()} />
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockToast.mockClear();
    mockSetRegistrationError.mockClear();
    mockClearError.mockClear();
    mockHandleRegistrationError.mockClear();
  });

  it('should render all form fields', () => {
    renderSignUpForm();

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('should call register with correct parameters on form submission', async () => {
    mockRegister.mockResolvedValue(true);
    
    renderSignUpForm();

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: 'Test User' }
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' }
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' }
    });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        'testuser',
        'Test User'
      );
    });
  });

  it('should navigate to home page after successful registration', async () => {
    mockRegister.mockResolvedValue(true);
    
    renderSignUpForm();

    // Fill out and submit form
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: 'Test User' }
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' }
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' }
    });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
    });

    // Should show success toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Welcome to The Flying Bus!",
        description: "Your account has been created and you're now signed in.",
      });
    });

    // Wait for navigation
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    }, { timeout: 1500 });
  });

  it('should navigate to redirect path if provided', async () => {
    mockRegister.mockResolvedValue(true);
    
    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <SignUpForm onSwitchTab={vi.fn()} redirectPath="/dashboard" />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    // Fill out and submit form
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: 'Test User' }
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' }
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' }
    });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
    });

    // Wait for navigation to redirect path
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    }, { timeout: 1500 });
  });

  it('should show error when passwords do not match', async () => {
    renderSignUpForm();

    // Fill out form with mismatched passwords
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: 'Test User' }
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' }
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'differentpassword' }
    });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Should set registration error when passwords don't match
    await waitFor(() => {
      expect(mockSetRegistrationError).toHaveBeenCalledWith({
        code: 'VALIDATION_FAILED',
        type: 'validation',
        message: "Passwords don't match",
        userMessage: "Please make sure your passwords match.",
        retryable: false,
        suggestedAction: "Check that both password fields contain the same value."
      });
    });

    // Should not call register when passwords don't match
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('should handle registration failure gracefully', async () => {
    mockRegister.mockResolvedValue(false);
    
    renderSignUpForm();

    // Fill out and submit form
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: 'Test User' }
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' }
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' }
    });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
    });

    // Should not navigate on failure
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should disable form during submission', async () => {
    // Create a promise that we can control
    let resolveRegistration: (value: boolean) => void;
    const registrationPromise = new Promise<boolean>((resolve) => {
      resolveRegistration = resolve;
    });
    
    mockRegister.mockReturnValue(registrationPromise);
    
    renderSignUpForm();

    // Fill out form
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: 'Test User' }
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' }
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' }
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /creating account & signing in/i })).toBeInTheDocument();
    });

    // Form fields should be disabled
    expect(screen.getByLabelText(/username/i)).toBeDisabled();
    expect(screen.getByLabelText(/email/i)).toBeDisabled();

    // Resolve the registration
    resolveRegistration!(true);

    // Should return to normal state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });
  });

  it('should clear errors when form is submitted', async () => {
    mockRegister.mockResolvedValue(true);
    renderSignUpForm();

    // Fill out and submit form
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: 'Test User' }
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' }
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' }
    });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockClearError).toHaveBeenCalled();
  });

  it('should handle registration exceptions and show error', async () => {
    const testError = new Error('Network error');
    mockRegister.mockRejectedValue(testError);
    renderSignUpForm();

    // Fill out and submit form
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: 'Test User' }
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' }
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' }
    });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockHandleRegistrationError).toHaveBeenCalledWith(testError, {
        email: 'test@example.com',
        registrationType: 'standard'
      });
    });
  });
});