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
    // If custom validation function is provided, use it
    if (customValidation) {
      const { isValid, errors } = customValidation();
      if (!isValid && errors.length > 0) {
        toast({
          title: "Validation Error",
          description: errors[0],
          variant: "destructive"
        });
        return false;
      }
      return isValid;
    }
    
    // Otherwise, use centralized validation
    if (form) {
      const formData = form.getValues();
      const fullData = {
        ...formData,
        content: content || ''
      };
      
      logger.info(LogSource.EDITOR, 'Validating article form', {
        hasTitle: !!fullData.title,
        hasCategoryId: !!fullData.categoryId,
        contentLength: fullData.content?.length || 0
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
      }
      
      return result.isValid;
    }
    
    return false;
  };

  return { performFormValidation };
};

export default useFormValidation;
