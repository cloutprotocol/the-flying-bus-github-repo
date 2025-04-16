
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Key, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
    username: '',
    password: '',
  });

  // If user is already logged in, redirect
  useEffect(() => {
    if (isLoggedIn) {
      navigate(redirectPath || '/', { replace: true });
    }
  }, [isLoggedIn, navigate, redirectPath]);

  const handleSignInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignInForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const success = await login(signInForm.username, signInForm.password);
      
      if (success) {
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
      } else {
        toast({
          title: "Sign in failed",
          description: "Invalid username or password. Try 'curious_reader' or 'admin_user' for demo.",
          variant: "destructive",
        });
      }
    } catch (error) {
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
        <div className="space-y-2">
          <Label htmlFor="signin-username">Username</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input 
              id="signin-username" 
              name="username"
              placeholder="Your username" 
              className="pl-10"
              value={signInForm.username}
              onChange={handleSignInChange}
              disabled={isSubmitting}
              required
            />
          </div>
          <p className="text-xs text-gray-500">Demo: try "curious_reader" (reader) or "admin_user" (admin)</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="signin-password">Password</Label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input 
              id="signin-password" 
              name="password"
              type="password" 
              placeholder="Your password" 
              className="pl-10"
              value={signInForm.password}
              onChange={handleSignInChange}
              disabled={isSubmitting}
              required
            />
          </div>
          <p className="text-xs text-gray-500">Any password will work in demo mode</p>
        </div>
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
