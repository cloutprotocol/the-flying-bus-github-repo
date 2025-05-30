
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
    logger.info(LogSource.EDITOR, 'FormValidation: Starting validation process', {
      hasCustomValidation: !!customValidation,
      hasForm: !!form,
      contentLength: content?.length || 0
    });

    // PRIORITY 1: Use custom validation if provided (this is our ArticleFormValidation)
    if (customValidation) {
      logger.info(LogSource.EDITOR, 'Using custom validation function (ArticleFormValidation)');
      
      const { isValid, errors } = customValidation();
      
      logger.info(LogSource.EDITOR, 'Custom validation result', {
        isValid,
        errorCount: errors.length,
        errors
      });
      
      if (!isValid && errors.length > 0) {
        // Show the first error to user
        toast({
          title: "Validation Error",
          description: errors[0],
          variant: "destructive"
        });
        
        logger.warn(LogSource.EDITOR, 'Custom validation failed, blocking submission', { 
          firstError: errors[0],
          allErrors: errors 
        });
        return false;
      }
      
      logger.info(LogSource.EDITOR, 'Custom validation passed successfully');
      return isValid;
    }
    
    // PRIORITY 2: Fallback to centralized validation only if no custom validation
    if (form) {
      logger.info(LogSource.EDITOR, 'Using fallback centralized validation');
      
      const formData = form.getValues();
      const fullData = {
        ...formData,
        content: content || ''
      };
      
      logger.info(LogSource.EDITOR, 'Centralized validation data', {
        hasTitle: !!fullData.title,
        hasCategoryId: !!fullData.categoryId,
        contentLength: fullData.content?.length || 0,
        status: fullData.status || 'draft',
        categoryId: fullData.categoryId
      });
      
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
          errors: result.errors
        });
      } else {
        logger.info(LogSource.EDITOR, 'Centralized validation passed');
      }
      
      return result.isValid;
    }
    
    logger.warn(LogSource.EDITOR, 'No validation method available - this should not happen');
    return false;
  };

  return { performFormValidation };
};

export default useFormValidation;
