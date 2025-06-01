
import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { registerUser } from '@/services/auth/authService';
import SignUpFormFields from './SignUpFormFields';
import DrawerFormActions from './DrawerFormActions';
import { validateSignUpForm } from './utils/formValidation';

interface DrawerSignUpFormProps {
  isSubmitting: boolean;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  onSuccess: () => void;
}

const initialFormState = {
  username: '',
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const DrawerSignUpForm: React.FC<DrawerSignUpFormProps> = ({ 
  isSubmitting, 
  setIsSubmitting,
  onSuccess
}) => {
  const { toast } = useToast();
  const [signUpForm, setSignUpForm] = useState(initialFormState);

  const handleSignUpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSignUpForm(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setSignUpForm(initialFormState);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validate form
    const validationResult = validateSignUpForm(signUpForm.password, signUpForm.confirmPassword);
    if (!validationResult.valid) {
      toast({
        title: "Validation Error",
        description: validationResult.errorMessage,
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
      
      // Reset form
      resetForm();
      
      // Close drawer
      onSuccess();
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
    <form onSubmit={handleSignUp} className="space-y-4 p-4">
      <SignUpFormFields
        formValues={signUpForm}
        onValueChange={handleSignUpChange}
        isSubmitting={isSubmitting}
      />
      
      <DrawerFormActions
        isSubmitting={isSubmitting}
        submitLabel="Create Account"
        submittingLabel="Creating Account..."
        onCancel={resetForm}
      />
    </form>
  );
};

export default DrawerSignUpForm;
