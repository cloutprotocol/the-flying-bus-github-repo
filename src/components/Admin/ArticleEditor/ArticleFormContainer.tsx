
import React from 'react';
import { Form } from '@/components/ui/form';
import ArticleFormContent from './Layout/ArticleFormContent';
import EnhancedFormActions from './EnhancedFormActions';
import ArticleEditorDebugPanel from './ArticleEditorDebugPanel';
import { useArticleFormLogic } from './hooks/useArticleFormLogic';
import { useArticleFormSubmission } from './hooks/useArticleFormSubmission';
import { useCategoryLookup } from './hooks/useCategoryLookup';

interface ArticleFormContainerProps {
  articleId?: string;
  articleType: string;
  isNewArticle: boolean;
  categorySlug?: string;
  categoryName?: string;
}

const ArticleFormContainer: React.FC<ArticleFormContainerProps> = ({ 
  articleId, 
  articleType = 'standard',
  isNewArticle = true,
  categorySlug,
  categoryName
}) => {
  console.log('ArticleFormContainer: Rendering with props:', {
    articleId,
    articleType,
    isNewArticle,
    categorySlug,
    categoryName
  });

  try {
    // Initialize form logic with error handling
    const form = useArticleFormLogic({ articleType });
    
    if (!form) {
      console.error('ArticleFormContainer: Failed to initialize form');
      return (
        <div className="p-6 border border-red-200 rounded-lg bg-red-50">
          <p className="text-red-600">Failed to initialize article form. Please try refreshing the page.</p>
        </div>
      );
    }

    const { handleSubmit, watch, formState: { isDirty, isSubmitting } } = form;

    // Initialize submission logic
    const { isSaving, handleSaveDraft, handleSubmit: onSubmit, convertToArticleFormData } = useArticleFormSubmission({
      form,
      articleId
    });

    // Initialize category lookup
    useCategoryLookup({
      form,
      isNewArticle,
      categorySlug,
      categoryName
    });

    console.log('ArticleFormContainer: All hooks initialized successfully');

    return (
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <ArticleEditorDebugPanel
            formData={convertToArticleFormData(form.getValues())}
            isSubmitting={isSubmitting}
            isSaving={isSaving}
            hasUnsavedChanges={isDirty}
            effectiveArticleId={articleId}
            categorySlug={categorySlug}
            categoryName={categoryName}
            isNewArticle={isNewArticle}
          />
          
          <ArticleFormContent 
            form={form}
            isSubmitting={isSubmitting}
            preselectedCategoryName={categoryName}
          />
          
          <EnhancedFormActions 
            onSaveDraft={handleSaveDraft}
            onSubmit={handleSubmit(onSubmit)}
            onViewRevisions={undefined}
            isSubmitting={isSubmitting}
            isDirty={isDirty}
            isSaving={isSaving}
            saveStatus={isDirty ? 'idle' : 'saved'}
            hasRevisions={false}
            form={form}
            content={watch('content')}
          />
        </form>
      </Form>
    );
  } catch (error) {
    console.error('ArticleFormContainer: Exception during initialization:', error);
    return (
      <div className="p-6 border border-red-200 rounded-lg bg-red-50">
        <h3 className="font-medium text-red-600 mb-2">Form Initialization Error</h3>
        <p className="text-red-600 text-sm mb-4">
          There was an error setting up the article form. This might be due to a validation or configuration issue.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Refresh Page
        </button>
      </div>
    );
  }
};

export default ArticleFormContainer;
