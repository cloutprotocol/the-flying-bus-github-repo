
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
    // PRIORITY: Use custom validation if provided (this is our ArticleFormValidation)
    if (customValidation) {
      logger.info(LogSource.EDITOR, 'Using custom validation function');
      
      const { isValid, errors } = customValidation();
      if (!isValid && errors.length > 0) {
        toast({
          title: "Validation Error",
          description: errors[0],
          variant: "destructive"
        });
        
        logger.warn(LogSource.EDITOR, 'Custom validation failed', { errors });
        return false;
      }
      
      logger.info(LogSource.EDITOR, 'Custom validation passed');
      return isValid;
    }
    
    // Fallback to centralized validation only if no custom validation
    if (form) {
      const formData = form.getValues();
      const fullData = {
        ...formData,
        content: content || ''
      };
      
      logger.info(LogSource.EDITOR, 'Using fallback centralized validation', {
        hasTitle: !!fullData.title,
        hasCategoryId: !!fullData.categoryId,
        contentLength: fullData.content?.length || 0,
        status: fullData.status || 'draft' 
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
      }
      
      return result.isValid;
    }
    
    logger.warn(LogSource.EDITOR, 'No validation method available');
    return false;
  };

  return { performFormValidation };
};

export default useFormValidation;
