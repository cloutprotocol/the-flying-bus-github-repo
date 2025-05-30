
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const useArticleFormValidation = (formData: ArticleFormData) => {
  
  const validateFormBeforeSubmit = (): ValidationResult => {
    let isValid = true;
    const errors: string[] = [];
    
    logger.debug(LogSource.EDITOR, 'Starting form validation', {
      hasTitle: !!formData.title,
      hasCategoryId: !!formData.categoryId,
      contentLength: formData.content.length,
      hasImageUrl: !!formData.imageUrl
    });

    // Validate title
    if (!formData.title || formData.title.trim() === '') {
      errors.push("Article title is required");
      isValid = false;
    }
    
    // Enhanced category validation with better error reporting
    if (!formData.categoryId) {
      logger.warn(LogSource.EDITOR, 'Category validation failed - no categoryId found', {
        categoryId: formData.categoryId,
        hasTitle: !!formData.title
      });
      
      errors.push("Please select a category. If you selected one from the modal, there may have been an issue loading it.");
      isValid = false;
    }
    
    // Validate content
    if (!formData.content || formData.content.trim() === '') {
      errors.push("Article content is required");
      isValid = false;
    }
    
    // Validate image URL
    if (!formData.imageUrl || formData.imageUrl.trim() === '') {
      errors.push("A featured image is required");
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
