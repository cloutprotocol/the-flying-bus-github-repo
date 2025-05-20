
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useZodForm } from '@/hooks/useZodForm';
import { createArticleSchema } from '@/utils/validation/articleValidation';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { useArticleDebug } from '@/hooks/useArticleDebug';
import useArticleRevisions from '@/hooks/useArticleRevisions';
import { useArticleForm } from '@/hooks/useArticleForm';
import FormActions from './FormActions';
import ArticleFormLayout from './Layout/ArticleFormLayout';
import ArticleFormContent from './Layout/ArticleFormContent';
import RevisionsDialog from './Revisions/RevisionsDialog';

interface ArticleFormProps {
  articleId?: string;
  articleType: string;
  isNewArticle: boolean;
}

const ArticleForm: React.FC<ArticleFormProps> = ({ 
  articleId, 
  articleType = 'standard',
  isNewArticle = true 
}) => {
  const [showRevisions, setShowRevisions] = useState(false);
  const { addDebugStep } = useArticleDebug();
  const { toast } = useToast();
  
  const { revisions, isLoading: revisionsLoading } = useArticleRevisions(
    !isNewArticle ? articleId : undefined
  );
  
  // Initialize form with optimized validation (reduced validation frequency)
  const form = useZodForm({
    schema: createArticleSchema,
    defaultValues: {
      title: '',
      excerpt: '',
      categoryId: '',
      content: '',
      imageUrl: '',
      readingLevel: 'Intermediate',
      status: 'draft',
      articleType: articleType as any,
      videoUrl: '',
    },
    mode: 'onSubmit', // Only validate on submit to reduce performance overhead
    logContext: 'article_form'
  });

  // Use our optimized form hook
  const { 
    content, 
    setContent, 
    saveStatus,
    lastSaved,
    isSubmitting,
    isSaving,
    handleSubmit,
    handleSaveDraft,
    draftId
  } = useArticleForm(form, articleId, articleType, isNewArticle);

  // Performance logging
  useEffect(() => {
    console.log("ArticleForm render performance", { 
      time: new Date().toISOString(),
      articleId,
      draftId,
      articleType,
      isNewArticle
    });
  }, [articleId, draftId, articleType, isNewArticle]);

  // Form validation function
  const validateFormBeforeSubmit = () => {
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

  // Form submission handler with performance optimizations
  const onSubmit = async (data: any) => {
    try {
      // Only log minimal data to reduce overhead
      addDebugStep('Form validation passed', {
        hasTitle: !!data.title,
        hasCategoryId: !!data.categoryId,
        articleType: data.articleType,
      });
      
      await handleSubmit({
        ...data,
        content,
        isDirty: form.formState.isDirty,
        id: draftId || articleId
      });
      
    } catch (error) {
      console.error("Form submission error:", error);
      logger.error(LogSource.EDITOR, 'Article submission failed', error);
      toast({
        title: 'Error',
        description: 'Failed to submit article for review. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const effectiveArticleId = articleId || draftId;

  // Handle submit button click with optimized validation
  const handleSubmitButtonClick = async (): Promise<void> => {
    // Skip validation if form is invalid to reduce processing
    if (!form.formState.isValid && !validateFormBeforeSubmit().isValid) {
      return Promise.resolve();
    }
    
    return form.handleSubmit(onSubmit)();
  };

  return (
    <ArticleFormLayout 
      form={form}
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <ArticleFormContent 
        form={form}
        content={content}
        setContent={setContent}
        articleType={articleType}
        isNewArticle={isNewArticle}
        lastSaved={lastSaved}
      />
      
      <FormActions 
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmitButtonClick}
        onViewRevisions={!isNewArticle && revisions.length > 0 ? () => setShowRevisions(true) : undefined}
        isSubmitting={isSubmitting}
        isDirty={form.formState.isDirty || content !== ''}
        isSaving={isSaving}
        saveStatus={saveStatus}
        hasRevisions={!isNewArticle && revisions.length > 0}
        form={form}
        content={content}
        validateForm={validateFormBeforeSubmit}
      />

      <RevisionsDialog 
        open={showRevisions}
        onOpenChange={setShowRevisions}
        revisions={revisions}
        isLoading={revisionsLoading}
        articleId={effectiveArticleId || ''}
        onRestoreRevision={(content) => {
          setContent(content);
          form.setValue('content', content, { shouldDirty: true });
        }}
      />
    </ArticleFormLayout>
  );
};

export default ArticleForm;
