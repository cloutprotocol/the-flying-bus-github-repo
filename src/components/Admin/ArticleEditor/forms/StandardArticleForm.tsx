
import React from 'react';
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

  // Don't initialize the form until we have category data for new articles
  const shouldInitializeForm = !isNewArticle || (isNewArticle && categoryData);

  const form = useForm<StandardArticleFormData>({
    resolver: zodResolver(standardArticleSchema),
    defaultValues: {
      title: '',
      content: '',
      excerpt: '',
      imageUrl: '',
      categoryId: isNewArticle && categoryData ? categoryData.id : '',
      slug: '',
      articleType: 'standard',
      status: 'draft',
      publishDate: null,
      shouldHighlight: false,
      allowVoting: false
    }
  });

  const { formState: { isDirty, isSubmitting } } = form;
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

  // Don't render form until we have all required data
  if (!shouldInitializeForm) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  // Simple submit handler that just gets the current form data
  const handleFormSubmit = async () => {
    console.log('StandardArticleForm.handleFormSubmit called');
    const formData = form.getValues();
    
    // Validate that we have a categoryId before submitting
    if (!formData.categoryId) {
      console.error('Cannot submit article without categoryId');
      return;
    }
    
    console.log('Submitting standard article with data:', {
      title: formData.title,
      categoryId: formData.categoryId,
      articleType: formData.articleType
    });
    
    await onSubmit(formData);
  };

  return (
    <Form {...form}>
      <form className="space-y-6">
        <StandardFormContent 
          form={form}
          isSubmitting={isSubmitting}
          isNewArticle={isNewArticle}
          resolvedCategoryData={isNewArticle ? categoryData : undefined}
        />
        
        <SimpleFormActions 
          onSaveDraft={handleSaveDraft}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
          isDirty={isDirty}
          isSaving={isSaving}
          disabled={isNewArticle && !categoryData?.id}
        />
      </form>
    </Form>
  );
};

export default StandardArticleForm;
