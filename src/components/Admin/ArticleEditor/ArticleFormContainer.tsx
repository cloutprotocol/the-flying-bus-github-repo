
import React from 'react';
import { Form } from '@/components/ui/form';
import ArticleFormContent from './Layout/ArticleFormContent';
import EnhancedFormActions from './EnhancedFormActions';
import ArticleEditorDebugPanel from './ArticleEditorDebugPanel';
import { useArticleFormLogic } from './hooks/useArticleFormLogic';
import { useArticleFormSubmission } from './hooks/useArticleFormSubmission';
import { useCategoryLookup } from './hooks/useCategoryLookup';
import { ArticleFormSchemaType } from '@/utils/validation/articleFormSchema';

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

  // Initialize form logic with proper typing
  const form = useArticleFormLogic({ articleType });
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
};

export default ArticleFormContainer;
