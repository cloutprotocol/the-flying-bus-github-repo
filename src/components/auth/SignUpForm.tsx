import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Mail, Key, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { registerUser } from '@/services/auth/authService';

interface SignUpFormProps {
  onSwitchTab: () => void;
  redirectPath?: string | null;
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onSwitchTab, redirectPath }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
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
    
    // Basic validation
    if (signUpForm.password !== signUpForm.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Use the registerUser service function
      const result = await registerUser(
        signUpForm.email,
        signUpForm.password,
        signUpForm.username,
        signUpForm.displayName
      );
      
      if (!result.success) {
        console.error('Registration error:', result.error);
        toast({
          title: "Sign up failed",
          description: result.error?.message || "An error occurred during registration",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Account created!",
        description: "Welcome to The Flying Bus! You're now signed in.",
      });
      
      // Redirect to home or specified path
      setTimeout(() => {
        navigate(redirectPath || '/', { replace: true });
      }, 500);
    } catch (error) {
      console.error('Sign up error:', error);
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
    <form onSubmit={handleSignUp}>
      <CardContent className="space-y-4 mt-4">
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
          {isSubmitting ? 'Creating Account...' : 'Create Account'}
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
