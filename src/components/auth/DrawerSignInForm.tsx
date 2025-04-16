
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DrawerFooter } from "@/components/ui/drawer";
import { Mail, Key } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface DrawerSignInFormProps {
  isSubmitting: boolean;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  onSuccess: () => void;
}

const DrawerSignInForm: React.FC<DrawerSignInFormProps> = ({ 
  isSubmitting, 
  setIsSubmitting,
  onSuccess
}) => {
  const { toast } = useToast();
  const { login } = useAuth();
  
  const [signInForm, setSignInForm] = useState({
    email: '',
    password: '',
  });

  const handleSignInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignInForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const success = await login(signInForm.email, signInForm.password);
      
      if (success) {
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
        
        // Reset form
        setSignInForm({ email: '', password: '' });
        
        // Call onSuccess to close the drawer
        onSuccess();
      } else {
        toast({
          title: "Sign in failed",
          description: "Invalid email or password.",
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
        <Label htmlFor="signin-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
          <Input 
            id="signin-email" 
            name="email"
            type="email"
            placeholder="Your email" 
            className="pl-10"
            value={signInForm.email}
            onChange={handleSignInChange}
            disabled={isSubmitting}
            required
          />
        </div>
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
      </div>
      
      <DrawerFooter className="px-0">
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={() => setSignInForm({ email: '', password: '' })}>
          Cancel
        </Button>
      </DrawerFooter>
    </form>
  );
};

export default DrawerSignInForm;
