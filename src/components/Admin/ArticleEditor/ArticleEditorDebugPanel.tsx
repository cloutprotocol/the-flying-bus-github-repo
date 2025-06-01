
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArticleFormData } from '@/types/ArticleEditorTypes';

interface ArticleEditorDebugPanelProps {
  formData: ArticleFormData;
  isSubmitting: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  effectiveArticleId?: string;
  categorySlug?: string;
  categoryName?: string;
  isNewArticle: boolean;
}

const ArticleEditorDebugPanel: React.FC<ArticleEditorDebugPanelProps> = ({
  formData,
  isSubmitting,
  isSaving,
  hasUnsavedChanges,
  effectiveArticleId,
  categorySlug,
  categoryName,
  isNewArticle
}) => {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="mb-4 border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-yellow-800">Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Badge variant="outline">Article Type: {formData.articleType}</Badge>
          </div>
          <div>
            <Badge variant="outline">Is New: {isNewArticle ? 'Yes' : 'No'}</Badge>
          </div>
          <div>
            <Badge variant="outline">Category ID: {formData.categoryId || 'None'}</Badge>
          </div>
          <div>
            <Badge variant="outline">Category Slug: {categorySlug || 'None'}</Badge>
          </div>
        </div>
        
        <div className="text-yellow-700">
          <div>Title: {formData.title || 'Empty'}</div>
          <div>Content Length: {formData.content?.length || 0}</div>
          <div>Article ID: {effectiveArticleId || 'None'}</div>
          <div>Category Name: {categoryName || 'None'}</div>
        </div>
        
        <div className="flex gap-2">
          {isSubmitting && <Badge className="bg-blue-500">Submitting</Badge>}
          {isSaving && <Badge className="bg-orange-500">Saving</Badge>}
          {hasUnsavedChanges && <Badge className="bg-red-500">Unsaved</Badge>}
        </div>
      </CardContent>
    </Card>
  );
};

export default ArticleEditorDebugPanel;
