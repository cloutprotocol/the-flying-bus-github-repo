
import { UseFormReturn } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { useValidation } from '@/providers/ValidationProvider';
import { createArticleSchema } from '@/utils/validation/articleValidation';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export const useFormValidation = (
  form?: UseFormReturn<any>,
  content?: string,
  customValidation?: () => { isValid: boolean; errors: string[] }
) => {
  const { toast } = useToast();
  const { validateForm } = useValidation();

  const performFormValidation = (): boolean => {
    logger.debug(LogSource.EDITOR, 'FormValidation: Starting validation process', {
      hasCustomValidation: !!customValidation,
      hasForm: !!form,
      contentLength: content?.length || 0
    });

    // PRIORITY 1: Use custom validation if provided (this is our ArticleFormValidation)
    if (customValidation) {
      const { isValid, errors } = customValidation();
      
      logger.debug(LogSource.EDITOR, 'Custom validation result', {
        isValid,
        errorCount: errors.length
      });
      
      if (!isValid && errors.length > 0) {
        // Show the first error to user
        toast({
          title: "Validation Error",
          description: errors[0],
          variant: "destructive"
        });
        
        logger.warn(LogSource.EDITOR, 'Custom validation failed, blocking submission', { 
          firstError: errors[0]
        });
        return false;
      }
      
      return isValid;
    }
    
    // PRIORITY 2: Fallback to centralized validation only if no custom validation
    if (form) {
      const formData = form.getValues();
      const fullData = {
        ...formData,
        content: content || ''
      };
      
      const result = validateForm(createArticleSchema, fullData, {
        context: 'article_submit',
        showToast: true
      });
      
      if (!result.isValid && result.errors) {
        // Set the field errors in the form
        Object.entries(result.errors).forEach(([field, message]) => {
          if (field !== 'content' && field !== '_error') {
            form.setError(field as any, { type: 'validate', message });
          }
        });
        
        logger.warn(LogSource.EDITOR, 'Centralized validation failed', {
          errorCount: Object.keys(result.errors).length
        });
      }
      
      return result.isValid;
    }
    
    logger.warn(LogSource.EDITOR, 'No validation method available');
    return false;
  };

  return { performFormValidation };
};

export default useFormValidation;
