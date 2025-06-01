
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
  console.log('StandardArticleForm: Rendering with props:', {
    articleId,
    isNewArticle,
    categorySlug,
    categoryName
  });

  // Pre-resolve category for new articles
  const { categoryData, isLoading: isCategoryLoading, error: categoryError } = useCategoryResolver(
    isNewArticle ? categorySlug : undefined,
    isNewArticle ? categoryName : undefined
  );

  console.log('StandardArticleForm: Category resolution state:', {
    categoryData,
    isCategoryLoading,
    categoryError,
    hasCategoryId: !!categoryData?.id
  });

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

  console.log('StandardArticleForm: Form state:', {
    formValues: form.getValues(),
    formErrors: form.formState.errors,
    isDirty: form.formState.isDirty,
    isValid: form.formState.isValid,
    isSubmitting: form.formState.isSubmitting
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

  console.log('StandardArticleForm: Form actions state:', {
    isDirty,
    isSubmitting,
    isSaving,
    errorsCount: Object.keys(errors).length,
    errors: errors
  });

  // Show loading state while resolving category for new articles
  if (isNewArticle && isCategoryLoading) {
    console.log('StandardArticleForm: Showing loading state for category resolution');
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
    console.error('StandardArticleForm: Category resolution failed:', categoryError);
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
    console.log('StandardArticleForm: Waiting for category data...');
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
    
    console.log('StandardArticleForm: Form validation passed, calling submission handler...');
    
    try {
      await onSubmit(data);
      console.log('StandardArticleForm: Submission completed successfully');
    } catch (error) {
      console.error('Error in form submission:', error);
      // The submission hook should handle error display
    }
  });

  // Enhanced save draft handler with logging
  const handleSaveDraftClick = async () => {
    console.log('StandardArticleForm: Save draft clicked, current form state:', {
      categoryId: form.getValues('categoryId'),
      title: form.getValues('title'),
      isValid: form.formState.isValid,
      errors: form.formState.errors
    });
    
    try {
      await handleSaveDraft();
      console.log('StandardArticleForm: Draft save completed');
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  // Check if form is ready for submission
  const isFormDisabled = isNewArticle && !categoryData?.id;
  
  console.log('StandardArticleForm: Form render decision:', {
    isFormDisabled,
    canSubmit: !isFormDisabled && form.formState.isValid,
    buttonState: {
      disabled: isFormDisabled,
      isSubmitting,
      isSaving
    }
  });

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
          disabled={isFormDisabled}
        />
        
        {/* Show validation errors */}
        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fix the following errors:
              <ul className="mt-2 ml-4 list-disc">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>{field}: {error?.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && (
          <Alert>
            <AlertDescription>
              <details className="text-xs">
                <summary>Debug Info (Development Only)</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {JSON.stringify({
                    formValues: form.getValues(),
                    categoryData,
                    isFormDisabled,
                    formErrors: errors
                  }, null, 2)}
                </pre>
              </details>
            </AlertDescription>
          </Alert>
        )}
      </form>
    </Form>
  );
};

export default StandardArticleForm;
