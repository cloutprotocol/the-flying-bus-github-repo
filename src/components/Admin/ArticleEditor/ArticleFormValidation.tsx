
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
    
    logger.info(LogSource.EDITOR, 'Starting comprehensive form validation', {
      title: formData.title,
      categoryId: formData.categoryId,
      contentLength: content.length,
      imageUrl: formData.imageUrl,
      formDirty: form.formState.isDirty,
      hasFormErrors: Object.keys(form.formState.errors).length > 0
    });

    // Validate title
    const title = formData.title;
    if (!title || title.trim() === '') {
      form.setError('title', { type: 'required', message: 'Title is required' });
      errors.push("Article title is required");
      isValid = false;
      logger.warn(LogSource.EDITOR, 'Title validation failed', { title });
    }
    
    // Enhanced category validation with better error reporting
    const categoryId = formData.categoryId;
    if (!categoryId) {
      logger.error(LogSource.EDITOR, 'Category validation failed - no categoryId found', {
        categoryId,
        hasTitle: !!title,
        formState: form.formState.isDirty,
        formErrors: form.formState.errors,
        allFormValues: formData
      });
      
      form.setError('categoryId', { type: 'required', message: 'Category is required' });
      errors.push("Please select a category. If you selected one from the modal, there may have been an issue loading it.");
      isValid = false;
    } else {
      logger.info(LogSource.EDITOR, 'Category validation passed', { 
        categoryId,
        categoryType: typeof categoryId 
      });
    }
    
    // Validate content
    if (!content || content.trim() === '') {
      errors.push("Article content is required");
      isValid = false;
      logger.warn(LogSource.EDITOR, 'Content validation failed', { 
        contentLength: content?.length || 0,
        contentPreview: content?.substring(0, 50) || 'empty'
      });
    }
    
    // Validate image URL
    const imageUrl = formData.imageUrl;
    if (!imageUrl || imageUrl.trim() === '') {
      errors.push("A featured image is required");
      form.setError('imageUrl', { type: 'required', message: 'Featured image is required' });
      isValid = false;
      logger.warn(LogSource.EDITOR, 'Image URL validation failed', { imageUrl });
    }

    logger.info(LogSource.EDITOR, 'Form validation completed', {
      isValid,
      errorCount: errors.length,
      errors: errors,
      validationSummary: {
        hasTitle: !!title,
        hasCategoryId: !!categoryId,
        hasContent: !!content && content.trim() !== '',
        hasImageUrl: !!imageUrl && imageUrl.trim() !== ''
      }
    });

    return { isValid, errors };
  };

  return {
    validateFormBeforeSubmit
  };
};
