
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useZodForm } from '@/hooks/useZodForm';
import { createArticleSchema } from '@/utils/validation/articleValidation';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { useArticleDebug } from '@/hooks/useArticleDebug';
import useArticleRevisions from '@/hooks/useArticleRevisions';
import { useOptimizedArticleForm } from '@/hooks/article/useOptimizedArticleForm';
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
  const { addDebugStep, updateLastStep, debugSteps } = useArticleDebug();
  const { toast } = useToast();
  
  const { revisions, isLoading: revisionsLoading } = useArticleRevisions(
    !isNewArticle ? articleId : undefined
  );
  
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
  } = useOptimizedArticleForm(form, articleId, articleType, isNewArticle);

  // Log initial values for debugging
  useEffect(() => {
    console.log("ArticleForm initialized", { 
      articleId,
      draftId,
      articleType,
      isNewArticle,
      hasContent: !!content,
      contentLength: content?.length || 0
    });
  }, [articleId, draftId, articleType, isNewArticle, content]);

  // Form submission handler
  const onSubmit = async (data: any) => {
    try {
      console.log("Form submitted with data:", { 
        ...data, 
        content, 
        contentLength: content?.length || 0 
      });
      
      addDebugStep('Form validation passed', {
        formData: {
          title: data.title,
          excerpt: data.excerpt?.substring(0, 20) + '...',
          articleType: data.articleType,
          categoryId: data.categoryId
        }
      });
      
      await handleSubmit(data);
      
    } catch (error) {
      console.error("Form submission error:", error);
      updateLastStep('error', { error: String(error) });
      logger.error(LogSource.EDITOR, 'Article submission failed', error);
      toast({
        title: 'Error',
        description: 'Failed to submit article for review. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const effectiveArticleId = articleId || draftId;

  // Fix: Update handleSubmitButtonClick to return a Promise
  const handleSubmitButtonClick = async (): Promise<void> => {
    console.log("Submit button click handler", { 
      formValues: form.getValues(),
      content,
      contentLength: content?.length || 0
    });
    return form.handleSubmit(onSubmit)();
  };

  return (
    <ArticleFormLayout 
      debugSteps={debugSteps}
      onSubmit={form.handleSubmit(onSubmit)}
      form={form}
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
