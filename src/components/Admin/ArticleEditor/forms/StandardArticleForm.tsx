
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { standardArticleSchema, StandardArticleFormData } from '@/utils/validation/separateFormSchemas';
import { useStandardArticleSubmission } from '../hooks/useStandardArticleSubmission';
import { useCategoryResolver } from '@/hooks/article/useCategoryResolver';
import StandardFormContent from './sections/StandardFormContent';
import SimpleFormActions from '../SimpleFormActions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

interface StandardArticleFormProps {
  articleId?: string;
  isNewArticle: boolean;
  categorySlug?: string;
  categoryName?: string;
}

const StandardArticleForm: React.FC<StandardArticleFormProps> = ({
  articleId,
  isNewArticle,
  categorySlug,
  categoryName
}) => {
  // Pre-resolve category for new articles
  const { categoryData, isLoading: isCategoryLoading, error: categoryError } = useCategoryResolver(
    isNewArticle ? categorySlug : undefined,
    isNewArticle ? categoryName : undefined
  );

  const form = useForm<StandardArticleFormData>({
    resolver: zodResolver(standardArticleSchema),
    defaultValues: {
      title: '',
      content: '',
      excerpt: '',
      imageUrl: '',
      categoryId: '',
      slug: '',
      articleType: 'standard',
      status: 'draft',
      publishDate: null,
      shouldHighlight: false,
      allowVoting: false
    }
  });

  // Update form with resolved category data
  useEffect(() => {
    if (isNewArticle && categoryData?.id) {
      console.log('StandardArticleForm: Setting categoryId in form:', {
        categoryId: categoryData.id,
        categoryName: categoryData.name
      });
      
      form.setValue('categoryId', categoryData.id);
      
      // Trigger validation to clear any existing errors
      form.trigger('categoryId');
    }
  }, [categoryData, isNewArticle, form]);

  const { formState: { isDirty, isSubmitting, errors } } = form;
  const { isSaving, handleSaveDraft, handleSubmit: onSubmit } = useStandardArticleSubmission({
    form,
    articleId
  });

  // Show loading state while resolving category for new articles
  if (isNewArticle && isCategoryLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Preparing article form...</p>
        </div>
      </div>
    );
  }

  // Show error if category resolution failed
  if (isNewArticle && categoryError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {categoryError}. Please try again or select a different category.
        </AlertDescription>
      </Alert>
    );
  }

  // Don't render form until we have category data for new articles
  if (isNewArticle && !categoryData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  // Proper form submission handler using React Hook Form's handleSubmit
  const handleFormSubmit = form.handleSubmit(async (data: StandardArticleFormData) => {
    console.log('StandardArticleForm.handleFormSubmit called with validated data:', {
      title: data.title,
      categoryId: data.categoryId,
      articleType: data.articleType,
      hasContent: !!data.content
    });
    
    // Additional validation for required fields
    if (!data.categoryId) {
      console.error('Cannot submit article without categoryId');
      form.setError('categoryId', { 
        type: 'required', 
        message: 'Category is required' 
      });
      return;
    }
    
    if (!data.title.trim()) {
      console.error('Cannot submit article without title');
      form.setError('title', { 
        type: 'required', 
        message: 'Title is required' 
      });
      return;
    }
    
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Error in form submission:', error);
      // The submission hook should handle error display
    }
  });

  // Simple save draft handler
  const handleSaveDraftClick = async () => {
    console.log('Save draft clicked, current categoryId:', form.getValues('categoryId'));
    try {
      await handleSaveDraft();
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <StandardFormContent 
          form={form}
          isSubmitting={isSubmitting}
          isNewArticle={isNewArticle}
          resolvedCategoryData={isNewArticle ? categoryData : undefined}
        />
        
        <SimpleFormActions 
          onSaveDraft={handleSaveDraftClick}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
          isDirty={isDirty}
          isSaving={isSaving}
          disabled={isNewArticle && !categoryData?.id}
        />
        
        {/* Show validation errors */}
        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fix the following errors:
              <ul className="mt-2 ml-4 list-disc">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>{error?.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </form>
    </Form>
  );
};

export default StandardArticleForm;
