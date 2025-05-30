
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
  const [formError, setFormError] = useState<string | null>(null);
  const [isFormReady, setIsFormReady] = useState(false);
  const { addDebugStep, debugSteps } = useArticleDebug();
  
  console.log('ArticleForm: Rendering with props:', {
    articleId,
    articleType,
    isNewArticle,
    categorySlug,
    categoryName
  });

  // Initialize form with error handling
  let formData, updateField, isSubmitting, isSaving, hasUnsavedChanges, saveDraft, submitForReview, validateForm;
  
  try {
    const formHook = useOptimizedArticleForm({
      articleType: articleType as any,
      categoryId: '', // Will be set by useArticleFormState
      storyboardEpisodes: articleType === 'storyboard' ? [] : undefined
    });
    
    formData = formHook.formData;
    updateField = formHook.updateField;
    isSubmitting = formHook.isSubmitting;
    isSaving = formHook.isSaving;
    hasUnsavedChanges = formHook.hasUnsavedChanges;
    saveDraft = formHook.saveDraft;
    submitForReview = formHook.submitForReview;
    validateForm = formHook.validateForm;
    
    console.log('ArticleForm: Form hook initialized successfully');
  } catch (error) {
    console.error('ArticleForm: Error initializing form hook:', error);
    setFormError(error instanceof Error ? error.message : 'Failed to initialize form');
    
    // Provide fallback values
    formData = {
      title: '',
      content: '',
      excerpt: '',
      imageUrl: '',
      categoryId: '',
      slug: '',
      articleType: articleType as any,
      storyboardEpisodes: []
    };
    updateField = () => {};
    isSubmitting = false;
    isSaving = false;
    hasUnsavedChanges = false;
    saveDraft = async () => false;
    submitForReview = async () => false;
    validateForm = () => [];
  }

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

  // Use extracted state management with error handling
  let effectiveArticleId;
  try {
    const stateHook = useArticleFormState({
      formData,
      updateField,
      categorySlug,
      categoryName,
      isNewArticle,
      articleId,
      articleType
    });
    effectiveArticleId = stateHook.effectiveArticleId;
    console.log('ArticleForm: State hook initialized successfully');
  } catch (error) {
    console.error('ArticleForm: Error initializing state hook:', error);
    effectiveArticleId = articleId;
  }

  // Use extracted validation logic
  let validateFormBeforeSubmit;
  try {
    const validationHook = useArticleFormValidation(formData);
    validateFormBeforeSubmit = validationHook.validateFormBeforeSubmit;
    console.log('ArticleForm: Validation hook initialized successfully');
  } catch (error) {
    console.error('ArticleForm: Error initializing validation hook:', error);
    validateFormBeforeSubmit = () => [];
  }

  // Use extracted submission logic
  let handleSubmitButtonClick;
  try {
    const submissionHook = useArticleFormSubmission({
      formData,
      submitForReview,
      validateForm,
      categorySlug
    });
    handleSubmitButtonClick = submissionHook.handleSubmitButtonClick;
    console.log('ArticleForm: Submission hook initialized successfully');
  } catch (error) {
    console.error('ArticleForm: Error initializing submission hook:', error);
    handleSubmitButtonClick = async () => {};
  }

  // Mark form as ready after all hooks are initialized
  useEffect(() => {
    if (!formError) {
      console.log('ArticleForm: All hooks initialized, marking form as ready');
      setIsFormReady(true);
    }
  }, [formError]);

  // Wrap saveDraft to return Promise<void>
  const handleSaveDraft = async (): Promise<void> => {
    try {
      await saveDraft();
    } catch (error) {
      console.error('ArticleForm: Error saving draft:', error);
      setFormError(error instanceof Error ? error.message : 'Failed to save draft');
    }
  };

  // Wrap submitForReview to return Promise<void>
  const handleSubmit = async (): Promise<void> => {
    try {
      await handleSubmitButtonClick();
    } catch (error) {
      console.error('ArticleForm: Error submitting:', error);
      setFormError(error instanceof Error ? error.message : 'Failed to submit article');
    }
  };

  // Show error state if there's a form error
  if (formError) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Form Error: {formError}
          </AlertDescription>
        </Alert>
        <button 
          onClick={() => {
            setFormError(null);
            window.location.reload();
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded"
        >
          Retry
        </button>
      </div>
    );
  }

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
