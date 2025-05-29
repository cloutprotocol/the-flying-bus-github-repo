
import { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { supabase } from '@/integrations/supabase/client';

interface ArticleFormStateProps {
  form: UseFormReturn<any>;
  categorySlug?: string;
  categoryName?: string;
  isNewArticle: boolean;
  articleId?: string;
  draftId?: string;
  articleType: string;
}

export const useArticleFormState = ({
  form,
  categorySlug,
  categoryName,
  isNewArticle,
  articleId,
  draftId,
  articleType
}: ArticleFormStateProps) => {
  
  // Set category ID based on categoryName when available
  useEffect(() => {
    if (categoryName && isNewArticle) {
      const getCategoryIdByName = async () => {
        try {
          const { data, error } = await supabase
            .from('categories')
            .select('id')
            .eq('name', categoryName)
            .single();
          
          if (error) {
            logger.error(LogSource.EDITOR, 'Error fetching category by name', error);
            return;
          }
          
          if (data) {
            form.setValue('categoryId', data.id);
            logger.info(LogSource.EDITOR, 'Category ID set from selection', { 
              categoryName,
              categoryId: data.id
            });
          }
        } catch (err) {
          logger.error(LogSource.EDITOR, 'Exception fetching category', err);
        }
      };
      
      getCategoryIdByName();
    }
  }, [categoryName, isNewArticle, form]);

  // Performance logging
  useEffect(() => {
    console.log("ArticleForm render performance", { 
      time: new Date().toISOString(),
      articleId,
      draftId,
      articleType,
      isNewArticle,
      categorySlug,
      categoryName
    });
  }, [articleId, draftId, articleType, isNewArticle, categorySlug, categoryName]);

  return {
    effectiveArticleId: articleId || draftId
  };
};
