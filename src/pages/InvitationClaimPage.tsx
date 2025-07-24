import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Mail, User, Lock, CheckCircle, AlertCircle, Info, Shield, RefreshCw } from 'lucide-react';
import { invitationClaimService } from '@/services/invitationClaimService';
import { invitationErrorHandler } from '@/services/invitationErrorHandler';
import InvitationErrorBoundary from '@/components/ErrorBoundary/InvitationErrorBoundary';
import { 
  InvitationClaimFormData, 
  TokenValidationResponse 
} from '@/types/InvitationWorkflowTypes';

const InvitationClaimPageContent = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State management
  const [isValidating, setIsValidating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState<TokenValidationResponse | null>(null);
  const [existingUser, setExistingUser] = useState<boolean | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [ipAddress, setIpAddress] = useState<string>('');
  const [securityWarning, setSecurityWarning] = useState<string>('');

  // Form data
  const [formData, setFormData] = useState<InvitationClaimFormData>({
    email: '',
    displayName: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  // Form validation errors
  const [errors, setErrors] = useState<Partial<InvitationClaimFormData>>({});

  // Get client IP address (simplified approach)
  useEffect(() => {
    const getClientIP = async () => {
      try {
        // In a real application, you might use a service like ipify or get IP from headers
        // For now, we'll use a placeholder that could be replaced with actual IP detection
        setIpAddress('client-ip-placeholder');
      } catch (error) {
        console.warn('Could not detect IP address:', error);
        setIpAddress('unknown');
      }
    };

    getClientIP();
  }, []);

  // Validate token on component mount
  useEffect(() => {
    if (!token) {
      navigate('/404');
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      setIsValidating(true);
      const result = await invitationClaimService.validateTokenForClaim(token!, ipAddress);
      
      if (result.error) {
        // Use error handler to get user-friendly message and suggestions
        const errorDisplay = invitationErrorHandler.formatErrorForUI(result.error);
        
        // Set security warning for specific error types
        if (['RATE_LIMIT_EXCEEDED', 'REPLAY_ATTACK_DETECTED', 'INVALID_TOKEN_FORMAT'].includes(result.error.code)) {
          setSecurityWarning(errorDisplay.message);
        }
        
        setValidationResult({ 
          valid: false, 
          error: errorDisplay.message,
          suggestions: errorDisplay.suggestions,
          supportInfo: errorDisplay.supportInfo
        });
        return;
      }

      if (result.data) {
        setValidationResult(result.data);
        if (result.data.valid && result.data.invitation) {
          // Pre-fill email from invitation
          setFormData(prev => ({
            ...prev,
            email: result.data.invitation!.parentEmail
          }));
        }
      }
    } catch (error) {
      console.error('Error validating token:', error);
      const errorDisplay = invitationErrorHandler.formatErrorForUI(error);
      setValidationResult({ 
        valid: false, 
        error: errorDisplay.message,
        suggestions: errorDisplay.suggestions,
        supportInfo: errorDisplay.supportInfo
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name as keyof InvitationClaimFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<InvitationClaimFormData> = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Display name validation
    if (!formData.displayName) {
      newErrors.displayName = 'Display name is required';
    } else if (formData.displayName.length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters';
    }

    // Username validation
    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Password validation (only for new users)
    if (existingUser === false) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await invitationClaimService.claimInvitation(token!, formData, ipAddress);

      if (result.error) {
        // Use error handler to get user-friendly message and suggestions
        const errorDisplay = invitationErrorHandler.formatErrorForUI(result.error);
        
        // Set security warning for specific error types
        if (['RATE_LIMIT_EXCEEDED', 'EMAIL_MISMATCH', 'SUSPICIOUS_ACTIVITY'].includes(result.error.code)) {
          setSecurityWarning(errorDisplay.message);
        }

        toast({
          title: errorDisplay.title,
          description: errorDisplay.message,
          variant: errorDisplay.severity === 'critical' ? "destructive" : "destructive",
        });

        // Show recovery suggestions if available
        if (errorDisplay.suggestions.length > 0) {
          setTimeout(() => {
            toast({
              title: "What you can try:",
              description: errorDisplay.suggestions.slice(0, 2).join(' • '),
              variant: "default",
            });
          }, 2000);
        }
        return;
      }

      if (result.data?.success) {
        setClaimSuccess(true);
        toast({
          title: "Success!",
          description: result.data.isNewUser 
            ? "Your account has been created successfully!" 
            : "Your account has been upgraded to author status!",
        });

        // Redirect after success
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    } catch (error) {
      console.error('Error claiming invitation:', error);
      const errorDisplay = invitationErrorHandler.formatErrorForUI(error);
      
      toast({
        title: errorDisplay.title,
        description: errorDisplay.message,
        variant: "destructive",
      });

      // Show support information for unexpected errors
      if (errorDisplay.supportInfo.showContact) {
        setTimeout(() => {
          toast({
            title: "Need Help?",
            description: errorDisplay.supportInfo.message,
            variant: "default",
          });
        }, 2000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Validating your invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token state
  if (!validationResult?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-gray-900">
              Invalid Invitation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                {validationResult?.error || 'This invitation link is invalid or has expired.'}
              </AlertDescription>
            </Alert>
            <p className="text-gray-600 mb-4">
              If you believe this is an error, please contact our support team.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (claimSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-gray-900">
              Welcome to The Flying Bus!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Your invitation has been successfully claimed. You now have author privileges 
              and can start creating content for young readers.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">Next Steps:</h3>
              <ul className="text-sm text-blue-800 space-y-1 text-left">
                <li>• Check your email for welcome information</li>
                <li>• Review our content guidelines</li>
                <li>• Start writing your first article</li>
                <li>• Join our community of young journalists</li>
              </ul>
            </div>
            <p className="text-sm text-gray-500">
              Redirecting you to the homepage in a few seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const invitation = validationResult.invitation!;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
            Claim Your Invitation
          </CardTitle>
          <p className="text-gray-600">
            Complete your account setup for <strong>{invitation.childName}</strong>
          </p>
        </CardHeader>
        
        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              This invitation is for <strong>{invitation.childName}</strong> (age {invitation.childAge}) 
              to become an author on The Flying Bus platform.
            </AlertDescription>
          </Alert>

          {securityWarning && (
            <Alert variant="destructive" className="mb-6">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Security Notice:</strong> {securityWarning}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  className="pl-10"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  id="displayName"
                  name="displayName"
                  type="text"
                  placeholder="How you'd like to be displayed"
                  className="pl-10"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                />
              </div>
              {errors.displayName && (
                <p className="text-sm text-red-600">{errors.displayName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Choose a unique username"
                  className="pl-10"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                />
              </div>
              {errors.username && (
                <p className="text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            {existingUser === false && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Create a secure password"
                      className="pl-10"
                      value={formData.password}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      className="pl-10"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>
              </>
            )}

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">What you'll get:</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Author privileges to write and publish articles</li>
                <li>• Access to our content creation tools</li>
                <li>• Community of young journalists</li>
                <li>• Safe, moderated environment</li>
                <li>• Recognition for your child's work</li>
              </ul>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {existingUser === false ? 'Creating Account...' : 'Upgrading Account...'}
                </>
              ) : (
                existingUser === false ? 'Create Account' : 'Upgrade Account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              By claiming this invitation, you agree to our{' '}
              <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>{' '}
              and{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main component wrapped with error boundary
const InvitationClaimPage = () => {
  return (
    <InvitationErrorBoundary
      onError={(error, errorInfo) => {
        console.error('InvitationClaimPage Error:', error, errorInfo);
      }}
    >
      <InvitationClaimPageContent />
    </InvitationErrorBoundary>
  );
};

export default InvitationClaimPage;