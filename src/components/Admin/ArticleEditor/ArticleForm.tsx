
import React, { useState, useEffect } from 'react';
import { useOptimizedArticleForm } from '@/hooks/article/useOptimizedArticleForm';
import { useArticleDebug } from '@/hooks/useArticleDebug';
import useArticleRevisions from '@/hooks/useArticleRevisions';
import { useArticleFormState } from './ArticleFormState';
import { useArticleFormValidation } from './ArticleFormValidation';
import { useArticleFormSubmission } from './ArticleFormSubmission';
import ArticleFormContent from './Layout/ArticleFormContent';
import RevisionsDialog from './Revisions/RevisionsDialog';
import EnhancedFormActions from './EnhancedFormActions';
import ArticleEditorDebugPanel from './ArticleEditorDebugPanel';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

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
  const [isFormReady, setIsFormReady] = useState(false);
  const { addDebugStep } = useArticleDebug();
  
  console.log('ArticleForm: Rendering with props:', {
    articleId,
    articleType,
    isNewArticle,
    categorySlug,
    categoryName
  });

  // Initialize form hook
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

  // Mark form as ready after hooks are initialized
  useEffect(() => {
    console.log('ArticleForm: Marking form as ready');
    setIsFormReady(true);
  }, []);

  // Wrap saveDraft to return Promise<void>
  const handleSaveDraft = async (): Promise<void> => {
    try {
      await saveDraft();
    } catch (error) {
      console.error('ArticleForm: Error saving draft:', error);
    }
  };

  // Wrap submitForReview to return Promise<void>
  const handleSubmit = async (): Promise<void> => {
    try {
      await handleSubmitButtonClick();
    } catch (error) {
      console.error('ArticleForm: Error submitting:', error);
    }
  };

  // Show loading state while form is initializing
  if (!isFormReady) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading article form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ArticleEditorDebugPanel
        formData={formData}
        isSubmitting={isSubmitting}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        effectiveArticleId={effectiveArticleId}
        categorySlug={categorySlug}
        categoryName={categoryName}
        isNewArticle={isNewArticle}
      />
      
      <ArticleFormContent 
        formData={formData}
        onChange={updateField}
        isSubmitting={isSubmitting}
      />
      
      <EnhancedFormActions 
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
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
