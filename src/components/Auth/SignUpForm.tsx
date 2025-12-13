import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Mail, Key, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRegistrationError } from '@/hooks/useRegistrationError';
import { RegistrationErrorDetails } from '@/types/RegistrationErrorTypes';

interface SignUpFormProps {
  onSwitchTab: () => void;
  redirectPath?: string | null;
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onSwitchTab, redirectPath }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register } = useAuth();
  const { 
    error: registrationError, 
    setError: setRegistrationError, 
    clearError, 
    handleError: handleRegistrationError 
  } = useRegistrationError();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signUpForm, setSignUpForm] = useState({
    username: '',
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSignUpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignUpForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    clearError(); // Clear any previous errors
    
    // Basic validation
    if (signUpForm.password !== signUpForm.confirmPassword) {
      const validationError: RegistrationErrorDetails = {
        code: 'VALIDATION_FAILED',
        type: 'validation',
        message: "Passwords don't match",
        userMessage: "Please make sure your passwords match.",
        retryable: false,
        suggestedAction: "Check that both password fields contain the same value."
      };
      setRegistrationError(validationError);
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Use the register method from auth context (includes auto-login)
      const success = await register(
        signUpForm.email.trim().toLowerCase(),
        signUpForm.password,
        signUpForm.username,
        signUpForm.displayName
      );
      
      if (success) {
        // Registration and auto-login successful - show success message and redirect
        toast({
          title: "Welcome to The Flying Bus!",
          description: "Your account has been created and you're now signed in.",
        });
        
        // Redirect after a brief delay to show the success message
        setTimeout(() => {
          navigate(redirectPath || '/', { replace: true });
        }, 1000);
      }
      // If success is false, error handling is done in the auth context
    } catch (error) {
      console.error('Sign up error:', error);
      handleRegistrationError(error as Error, {
        email: signUpForm.email,
        registrationType: 'standard'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    clearError();
    handleSignUp(new Event('submit') as any);
  };

  return (
    <form onSubmit={handleSignUp}>
      <CardContent className="space-y-4 mt-4">
        {/* Error Display */}
        {registrationError && (
          <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600">{registrationError.userMessage}</p>
            {registrationError.retryable && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="mt-2"
              >
                Try Again
              </Button>
            )}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input 
              id="username" 
              name="username"
              placeholder="Pick a username" 
              className="pl-10"
              value={signUpForm.username}
              onChange={handleSignUpChange}
              disabled={isSubmitting}
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input 
              id="displayName" 
              name="displayName"
              placeholder="How should we call you?" 
              className="pl-10"
              value={signUpForm.displayName}
              onChange={handleSignUpChange}
              disabled={isSubmitting}
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input 
              id="email" 
              name="email"
              type="email" 
              placeholder="your@email.com" 
              className="pl-10"
              value={signUpForm.email}
              onChange={handleSignUpChange}
              disabled={isSubmitting}
              required
            />
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
              placeholder="Create a password" 
              className="pl-10"
              value={signUpForm.password}
              onChange={handleSignUpChange}
              disabled={isSubmitting}
              required
            />
          </div>
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
              className="pl-10"
              value={signUpForm.confirmPassword}
              onChange={handleSignUpChange}
              disabled={isSubmitting}
              required
            />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col gap-4">
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating Account & Signing In...' : 'Create Account'}
        </Button>
        <Button 
          type="button" 
          variant="link" 
          onClick={onSwitchTab}
          className="text-xs"
          disabled={isSubmitting}
        >
          Already have an account? Sign in
        </Button>
      </CardFooter>
    </form>
  );
};

export default SignUpForm;
