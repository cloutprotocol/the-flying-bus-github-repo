
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { videoArticleSchema, VideoArticleFormData } from '@/utils/validation/separateFormSchemas';
import { useVideoArticleSubmission } from '../hooks/useVideoArticleSubmission';
import { useCategoryResolver } from '@/hooks/article/useCategoryResolver';
import VideoFormContent from './sections/VideoFormContent';
import SimpleFormActions from '../SimpleFormActions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

interface VideoArticleFormProps {
  articleId?: string;
  isNewArticle: boolean;
  categorySlug?: string;
  categoryName?: string;
}

const VideoArticleForm: React.FC<VideoArticleFormProps> = ({
  articleId,
  isNewArticle,
  categorySlug,
  categoryName
}) => {
  console.log('VideoArticleForm: Component rendered with props:', {
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

  // Don't initialize the form until we have category data for new articles
  const shouldInitializeForm = !isNewArticle || (isNewArticle && categoryData);

  const form = useForm<VideoArticleFormData>({
    resolver: zodResolver(videoArticleSchema),
    defaultValues: {
      title: '',
      content: '',
      excerpt: '',
      imageUrl: '',
      categoryId: '',
      slug: '',
      articleType: 'video',
      videoUrl: '',
      status: 'draft',
      publishDate: null,
      shouldHighlight: false,
      allowVoting: false
    }
  });

  // Update form with resolved category data when it becomes available
  React.useEffect(() => {
    if (isNewArticle && categoryData?.id) {
      console.log('VideoArticleForm: Setting categoryId from resolved data:', categoryData.id);
      form.setValue('categoryId', categoryData.id);
    }
  }, [isNewArticle, categoryData?.id, form]);

  const { handleSubmit, formState: { isDirty, isSubmitting } } = form;
  const { isSaving, handleSaveDraft, handleSubmit: onSubmit } = useVideoArticleSubmission({
    form,
    articleId
  });

  console.log('VideoArticleForm: Hooks initialized:', {
    isSaving,
    hasHandleSaveDraft: typeof handleSaveDraft,
    hasOnSubmit: typeof onSubmit,
    isSubmitting,
    isDirty
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
  const handleFormSubmit = async (data: VideoArticleFormData) => {
    console.log('🎉 VideoArticleForm: handleFormSubmit called with data:', data);
    
    // Validate that we have a categoryId before submitting
    if (!data.categoryId) {
      console.error('❌ Cannot submit video article without categoryId');
      alert('❌ Cannot submit video article without categoryId');
      return;
    }
    
    // Validate video URL
    if (!data.videoUrl || data.videoUrl.trim() === '') {
      console.error('❌ Cannot submit video article without videoUrl');
      alert('❌ Cannot submit video article without videoUrl');
      return;
    }
    
    console.log('✅ VideoArticleForm: Validation passed, submitting video article with data:', {
      title: data.title,
      categoryId: data.categoryId,
      articleType: data.articleType,
      videoUrl: data.videoUrl
    });
    
    console.log('🚀 VideoArticleForm: About to call onSubmit');
    await onSubmit(data);
    console.log('✅ VideoArticleForm: onSubmit completed');
  };

  // Wrapper for SimpleFormActions that triggers form submission
  const handleSubmitForActions = async (e?: React.FormEvent) => {
    console.log('🚀 VideoArticleForm: handleSubmitForActions called with event:', e, Date.now());
    if (e) {
      e.preventDefault();
    }
    
    // Get form data and validate manually
    const formValues = form.getValues();
    const formErrors = form.formState.errors;
    console.log('📋 VideoArticleForm: Current form values:', formValues);
    console.log('❌ VideoArticleForm: Current form errors:', JSON.stringify(formErrors, null, 2));
    console.log('✅ VideoArticleForm: Form is valid:', form.formState.isValid);
    
    // Log specific field errors
    Object.keys(formErrors).forEach(field => {
      console.error(`🚨 Validation error in field "${field}":`, formErrors[field]?.message);
    });
    
    // Trigger form validation
    const isValid = await form.trigger();
    console.log('🔍 VideoArticleForm: Manual validation result:', isValid);
    
    if (!isValid) {
      console.error('❌ VideoArticleForm: Form validation failed, not submitting');
      
      // Get fresh errors after validation
      const freshErrors = form.formState.errors;
      console.error('🚨 VideoArticleForm: Fresh validation errors:', JSON.stringify(freshErrors, null, 2));
      
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
    
    console.log('⏳ VideoArticleForm: Form is valid, calling handleFormSubmit directly');
    try {
      await handleFormSubmit(formValues);
      console.log('✅ VideoArticleForm: handleFormSubmit completed');
    } catch (error) {
      console.error('💥 VideoArticleForm: handleFormSubmit error:', error);
    }
  };

  console.log('VideoArticleForm: About to render form with categoryData:', categoryData);
  console.log('VideoArticleForm: Form disabled?', isNewArticle && !categoryData?.id);

  return (
    <Form {...form}>
      <form onSubmit={(e) => {
        e.preventDefault();
        console.log('🔥 VideoArticleForm: Form onSubmit triggered - calling handleSubmitForActions', Date.now());
        handleSubmitForActions(e);
      }} className="space-y-6">
        <VideoFormContent 
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

export default VideoArticleForm;
