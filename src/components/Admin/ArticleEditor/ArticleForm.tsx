
import React, { useState } from 'react';
import { useOptimizedArticleForm } from '@/hooks/article/useOptimizedArticleForm';
import { useArticleDebug } from '@/hooks/useArticleDebug';
import useArticleRevisions from '@/hooks/useArticleRevisions';
import { useArticleFormState } from './ArticleFormState';
import { useArticleFormValidation } from './ArticleFormValidation';
import { useArticleFormSubmission } from './ArticleFormSubmission';
import ArticleFormLayout from './Layout/ArticleFormLayout';
import ArticleFormContent from './Layout/ArticleFormContent';
import RevisionsDialog from './Revisions/RevisionsDialog';
import EnhancedFormActions from './EnhancedFormActions';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

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
  
  logger.info(LogSource.EDITOR, 'ArticleForm initializing', {
    isNewArticle,
    categoryName,
    categorySlug,
    articleType,
    hasPreselectedCategory: !!categoryName
  });
  
  // Use the optimized form hook
  const {
    formData,
    updateField,
    isSubmitting,
    isSaving,
    hasUnsavedChanges,
    saveDraft,
    submitForReview,
    validateForm
  } = useOptimizedArticleForm({
    articleType: articleType as any,
    categoryId: '', // Will be set by useArticleFormState
    storyboardEpisodes: articleType === 'storyboard' ? [] : undefined
  });

  // Use extracted state management
  const { effectiveArticleId } = useArticleFormState({
    formData,
    updateField,
    categorySlug,
    categoryName,
    isNewArticle,
    articleId,
    articleType
  });

  // Use extracted validation logic
  const { validateFormBeforeSubmit } = useArticleFormValidation(formData);

  // Use extracted submission logic
  const { handleSubmitButtonClick } = useArticleFormSubmission({
    formData,
    submitForReview,
    validateForm,
    categorySlug
  });

  return (
    <div className="space-y-6">
      <ArticleFormContent 
        formData={formData}
        onChange={updateField}
        isSubmitting={isSubmitting}
      />
      
      <EnhancedFormActions 
        onSaveDraft={saveDraft}
        onSubmit={handleSubmitButtonClick}
        onViewRevisions={!isNewArticle && revisions.length > 0 ? () => setShowRevisions(true) : undefined}
        isSubmitting={isSubmitting}
        isDirty={hasUnsavedChanges}
        isSaving={isSaving}
        saveStatus={hasUnsavedChanges ? 'idle' : 'saved'}
        hasRevisions={!isNewArticle && revisions.length > 0}
        form={null}
        content={formData.content}
      />

      <RevisionsDialog 
        open={showRevisions}
        onOpenChange={setShowRevisions}
        revisions={revisions}
        isLoading={revisionsLoading}
        articleId={effectiveArticleId || ''}
        onRestoreRevision={(content) => {
          updateField('content', content);
        }}
      />
    </div>
  );
};

export default ArticleForm;
