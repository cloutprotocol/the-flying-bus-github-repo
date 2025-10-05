
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { storyboardArticleSchema, StoryboardArticleFormData } from '@/utils/validation/separateFormSchemas';
import { useStoryboardArticleSubmission } from '../hooks/useStoryboardArticleSubmission';
import { useCategoryResolver } from '@/hooks/article/useCategoryResolver';
import StoryboardFormContent from './sections/StoryboardFormContent';
import SimpleFormActions from '../SimpleFormActions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

interface StoryboardArticleFormProps {
  articleId?: string;
  isNewArticle: boolean;
  categorySlug?: string;
  categoryName?: string;
}

const StoryboardArticleForm: React.FC<StoryboardArticleFormProps> = ({
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

  const form = useForm<StoryboardArticleFormData>({
    resolver: zodResolver(storyboardArticleSchema),
    defaultValues: {
      title: '',
      content: '',
      excerpt: '',
      imageUrl: '',
      categoryId: '',
      slug: '',
      articleType: 'storyboard',
      status: 'draft',
      publishDate: null,
      shouldHighlight: false,
      allowVoting: false,
      storyboardEpisodes: [{
        title: 'Episode 1',
        description: '',
        videoUrl: '',
        thumbnailUrl: '',
        duration: '',
        number: 1,
        content: ''
      }]
    }
  });

  // Update form with resolved category data when it becomes available
  React.useEffect(() => {
    if (isNewArticle && categoryData?.id) {
      console.log('StoryboardArticleForm: Setting categoryId from resolved data:', categoryData.id);
      form.setValue('categoryId', categoryData.id);
    }
  }, [isNewArticle, categoryData?.id, form]);

  const { handleSubmit, formState: { isDirty, isSubmitting } } = form;
  const { isSaving, handleSaveDraft, handleSubmit: onSubmit } = useStoryboardArticleSubmission({
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

  // Enhanced submit handler with validation
  const handleFormSubmit = async (data: StoryboardArticleFormData) => {
    console.log('🎉 StoryboardArticleForm: handleFormSubmit called with data:', data);
    
    // Validate that we have a categoryId before submitting
    if (!data.categoryId) {
      console.error('❌ Cannot submit storyboard article without categoryId');
      alert('❌ Cannot submit storyboard article without categoryId');
      return;
    }
    
    // Validate episodes
    if (!data.storyboardEpisodes || data.storyboardEpisodes.length === 0) {
      console.error('❌ Cannot submit storyboard article without episodes');
      alert('❌ Cannot submit storyboard article without episodes');
      return;
    }
    
    console.log('✅ StoryboardArticleForm: Validation passed, submitting storyboard article with data:', {
      title: data.title,
      categoryId: data.categoryId,
      articleType: data.articleType,
      episodes: data.storyboardEpisodes?.length
    });
    
    console.log('🚀 StoryboardArticleForm: About to call onSubmit');
    await onSubmit(data);
    console.log('✅ StoryboardArticleForm: onSubmit completed');
  };

  // Wrapper for SimpleFormActions that triggers form submission
  const handleSubmitForActions = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    console.log('🚀 StoryboardArticleForm: handleSubmitForActions called');
    
    // Get form data and validate manually
    const formValues = form.getValues();
    const formErrors = form.formState.errors;
    console.log('📋 StoryboardArticleForm: Current form values:', formValues);
    console.log('❌ StoryboardArticleForm: Current form errors:', JSON.stringify(formErrors, null, 2));
    console.log('✅ StoryboardArticleForm: Form is valid:', form.formState.isValid);
    
    // Log specific field errors
    Object.keys(formErrors).forEach(field => {
      console.error(`🚨 Validation error in field "${field}":`, formErrors[field]?.message);
    });
    
    // Trigger form validation
    const isValid = await form.trigger();
    console.log('🔍 StoryboardArticleForm: Manual validation result:', isValid);
    
    if (!isValid) {
      console.error('❌ StoryboardArticleForm: Form validation failed, not submitting');
      
      // Get fresh errors after validation
      const freshErrors = form.formState.errors;
      console.error('🚨 StoryboardArticleForm: Fresh validation errors:', JSON.stringify(freshErrors, null, 2));
      
      // Show specific field errors
      Object.keys(freshErrors).forEach(field => {
        console.error(`🚨 Field "${field}" error:`, freshErrors[field]?.message);
      });
      
      // Show an alert with the first error
      const firstError = Object.values(freshErrors)[0];
      if (firstError?.message) {
        alert(`Validation Error: ${firstError.message}`);
      }
      
      return;
    }
    
    console.log('⏳ StoryboardArticleForm: Form is valid, calling handleFormSubmit directly');
    try {
      await handleFormSubmit(formValues);
      console.log('✅ StoryboardArticleForm: handleFormSubmit completed');
    } catch (error) {
      console.error('💥 StoryboardArticleForm: handleFormSubmit error:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => {
        e.preventDefault();
        console.log('StoryboardArticleForm: Form onSubmit triggered - calling handleSubmitForActions');
        handleSubmitForActions(e);
      }} className="space-y-6">
        <StoryboardFormContent 
          form={form}
          isSubmitting={isSubmitting}
          isNewArticle={isNewArticle}
          resolvedCategoryData={isNewArticle ? categoryData : undefined}
        />
        
        <SimpleFormActions 
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmitForActions}
          isSubmitting={isSubmitting}
          isDirty={isDirty}
          isSaving={isSaving}
          disabled={isNewArticle && !categoryData?.id}
        />
      </form>
    </Form>
  );
};

export default StoryboardArticleForm;
