
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { standardArticleSchema, StandardArticleFormData } from '@/utils/validation/separateFormSchemas';
import { useStandardArticleSubmission } from '../hooks/useStandardArticleSubmission';
import { useCategoryResolver } from '@/hooks/article/useCategoryResolver';
import { useArticleLoader } from '@/hooks/article/useArticleLoader';
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

  // Load existing article data for editing
  const { articleData, isLoading: isLoadingArticle, error: articleError } = useArticleLoader(
    !isNewArticle ? articleId : undefined
  );

  // Pre-resolve category for new articles
  const { categoryData, isLoading: isCategoryLoading, error: categoryError } = useCategoryResolver(
    isNewArticle ? categorySlug : undefined,
    isNewArticle ? categoryName : undefined
  );

  console.log('StandardArticleForm: Data loading state:', {
    isNewArticle,
    articleData,
    categoryData,
    isLoadingArticle,
    isCategoryLoading,
    articleError,
    categoryError
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

  // Load existing article data into form
  useEffect(() => {
    if (!isNewArticle && articleData) {
      console.log('StandardArticleForm: Loading existing article data into form:', {
        title: articleData.title,
        categoryId: articleData.categoryId,
        categoryName: articleData.categoryName
      });
      
      form.reset({
        title: articleData.title,
        content: articleData.content,
        excerpt: articleData.excerpt,
        imageUrl: articleData.imageUrl,
        categoryId: articleData.categoryId,
        slug: articleData.slug,
        articleType: articleData.articleType as any,
        status: articleData.status as any,
        publishDate: null,
        shouldHighlight: false,
        allowVoting: false
      });
    }
  }, [articleData, isNewArticle, form]);

  // Update form with resolved category data for new articles
  useEffect(() => {
    if (isNewArticle && categoryData?.id) {
      console.log('StandardArticleForm: Setting categoryId in form for new article:', {
        categoryId: categoryData.id,
        categoryName: categoryData.name
      });
      
      form.setValue('categoryId', categoryData.id);
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

  // Show loading state while loading article data for editing
  if (!isNewArticle && isLoadingArticle) {
    console.log('StandardArticleForm: Showing loading state for article data');
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading article...</p>
        </div>
      </div>
    );
  }

  // Show error if article loading failed
  if (!isNewArticle && articleError) {
    console.error('StandardArticleForm: Article loading failed:', articleError);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {articleError}. Please try again or check if the article exists.
        </AlertDescription>
      </Alert>
    );
  }

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

  // Show error if category resolution failed for new articles
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

  // Don't render form until we have necessary data
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

  if (!isNewArticle && !articleData) {
    console.log('StandardArticleForm: Waiting for article data...');
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading article data...</p>
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

  // Prepare category data for the form content
  const resolvedCategoryForForm = isNewArticle 
    ? categoryData 
    : articleData 
      ? { id: articleData.categoryId, name: articleData.categoryName, slug: '' }
      : null;

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <StandardFormContent 
          form={form}
          isSubmitting={isSubmitting}
          isNewArticle={isNewArticle}
          resolvedCategoryData={resolvedCategoryForForm}
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
                    categoryData: resolvedCategoryForForm,
                    articleData: articleData,
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
