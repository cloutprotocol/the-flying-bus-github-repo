import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, User, Mail, Key } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { validateInvitationToken, findUserByEmail, type InvitationTokenData } from '@/services/invitationConvexService';
import { useAuth } from '@/hooks/useAuth';
import { hasAuthorPrivileges } from '@/services/roleHelpers';
import { useRoleManagement } from '@/hooks/useRoleManagement';
// Using Convex Auth via AuthProvider; no registration coordinator
import { useRegistrationError } from '@/hooks/useRegistrationError';
import { RegistrationErrorDisplay } from '@/components/Auth/RegistrationErrorDisplay';

type RegistrationState = 'loading' | 'ready' | 'registering' | 'success' | 'error';

const InvitationRegister = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoading: roleLoading } = useRoleManagement();
  
  const [state, setState] = useState<RegistrationState>('loading');
  const { register: convexRegister } = useAuth();
  const [invitationData, setInvitationData] = useState<InvitationTokenData | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false
  });
  const [validationError, setValidationError] = useState<string>('');

  // Enhanced error handling with registration error hook
  const {
    error: registrationError,
    isRetrying,
    handleError,
    clearError,
    retry,
    canRetry,
    validateForm,
    fieldErrors,
    setFieldError,
    clearFieldError,
    setError
  } = useRegistrationError({
    onRetry: () => handleRegistration(),
    autoRetry: false
  });

  const token = searchParams.get('token');
  const urlEmail = searchParams.get('email');

  useEffect(() => {
    const validateAndPrepare = async () => {
      if (!token) {
        setError({
          code: 'INVITATION_INVALID',
          type: 'invitation',
          message: 'No invitation token provided',
          userMessage: 'No invitation token provided',
          retryable: false
        });
        setState('error');
        return;
      }

      try {
        // Validate the token
        const tokenResult = await validateInvitationToken(token, urlEmail || undefined);
        
        if (tokenResult.error || !tokenResult.data) {
          setError({
            code: 'INVITATION_INVALID',
            type: 'invitation',
            message: tokenResult.error || 'Invalid invitation token',
            userMessage: tokenResult.error || 'Invalid invitation token',
            retryable: false
          });
          setState('error');
          return;
        }

        // Check if user already exists
        const userResult = await findUserByEmail(tokenResult.data.invitation.parent_email);
        if (userResult.data) {
          // Check if user already has author privileges
          if (hasAuthorPrivileges(userResult.data)) {
            setError({
              code: 'INVITATION_ALREADY_USED',
              type: 'invitation',
              message: 'An account with author privileges already exists for this email. Please sign in to access the author dashboard.',
              userMessage: 'An account with author privileges already exists for this email. Please sign in to access the author dashboard.',
              retryable: false
            });
            setState('error');
            return;
          }
          
          // User exists but needs activation, redirect to activation
          navigate(`/invitation/activate-account?token=${token}&email=${encodeURIComponent(urlEmail || '')}`);
          return;
        }

        // Pre-populate form with invitation data
        setInvitationData(tokenResult.data);
        const nameParts = tokenResult.data.invitation.parent_name.split(' ');
        
        // Only pre-populate if form is still empty (prevent overwriting user input)
        setFormData(prev => {
          // Don't overwrite if user has already started typing
          if (prev.firstName || prev.lastName || prev.email) {
            return prev;
          }
          
          return {
            ...prev,
            email: tokenResult.data.invitation.parent_email,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || ''
          };
        });
        setState('ready');

      } catch (error) {
        console.error('Validation error:', error);
        handleError(error as Error, {
          email: urlEmail || '',
          registrationType: 'invitation',
          invitationToken: token || '',
          timestamp: new Date().toISOString()
        });
        setState('error');
      }
    };

    validateAndPrepare();
  }, [token, urlEmail, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      clearFieldError(name);
    }
    
    // Clear validation error when user makes changes
    if (validationError) {
      setValidationError('');
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRegistration = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!token || !invitationData) {
      setValidationError('Invalid invitation data');
      return;
    }

    // Clear previous errors
    clearError();
    setValidationError('');

    // Validate form using enhanced validation
    const validation = validateForm({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      acceptedTerms: formData.acceptedTerms
    });

    if (!validation.isValid) {
      setValidationError(validation.globalError || 'Please correct the errors below');
      return;
    }

    // Additional password confirmation check
    if (formData.password !== formData.confirmPassword) {
      setFieldError('confirmPassword', 'Passwords do not match');
      setValidationError('Please correct the errors below');
      return;
    }

    setState('registering');

    try {
      // Use the enhanced registration flow coordinator
      // Register via Convex Auth; ensure profile created afterward
      const success = await convexRegister(formData.email, formData.password, formData.firstName + formData.lastName, formData.firstName + ' ' + formData.lastName);
      const result = { success } as any;
      
      if (!result.success) {
        if (result.error) {
          handleError(new Error(result.error.message), {
            email: formData.email,
            registrationType: 'invitation',
            invitationToken: token,
            timestamp: new Date().toISOString()
          });
        }
        setState('ready');
        return;
      }

      setState('success');
      
      toast({
        title: "Account Created!",
        description: "Your author account has been created successfully. Welcome to The Flying Bus!",
      });

      // Redirect to appropriate dashboard after a short delay
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Registration error:', error);
      handleError(error as Error, {
        email: formData.email,
        registrationType: 'invitation',
        invitationToken: token,
        timestamp: new Date().toISOString()
      });
      setState('ready');
    }
  };

  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold mb-2">Preparing registration...</h2>
            <p className="text-gray-600">Please wait while we verify your invitation.</p>
          </div>
        );

      case 'ready':
        return (
          <div className="py-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Create Your Author Account</h2>
              <p className="text-gray-600">
                Complete your registration to start creating content for <strong>{invitationData?.invitation.child_name}</strong>
              </p>
            </div>

            {invitationData && (
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">Invitation Details:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li><strong>Parent:</strong> {invitationData.invitation.parent_name}</li>
                  <li><strong>Child:</strong> {invitationData.invitation.child_name}</li>
                  <li><strong>Email:</strong> {invitationData.invitation.parent_email}</li>
                </ul>
              </div>
            )}

            {/* Enhanced error display */}
            {(registrationError || validationError) && (
              <div className="mb-6">
                {registrationError && (
                  <RegistrationErrorDisplay
                    error={registrationError}
                    onRetry={canRetry ? retry : undefined}
                    onDismiss={clearError}
                    className="mb-4"
                  />
                )}
                {validationError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{validationError}</p>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleRegistration} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10"
                    disabled={true} // Email is pre-filled and shouldn't be changed
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">This email is from your invitation and cannot be changed.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="First name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={`pl-10 ${fieldErrors.firstName ? 'border-red-500' : ''}`}
                      disabled={state === 'registering' || isRetrying}
                      required
                    />
                  </div>
                  {fieldErrors.firstName && (
                    <p className="text-xs text-red-600">{fieldErrors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={`pl-10 ${fieldErrors.lastName ? 'border-red-500' : ''}`}
                      disabled={state === 'registering' || isRetrying}
                      required
                    />
                  </div>
                  {fieldErrors.lastName && (
                    <p className="text-xs text-red-600">{fieldErrors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Create a secure password (min 8 characters)"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`pl-10 ${fieldErrors.password ? 'border-red-500' : ''}`}
                    disabled={state === 'registering' || isRetrying}
                    required
                  />
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-red-600">{fieldErrors.password.message}</p>
                )}
                <p className="text-xs text-gray-500">Must include uppercase, lowercase, and numbers</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`pl-10 ${fieldErrors.confirmPassword ? 'border-red-500' : ''}`}
                    disabled={state === 'registering' || isRetrying}
                    required
                  />
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-red-600">{fieldErrors.confirmPassword.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="acceptedTerms"
                  name="acceptedTerms"
                  type="checkbox"
                  checked={formData.acceptedTerms}
                  onChange={handleInputChange}
                  className={`rounded border-gray-300 ${fieldErrors.acceptedTerms ? 'border-red-500' : ''}`}
                  disabled={state === 'registering' || isRetrying}
                  required
                />
                <Label htmlFor="acceptedTerms" className="text-sm">
                  I accept the{' '}
                  <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
                    Terms and Conditions
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </a>
                </Label>
              </div>
              {fieldErrors.acceptedTerms && (
                <p className="text-xs text-red-600">{fieldErrors.acceptedTerms.message}</p>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={state === 'registering' || isRetrying}
                size="lg"
              >
                {(state === 'registering' || isRetrying) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {isRetrying ? 'Retrying...' : 'Creating Account...'}
                  </>
                ) : (
                  'Create Author Account'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm"
                  onClick={() => navigate(`/invitation/activate-account?token=${token}&email=${encodeURIComponent(urlEmail || '')}`)}
                >
                  Activate existing account instead
                </Button>
              </p>
            </div>
          </div>
        );

      case 'registering':
        return (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold mb-2">Creating your account...</h2>
            <p className="text-gray-600">Please wait while we set up your author account.</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Account Created!</h2>
            <p className="text-gray-600 mb-6">
              Your author account has been successfully created. You can now create and manage articles for {invitationData?.invitation.child_name}.
            </p>
            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <p className="text-green-800 text-sm">
                <strong>What's next?</strong><br />
                You'll be redirected to the author dashboard where you can start creating content and exploring all the features available to authors.
              </p>
            </div>
            <Button 
              onClick={() => navigate('/admin/dashboard')}
              className="w-full"
              size="lg"
            >
              Go to Author Dashboard
            </Button>
          </div>
        );

      case 'error':
      default:
        return (
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4">Registration Error</h2>
            
            {/* Enhanced error display */}
            {registrationError ? (
              <div className="mb-6">
                <RegistrationErrorDisplay
                  error={registrationError}
                  onRetry={canRetry ? retry : undefined}
                  onDismiss={clearError}
                />
              </div>
            ) : (
              <p className="text-gray-600 mb-6">An error occurred while validating your invitation</p>
            )}
            
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/request-invitation')}
                className="w-full"
                size="lg"
              >
                Request New Invitation
              </Button>
              <Button 
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full"
              >
                Go to Homepage
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <MainLayout>
      <div className="max-w-md mx-auto px-4 py-8">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Create Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default InvitationRegister;
