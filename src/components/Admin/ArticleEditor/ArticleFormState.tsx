
import { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface ArticleFormStateProps {
  form: UseFormReturn<any>;
  categorySlug?: string;
  isNewArticle: boolean;
  articleId?: string;
  draftId?: string;
  articleType: string;
}

export const useArticleFormState = ({
  form,
  categorySlug,
  isNewArticle,
  articleId,
  draftId,
  articleType
}: ArticleFormStateProps) => {
  
  // Set category ID based on categorySlug when available
  useEffect(() => {
    if (categorySlug && isNewArticle) {
      // In a real implementation, you'd fetch the category ID from the database
      // For now, we'll use a placeholder approach
      const getCategoryIdBySlug = async () => {
        // This would normally be a Supabase query to get category ID by slug
        // form.setValue('categoryId', categoryId);
        logger.info(LogSource.EDITOR, 'Category set from selection', { 
          categorySlug 
        });
      };
      
      getCategoryIdBySlug();
    }
  }, [categorySlug, isNewArticle, form]);

  // Performance logging
  useEffect(() => {
    console.log("ArticleForm render performance", { 
      time: new Date().toISOString(),
      articleId,
      draftId,
      articleType,
      isNewArticle,
      categorySlug
    });
  }, [articleId, draftId, articleType, isNewArticle, categorySlug]);

  return {
    effectiveArticleId: articleId || draftId
  };
};
