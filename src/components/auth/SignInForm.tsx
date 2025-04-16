
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import SignInFormFields from './SignInFormFields';

interface SignInFormProps {
  onSwitchTab: () => void;
  redirectPath?: string | null;
}

const SignInForm: React.FC<SignInFormProps> = ({ onSwitchTab, redirectPath }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, isLoggedIn } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signInForm, setSignInForm] = useState({
    email: '',
    password: '',
  });
  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false);

  // If user is already logged in or becomes logged in after a login attempt, redirect
  useEffect(() => {
    if (isLoggedIn && (redirectPath || hasAttemptedLogin)) {
      console.log('User is logged in, redirecting to:', redirectPath || '/');
      navigate(redirectPath || '/', { replace: true });
    }
  }, [isLoggedIn, navigate, redirectPath, hasAttemptedLogin]);

  const handleSignInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignInForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      console.log('Attempting login with:', signInForm.email);
      const success = await login(signInForm.email, signInForm.password);
      
      setHasAttemptedLogin(true);
      
      if (success) {
        console.log('Login successful');
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
        // The useEffect will handle navigation after successful login
      } else {
        console.log('Login failed');
        toast({
          title: "Sign in failed",
          description: "Invalid email or password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "An error occurred",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSignIn}>
      <CardContent className="space-y-4 mt-4">
        <SignInFormFields
          formValues={signInForm}
          onValueChange={handleSignInChange}
          isSubmitting={isSubmitting}
        />
      </CardContent>
      
      <CardFooter className="flex flex-col gap-4">
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>
        <Button 
          type="button" 
          variant="link" 
          onClick={onSwitchTab}
          className="text-xs"
          disabled={isSubmitting}
        >
          Don't have an account? Sign up
        </Button>
      </CardFooter>
    </form>
  );
};

export default SignInForm;
