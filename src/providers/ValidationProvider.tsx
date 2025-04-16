
import React, { createContext, useContext, ReactNode } from 'react';
import { z } from 'zod';
import { toast } from '@/components/ui/use-toast';
import * as validationSchemas from '@/utils/validation';
import { validateData } from '@/utils/validation/validationUtils';
import { LogSource } from '@/utils/logger';
import logger from '@/utils/logger';

// Context type
type ValidationContextType = {
  validateForm: <T>(schema: z.ZodType<T>, data: unknown, options?: ValidationOptions) => { 
    isValid: boolean; 
    data: T | null;
    errors: z.ZodError | null;
  };
  getFormErrors: (zodError: z.ZodError | null) => Record<string, string> | null;
  formatZodError: (error: z.ZodError) => string;
};

type ValidationOptions = {
  context?: string;
  showToast?: boolean;
};

// Create context
const ValidationContext = createContext<ValidationContextType | null>(null);

// Provider component
export const ValidationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Format Zod error for display
  const formatZodError = (error: z.ZodError): string => {
    return error.errors
      .map(err => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
  };

  // Convert Zod errors to form errors object
  const getFormErrors = (zodError: z.ZodError | null): Record<string, string> | null => {
    if (!zodError) return null;
    
    const formErrors: Record<string, string> = {};
    
    for (const error of zodError.errors) {
      const path = error.path.join('.');
      if (path) {
        formErrors[path] = error.message;
      }
    }
    
    return formErrors;
  };

  // Validate form data against a schema
  const validateForm = <T,>(
    schema: z.ZodType<T>, 
    data: unknown, 
    options?: ValidationOptions
  ) => {
    const context = options?.context || 'form';
    const result = validateData(schema, data, context);
    
    if (!result.isValid && options?.showToast) {
      // Show error toast with formatted error message
      toast({
        title: "Validation Error",
        description: result.errors ? formatZodError(result.errors) : "Invalid data",
        variant: "destructive"
      });
      
      logger.warn(LogSource.CLIENT, `Form validation failed: ${context}`, {
        errors: result.errors?.errors
      });
    }
    
    return result;
  };

  const value = {
    validateForm,
    getFormErrors,
    formatZodError
  };

  return (
    <ValidationContext.Provider value={value}>
      {children}
    </ValidationContext.Provider>
  );
};

// Hook for using validation
export const useValidation = () => {
  const context = useContext(ValidationContext);
  if (!context) {
    throw new Error('useValidation must be used within a ValidationProvider');
  }
  return context;
};

// Re-export validation schemas for easy access
export { validationSchemas };
