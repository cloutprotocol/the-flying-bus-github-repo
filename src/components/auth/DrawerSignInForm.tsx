
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DrawerClose, DrawerFooter } from "@/components/ui/drawer";
import { Mail, Key, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface DrawerSignInFormProps {
  isSubmitting: boolean;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
}

const DrawerSignInForm: React.FC<DrawerSignInFormProps> = ({ 
  isSubmitting, 
  setIsSubmitting 
}) => {
  const { toast } = useToast();
  const { login } = useAuth();
  
  const [signInForm, setSignInForm] = useState({
    username: '',
    password: '',
  });
  const [loginSuccess, setLoginSuccess] = useState(false);

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
        setLoginSuccess(true);
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
        
        // Reset form
        setSignInForm({ username: '', password: '' });
      } else {
        toast({
          title: "Sign in failed",
          description: "Invalid username or password. Try 'curious_reader' for demo.",
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
    <form onSubmit={handleSignIn} className="space-y-4 p-4">
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
        <p className="text-xs text-gray-500">Demo: try "curious_reader"</p>
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
      
      <DrawerFooter className="px-0">
        {loginSuccess ? (
          <DrawerClose asChild>
            <Button type="button" className="w-full">
              Close
            </Button>
          </DrawerClose>
        ) : (
          <>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
            <DrawerClose asChild>
              <Button type="button" variant="outline" className="w-full">
                Cancel
              </Button>
            </DrawerClose>
          </>
        )}
      </DrawerFooter>
    </form>
  );
};

export default DrawerSignInForm;
