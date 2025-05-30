
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
    
    logger.debug(LogSource.EDITOR, 'Starting form validation', {
      hasTitle: !!formData.title,
      hasCategoryId: !!formData.categoryId,
      contentLength: content.length,
      hasImageUrl: !!formData.imageUrl
    });

    // Validate title
    const title = formData.title;
    if (!title || title.trim() === '') {
      form.setError('title', { type: 'required', message: 'Title is required' });
      errors.push("Article title is required");
      isValid = false;
    }
    
    // Enhanced category validation with better error reporting
    const categoryId = formData.categoryId;
    if (!categoryId) {
      logger.warn(LogSource.EDITOR, 'Category validation failed - no categoryId found', {
        categoryId,
        hasTitle: !!title
      });
      
      form.setError('categoryId', { type: 'required', message: 'Category is required' });
      errors.push("Please select a category. If you selected one from the modal, there may have been an issue loading it.");
      isValid = false;
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

    if (!isValid) {
      logger.warn(LogSource.EDITOR, 'Form validation failed', {
        errorCount: errors.length,
        errors: errors
      });
    } else {
      logger.info(LogSource.EDITOR, 'Form validation passed successfully');
    }

    return { isValid, errors };
  };

  return {
    validateFormBeforeSubmit
  };
};
