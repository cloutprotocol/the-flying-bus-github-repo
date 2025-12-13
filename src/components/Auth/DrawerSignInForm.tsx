
import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import SignInFormFields from './SignInFormFields';
import DrawerFormActions from './DrawerFormActions';

interface DrawerSignInFormProps {
  isSubmitting: boolean;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  onSuccess: () => void;
}

const initialFormState = {
  email: '',
  password: '',
};

const DrawerSignInForm: React.FC<DrawerSignInFormProps> = ({
  isSubmitting,
  setIsSubmitting,
  onSuccess
}) => {
  const { toast } = useToast();
  const { login } = useAuth();

  const [signInForm, setSignInForm] = useState(initialFormState);

  const handleSignInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignInForm(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setSignInForm(initialFormState);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const email = signInForm.email.trim().toLowerCase();
      console.log('Attempting login with:', email);
      const success = await login(email, signInForm.password);

      console.log('Login result:', success);

      if (success) {
        console.log('Login successful, resetting form and calling onSuccess');

        // Reset form
        resetForm();

        // Delay closing drawer to allow profile to load
        setTimeout(() => {
          // Call onSuccess to close the drawer
          onSuccess();

          // Toast handled in AuthProvider
        }, 1500); // Increased delay to ensure profile loads
      } else {
        console.log('Login failed - check console for details');
        // Toast handled in AuthProvider
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
    <form onSubmit={handleSignIn} className="space-y-4 p-4">
      <SignInFormFields
        formValues={signInForm}
        onValueChange={handleSignInChange}
        isSubmitting={isSubmitting}
      />

      <DrawerFormActions
        isSubmitting={isSubmitting}
        submitLabel="Sign In"
        submittingLabel="Signing in..."
        onCancel={resetForm}
      />
    </form>
  );
};

export default DrawerSignInForm;
