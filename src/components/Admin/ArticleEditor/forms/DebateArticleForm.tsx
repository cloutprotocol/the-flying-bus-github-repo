
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { debateArticleSchema, DebateArticleFormData } from '@/utils/validation/separateFormSchemas';
import { useDebateArticleSubmission } from '../hooks/useDebateArticleSubmission';
import { useCategoryResolver } from '@/hooks/article/useCategoryResolver';
import DebateFormContent from './sections/DebateFormContent';
import SimpleFormActions from '../SimpleFormActions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

interface DebateArticleFormProps {
  articleId?: string;
  isNewArticle: boolean;
  categorySlug?: string;
  categoryName?: string;
}

const DebateArticleForm: React.FC<DebateArticleFormProps> = ({
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

  const form = useForm<DebateArticleFormData>({
    resolver: zodResolver(debateArticleSchema),
    defaultValues: {
      title: '',
      content: '',
      excerpt: '',
      imageUrl: '',
      categoryId: '', // Empty initially, will be set via useEffect
      slug: '',
      articleType: 'debate',
      status: 'draft',
      publishDate: null,
      shouldHighlight: false,
      allowVoting: false,
      debateSettings: {
        question: '',
        yesPosition: '',
        noPosition: '',
        votingEnabled: true,
        voting_ends_at: null
      }
    }
  });

  const { formState: { isDirty, isSubmitting } } = form;
  const { isSaving, handleSaveDraft, handleSubmit: onSubmit } = useDebateArticleSubmission({
    form,
    articleId
  });

  // Update form with category data after resolution (matching reference document pattern)
  useEffect(() => {
    if (isNewArticle && categoryData?.id) {
      console.log('Setting categoryId in debate form:', {
        categoryId: categoryData.id,
        categoryName: categoryData.name
      });
      form.setValue('categoryId', categoryData.id);
      form.trigger('categoryId'); // Clear validation errors
    }
  }, [categoryData, isNewArticle, form]);

  // Show loading state while resolving category for new articles
  if (isNewArticle && isCategoryLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Preparing debate form...</p>
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

  // Form submission with React Hook Form's handleSubmit for validation (matching reference document pattern)
  const handleFormSubmit = form.handleSubmit(async (data: DebateArticleFormData) => {
    console.log('Debate form submission with validated data:', {
      title: data.title,
      categoryId: data.categoryId,
      articleType: data.articleType,
      debateSettings: data.debateSettings
    });
    
    // Additional validation for required fields
    if (!data.categoryId) {
      form.setError('categoryId', { type: 'required', message: 'Category is required' });
      return;
    }
    
    if (!data.title.trim()) {
      form.setError('title', { type: 'required', message: 'Title is required' });
      return;
    }
    
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Error in debate form submission:', error);
      // The submission hook handles error display
    }
  });

  const handleSaveDraftClick = async () => {
    console.log('Save draft clicked, current categoryId:', form.getValues('categoryId'));
    await handleSaveDraft();
  };

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <DebateFormContent 
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
      </form>
    </Form>
  );
};

export default DebateArticleForm;
