import { UseFormReturn } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';

export const useFormValidation = (
  form?: UseFormReturn<any>,
  content?: string,
  customValidation?: () => { isValid: boolean; errors: string[] }
) => {
  const { toast } = useToast();

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
    
    // Otherwise, perform basic validation using form and content
    if (form) {
      // Check title
      const title = form.getValues('title');
      if (!title || title.trim() === '') {
        toast({
          title: "Validation Error",
          description: "Article title is required",
          variant: "destructive"
        });
        form.setError('title', { type: 'required', message: 'Title is required' });
        return false;
      }
      
      // Check category
      const categoryId = form.getValues('categoryId');
      if (!categoryId) {
        toast({
          title: "Validation Error",
          description: "Please select a category",
          variant: "destructive"
        });
        form.setError('categoryId', { type: 'required', message: 'Category is required' });
        return false;
      }
      
      // Check image URL
      const imageUrl = form.getValues('imageUrl');
      if (!imageUrl || imageUrl.trim() === '') {
        toast({
          title: "Validation Error",
          description: "A featured image is required",
          variant: "destructive"
        });
        form.setError('imageUrl', { type: 'required', message: 'Featured image is required' });
        return false;
      }
    }
    
    // Check content
    if (!content || content.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Article content is required",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  return { performFormValidation };
};

export default useFormValidation;
