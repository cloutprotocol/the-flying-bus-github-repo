import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DrawerSignUpForm from '../DrawerSignUpForm';
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

describe('DrawerSignUpForm with enhanced error handling', () => {
  const mockRegister = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockSetIsSubmitting = vi.fn();
  
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

  const renderDrawerSignUpForm = (isSubmitting = false) => {
    return render(
      <AuthContext.Provider value={mockAuthContext}>
        <DrawerSignUpForm 
          isSubmitting={isSubmitting}
          setIsSubmitting={mockSetIsSubmitting}
          onSuccess={mockOnSuccess}
        />
      </AuthContext.Provider>
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
    renderDrawerSignUpForm();

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('should call register with correct parameters on form submission', async () => {
    mockRegister.mockResolvedValue(true);
    renderDrawerSignUpForm();

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

  it('should show success message and call onSuccess after successful registration', async () => {
    mockRegister.mockResolvedValue(true);
    renderDrawerSignUpForm();

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
      expect(mockToast).toHaveBeenCalledWith({
        title: "Welcome to The Flying Bus!",
        description: "Your account has been created and you're now signed in.",
      });
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should show validation error when passwords do not match', async () => {
    renderDrawerSignUpForm();

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
        message: "Passwords don't match. Please make sure your passwords match.",
        userMessage: "Passwords don't match. Please make sure your passwords match.",
        retryable: false,
        suggestedAction: "Check that both password fields contain the same value."
      });
    });

    // Should not call register when passwords don't match
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('should handle registration failure gracefully', async () => {
    mockRegister.mockResolvedValue(false);
    renderDrawerSignUpForm();

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

    // Should not call onSuccess on failure
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('should handle registration exceptions and show error', async () => {
    const testError = new Error('Network error');
    mockRegister.mockRejectedValue(testError);
    renderDrawerSignUpForm();

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

  it('should clear errors when form is submitted', async () => {
    mockRegister.mockResolvedValue(true);
    renderDrawerSignUpForm();

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

  it('should reset form after successful registration', async () => {
    mockRegister.mockResolvedValue(true);
    renderDrawerSignUpForm();

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

    // Form should be reset after successful registration
    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toHaveValue('');
      expect(screen.getByLabelText(/display name/i)).toHaveValue('');
      expect(screen.getByLabelText(/email/i)).toHaveValue('');
      expect(screen.getByLabelText(/^password$/i)).toHaveValue('');
      expect(screen.getByLabelText(/confirm password/i)).toHaveValue('');
    });
  });

  it('should show correct loading state during submission', async () => {
    // Create a promise that we can control
    let resolveRegistration: (value: boolean) => void;
    const registrationPromise = new Promise<boolean>((resolve) => {
      resolveRegistration = resolve;
    });
    
    mockRegister.mockReturnValue(registrationPromise);
    
    // Start with isSubmitting false, then it will be set to true by the component
    renderDrawerSignUpForm(false);

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

    // Should call setIsSubmitting with true
    await waitFor(() => {
      expect(mockSetIsSubmitting).toHaveBeenCalledWith(true);
    });

    // Resolve the registration
    resolveRegistration!(true);

    // Should call setIsSubmitting with false
    await waitFor(() => {
      expect(mockSetIsSubmitting).toHaveBeenCalledWith(false);
    });
  });
});