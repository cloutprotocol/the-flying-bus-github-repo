
import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import SignUpFormFields from './SignUpFormFields';
import DrawerFormActions from './DrawerFormActions';
import { validateSignUpForm } from './utils/formValidation';
import { RegistrationErrorDisplay } from './RegistrationErrorDisplay';
import { useRegistrationError } from '@/hooks/useRegistrationError';
import { RegistrationErrorDetails } from '@/types/RegistrationErrorTypes';

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
  const { register } = useAuth();
  const { 
    registrationError, 
    setRegistrationError, 
    clearError, 
    handleRegistrationError 
  } = useRegistrationError();
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
    clearError(); // Clear any previous errors
    
    // Validate form
    const validationResult = validateSignUpForm(signUpForm.password, signUpForm.confirmPassword);
    if (!validationResult.valid) {
      const validationError: RegistrationErrorDetails = {
        code: 'VALIDATION_FAILED',
        type: 'validation',
        message: validationResult.errorMessage || "Validation failed",
        userMessage: validationResult.errorMessage || "Please check your input and try again.",
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
        signUpForm.email,
        signUpForm.password,
        signUpForm.username,
        signUpForm.displayName
      );
      
      if (success) {
        toast({
          title: "Welcome to The Flying Bus!",
          description: "Your account has been created and you're now signed in.",
        });
        
        // Reset form
        resetForm();
        
        // Close drawer
        onSuccess();
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
    <form onSubmit={handleSignUp} className="space-y-4 p-4">
      {/* Error Display */}
      {registrationError && (
        <RegistrationErrorDisplay
          error={registrationError}
          onRetry={registrationError.retryable ? handleRetry : undefined}
          onDismiss={clearError}
          className="mb-4"
        />
      )}
      
      <SignUpFormFields
        formValues={signUpForm}
        onValueChange={handleSignUpChange}
        isSubmitting={isSubmitting}
      />
      
      <DrawerFormActions
        isSubmitting={isSubmitting}
        submitLabel="Create Account"
        submittingLabel="Creating Account & Signing In..."
        onCancel={resetForm}
      />
    </form>
  );
};

export default DrawerSignUpForm;
