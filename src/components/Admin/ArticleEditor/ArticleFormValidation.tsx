
import { UseFormReturn } from 'react-hook-form';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const useArticleFormValidation = (form: UseFormReturn<any>, content: string) => {
  
  const validateFormBeforeSubmit = (): ValidationResult => {
    let isValid = true;
    const errors: string[] = [];

    // Validate title
    const title = form.getValues('title');
    if (!title || title.trim() === '') {
      form.setError('title', { type: 'required', message: 'Title is required' });
      errors.push("Article title is required");
      isValid = false;
    }
    
    // Validate category
    const categoryId = form.getValues('categoryId');
    if (!categoryId) {
      form.setError('categoryId', { type: 'required', message: 'Category is required' });
      errors.push("Please select a category");
      isValid = false;
    }
    
    // Validate content
    if (!content || content.trim() === '') {
      errors.push("Article content is required");
      isValid = false;
    }
    
    // Validate image URL
    const imageUrl = form.getValues('imageUrl');
    if (!imageUrl || imageUrl.trim() === '') {
      errors.push("A featured image is required");
      form.setError('imageUrl', { type: 'required', message: 'Featured image is required' });
      isValid = false;
    }

    return { isValid, errors };
  };

  return {
    validateFormBeforeSubmit
  };
};
