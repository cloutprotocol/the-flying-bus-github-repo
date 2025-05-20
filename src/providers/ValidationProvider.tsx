
import React, { createContext, useContext } from 'react';
import { z } from 'zod';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface ValidationContextType {
  validateForm: <T extends z.ZodType<any, any>>(
    schema: T,
    data: any,
    options?: {
      context?: string;
      showToast?: boolean;
      toastOnSuccess?: boolean;
    }
  ) => {
    isValid: boolean;
    data: z.infer<T> | null;
    errors: Record<string, string> | null;
  };
  
  validateField: <T extends z.ZodType<any, any>>(
    schema: T,
    fieldPath: string,
    value: any,
    options?: {
      context?: string;
    }
  ) => {
    isValid: boolean;
    error: string | null;
  };
}

const ValidationContext = createContext<ValidationContextType | undefined>(undefined);

export function ValidationProvider({ children }: { children: React.ReactNode }) {
  const validateForm = <T extends z.ZodType<any, any>>(
    schema: T,
    data: any,
    options?: {
      context?: string;
      showToast?: boolean;
      toastOnSuccess?: boolean;
    }
  ) => {
    const context = options?.context || 'validation';
    const showToast = options?.showToast ?? false;
    const toastOnSuccess = options?.toastOnSuccess ?? false;

    try {
      // Parse data with schema
      const result = schema.safeParse(data);
      
      if (result.success) {
        logger.info(
          LogSource.APP,
          `Validation successful: ${context}`,
          { data: JSON.stringify(data).substring(0, 200) + '...' }
        );
        
        if (showToast && toastOnSuccess) {
          toast({
            title: "Validation Successful",
            description: "All fields are valid.",
            variant: "default"
          });
        }
        
        return {
          isValid: true,
          data: result.data,
          errors: null
        };
      } else {
        // Format errors into a more usable structure
        const formattedErrors: Record<string, string> = {};
        
        result.error.errors.forEach((err) => {
          const path = err.path.join('.');
          formattedErrors[path] = err.message;
        });
        
        // Log validation errors
        logger.info(
          LogSource.APP,
          `Validation failed: ${context}`,
          { errors: formattedErrors }
        );
        
        // Show toast if requested
        if (showToast) {
          toast({
            title: "Validation Error",
            description: "There are errors in your form. Please check the highlighted fields.",
            variant: "destructive"
          });
        }
        
        return {
          isValid: false,
          data: null,
          errors: formattedErrors
        };
      }
    } catch (error) {
      logger.error(
        LogSource.APP,
        `Validation exception: ${context}`,
        error
      );
      
      if (showToast) {
        toast({
          title: "Validation Error",
          description: "An unexpected error occurred during validation.",
          variant: "destructive"
        });
      }
      
      return {
        isValid: false,
        data: null,
        errors: { _error: "Unexpected validation error" }
      };
    }
  };
  
  const validateField = <T extends z.ZodType<any, any>>(
    schema: T,
    fieldPath: string,
    value: any,
    options?: {
      context?: string;
    }
  ) => {
    const context = options?.context || 'field_validation';
    
    try {
      // Create a single-field schema to validate just this field
      const fieldSchema = z.object({
        [fieldPath]: z.any()
      });
      
      // Parse the field
      const result = fieldSchema.safeParse({ [fieldPath]: value });
      
      if (result.success) {
        return { isValid: true, error: null };
      } else {
        const error = result.error.errors.find(err => 
          err.path.join('.') === fieldPath
        )?.message || 'Invalid value';
        
        return { isValid: false, error };
      }
    } catch (error) {
      logger.error(
        LogSource.APP,
        `Field validation exception: ${context}`,
        error
      );
      
      return { isValid: false, error: 'Unexpected validation error' };
    }
  };

  return (
    <ValidationContext.Provider value={{ validateForm, validateField }}>
      {children}
    </ValidationContext.Provider>
  );
}

export function useValidation() {
  const context = useContext(ValidationContext);
  
  if (context === undefined) {
    throw new Error('useValidation must be used within a ValidationProvider');
  }
  
  return context;
}
