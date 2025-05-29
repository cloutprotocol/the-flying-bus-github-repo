
import React, { useState } from 'react';
import { useZodForm } from '@/hooks/useZodForm';
import { createArticleSchema } from '@/utils/validation/articleValidation';
import { useArticleDebug } from '@/hooks/useArticleDebug';
import useArticleRevisions from '@/hooks/useArticleRevisions';
import { useArticleForm } from '@/hooks/useArticleForm';
import { useArticleFormState } from './ArticleFormState';
import { useArticleFormValidation } from './ArticleFormValidation';
import { useArticleFormSubmission } from './ArticleFormSubmission';
import FormActions from './FormActions';
import ArticleFormLayout from './Layout/ArticleFormLayout';
import ArticleFormContent from './Layout/ArticleFormContent';
import RevisionsDialog from './Revisions/RevisionsDialog';

interface ArticleFormProps {
  articleId?: string;
  articleType: string;
  isNewArticle: boolean;
  categorySlug?: string;
  categoryName?: string;
}

const ArticleForm: React.FC<ArticleFormProps> = ({ 
  articleId, 
  articleType = 'standard',
  isNewArticle = true,
  categorySlug,
  categoryName
}) => {
  const [showRevisions, setShowRevisions] = useState(false);
  const { addDebugStep, debugSteps } = useArticleDebug();
  
  const { revisions, isLoading: revisionsLoading } = useArticleRevisions(
    !isNewArticle ? articleId : undefined
  );
  
  // Initialize form with optimized validation and debate-specific defaults
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
      // Add debate-specific default values
      question: '',
      yesPosition: '',
      noPosition: '',
      votingEnabled: true,
      votingEndsAt: ''
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

  // Use extracted state management
  const { effectiveArticleId } = useArticleFormState({
    form,
    categorySlug,
    isNewArticle,
    articleId,
    draftId,
    articleType
  });

  // Use extracted validation logic
  const { validateFormBeforeSubmit } = useArticleFormValidation(form, content);

  // Use extracted submission logic
  const { handleSubmitButtonClick } = useArticleFormSubmission({
    form,
    content,
    handleSubmit,
    draftId,
    articleId,
    categorySlug
  });

  return (
    <ArticleFormLayout 
      form={form}
      onSubmit={form.handleSubmit(async (data) => {
        // Prepare submission data with content
        const submissionData = {
          ...data,
          content,
          isDirty: form.formState.isDirty,
          id: draftId || articleId
        };
        
        await handleSubmit(submissionData);
      })}
      debugSteps={debugSteps}
    >
      <ArticleFormContent 
        form={form}
        content={content}
        setContent={setContent}
        articleType={articleType}
        isNewArticle={isNewArticle}
        lastSaved={lastSaved}
        categorySlug={categorySlug}
        categoryName={categoryName}
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
