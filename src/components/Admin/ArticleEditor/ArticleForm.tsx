
import React from 'react';
import { useArticleFormLogic } from '@/hooks/article/useArticleFormLogic';
import SimpleArticleFormContent from './Layout/SimpleArticleFormContent';
import EnhancedFormActions from './EnhancedFormActions';
import ArticleEditorDebugPanel from './ArticleEditorDebugPanel';
import CategoryLookup from './CategoryLookup';

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
  const {
    formData,
    setFormData,
    updateField,
    isSubmitting,
    isSaving,
    hasUnsavedChanges,
    handleSaveDraft,
    handleSubmit
  } = useArticleFormLogic(articleId, articleType);

  console.log('ArticleForm: Rendering with props:', {
    articleId,
    articleType,
    isNewArticle,
    categorySlug,
    categoryName,
    formData
  });

  return (
    <div className="space-y-6">
      <CategoryLookup 
        categorySlug={categorySlug}
        categoryName={categoryName}
        isNewArticle={isNewArticle}
        formData={formData}
        setFormData={setFormData}
      />
      
      <ArticleEditorDebugPanel
        formData={formData}
        isSubmitting={isSubmitting}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        effectiveArticleId={articleId || formData.id}
        categorySlug={categorySlug}
        categoryName={categoryName}
        isNewArticle={isNewArticle}
      />
      
      <SimpleArticleFormContent 
        formData={formData}
        onChange={updateField}
        isSubmitting={isSubmitting}
      />
      
      <EnhancedFormActions 
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        onViewRevisions={undefined}
        isSubmitting={isSubmitting}
        isDirty={hasUnsavedChanges}
        isSaving={isSaving}
        saveStatus={hasUnsavedChanges ? 'idle' : 'saved'}
        hasRevisions={false}
        form={null}
        content={formData.content}
      />
    </div>
  );
};

export default ArticleForm;
