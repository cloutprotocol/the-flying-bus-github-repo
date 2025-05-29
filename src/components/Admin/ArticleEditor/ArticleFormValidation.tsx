
import { UseFormReturn } from 'react-hook-form';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const useArticleFormValidation = (form: UseFormReturn<any>, content: string) => {
  
  const validateFormBeforeSubmit = (): ValidationResult => {
    let isValid = true;
    const errors: string[] = [];

    // Get current form values for debugging
    const formData = form.getValues();
    
    logger.info(LogSource.EDITOR, 'Starting form validation', {
      title: formData.title,
      categoryId: formData.categoryId,
      contentLength: content.length,
      imageUrl: formData.imageUrl
    });

    // Validate title
    const title = formData.title;
    if (!title || title.trim() === '') {
      form.setError('title', { type: 'required', message: 'Title is required' });
      errors.push("Article title is required");
      isValid = false;
    }
    
    // Validate category - improved logic to handle pre-selected categories
    const categoryId = formData.categoryId;
    if (!categoryId) {
      logger.warn(LogSource.EDITOR, 'Category validation failed', {
        categoryId,
        hasTitle: !!title,
        formState: form.formState.isDirty
      });
      
      form.setError('categoryId', { type: 'required', message: 'Category is required' });
      errors.push("Please select a category");
      isValid = false;
    } else {
      logger.info(LogSource.EDITOR, 'Category validation passed', { categoryId });
    }
    
    // Validate content
    if (!content || content.trim() === '') {
      errors.push("Article content is required");
      isValid = false;
    }
    
    // Validate image URL
    const imageUrl = formData.imageUrl;
    if (!imageUrl || imageUrl.trim() === '') {
      errors.push("A featured image is required");
      form.setError('imageUrl', { type: 'required', message: 'Featured image is required' });
      isValid = false;
    }

    logger.info(LogSource.EDITOR, 'Form validation completed', {
      isValid,
      errorCount: errors.length,
      errors: errors
    });

    return { isValid, errors };
  };

  return {
    validateFormBeforeSubmit
  };
};
