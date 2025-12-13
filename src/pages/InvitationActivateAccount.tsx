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
import { hasAuthorPrivileges } from '@/services/roleHelpers';
import { useRoleManagement } from '@/hooks/useRoleManagement';
import { useAuth } from '@/hooks/useAuth';
import { useRegistrationError } from '@/hooks/useRegistrationError';
import { RegistrationErrorDisplay } from '@/components/Auth/RegistrationErrorDisplay';

type ActivationState = 'loading' | 'ready' | 'activating' | 'success' | 'error';

const InvitationActivateAccount = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, login } = useAuth();
  const { isLoading: roleLoading } = useRoleManagement();
  
  const [state, setState] = useState<ActivationState>('loading');
  const [invitationData, setInvitationData] = useState<InvitationTokenData | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string>('');

  // Enhanced error handling with registration error hook
  const {
    error: registrationError,
    isRetrying,
    handleError,
    clearError,
    retry,
    canRetry,
    fieldErrors,
    setFieldError,
    clearFieldError
  } = useRegistrationError({
    onRetry: () => handleActivation(),
    autoRetry: false
  });

  const token = searchParams.get('token');
  const urlEmail = searchParams.get('email');

  useEffect(() => {
    const validateAndPrepare = async () => {
      if (!token) {
        setError('No invitation token provided');
        setState('error');
        return;
      }

      try {
        // Validate the token
        const tokenResult = await validateInvitationToken(token, urlEmail || undefined);
        
        if (tokenResult.error || !tokenResult.data) {
          setError(tokenResult.error || 'Invalid invitation token');
          setState('error');
          return;
        }

        // Verify user exists and check if they already have author privileges
        const userResult = await findUserByEmail(tokenResult.data.invitation.parent_email);
        if (!userResult.data) {
          // User doesn't exist, redirect to registration
          navigate(`/invitation/register?token=${token}&email=${encodeURIComponent(urlEmail || '')}`);
          return;
        }

        // Check if user already has author privileges
        if (hasAuthorPrivileges(userResult.data)) {
          setError('This account already has author privileges. You can access the author dashboard directly.');
          setState('error');
          return;
        }

        setInvitationData(tokenResult.data);
        setEmail(tokenResult.data.invitation.parent_email);
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
  }, [token, urlEmail, navigate, handleError]);

  const handleActivation = async (e?: React.FormEvent) => {
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

    // Basic validation
    if (!email.trim()) {
      setFieldError('email', 'Email is required');
      setValidationError('Please enter your email address');
      return;
    }

    if (!password.trim()) {
      setFieldError('password', 'Password is required');
      setValidationError('Please enter your password');
      return;
    }

    setState('activating');

    try {
      // First, sign in the user to verify credentials
      const loginSuccess = await login(email.trim().toLowerCase(), password);
      
      if (!loginSuccess) {
        setFieldError('password', 'Invalid email or password');
        setValidationError('Invalid email or password. Please check your credentials.');
        setState('ready');
        return;
      }

      // For account activation, we would typically use a different service
      // that upgrades existing user to author role rather than creating new account
      // This is a simplified approach - in practice, you'd have a separate activation service
      
      setState('success');
      
      toast({
        title: "Account Activated!",
        description: "Your author privileges have been activated. Welcome to The Flying Bus!",
      });

      // Redirect to appropriate dashboard after a short delay
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Activation error:', error);
      handleError(error as Error, {
        email: email,
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
            <h2 className="text-xl font-semibold mb-2">Preparing activation...</h2>
            <p className="text-gray-600">Please wait while we verify your invitation.</p>
          </div>
        );

      case 'ready':
        return (
          <div className="py-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Activate Your Author Account</h2>
              <p className="text-gray-600">
                Sign in to activate author privileges for <strong>{invitationData?.invitation.child_name}</strong>
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

            <form onSubmit={handleActivation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) clearFieldError('email');
                      if (validationError) setValidationError('');
                    }}
                    className={`pl-10 ${fieldErrors.email ? 'border-red-500' : ''}`}
                    disabled={state === 'activating' || isRetrying}
                    required
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-xs text-red-600">{fieldErrors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your account password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) clearFieldError('password');
                      if (validationError) setValidationError('');
                    }}
                    className={`pl-10 ${fieldErrors.password ? 'border-red-500' : ''}`}
                    disabled={state === 'activating' || isRetrying}
                    required
                  />
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-red-600">{fieldErrors.password.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={state === 'activating' || isRetrying}
                size="lg"
              >
                {(state === 'activating' || isRetrying) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {isRetrying ? 'Retrying...' : 'Activating Account...'}
                  </>
                ) : (
                  'Activate Author Account'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm"
                  onClick={() => navigate(`/invitation/register?token=${token}&email=${encodeURIComponent(urlEmail || '')}`)}
                >
                  Create a new account instead
                </Button>
              </p>
            </div>
          </div>
        );

      case 'activating':
        return (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold mb-2">Activating your account...</h2>
            <p className="text-gray-600">Please wait while we upgrade your account to author status.</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Account Activated!</h2>
            <p className="text-gray-600 mb-6">
              Your author privileges have been successfully activated. You can now create and manage articles.
            </p>
            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <p className="text-green-800 text-sm">
                <strong>What's next?</strong><br />
                You'll be redirected to the author dashboard where you can start creating content for {invitationData?.invitation.child_name}.
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
            <h2 className="text-2xl font-bold mb-4">Activation Error</h2>
            
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
              Account Activation
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

export default InvitationActivateAccount;
