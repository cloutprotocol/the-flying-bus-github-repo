
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
  
  // Set category ID based on categoryName when available - make this synchronous for form initialization
  useEffect(() => {
    if (categoryName && isNewArticle) {
      const getCategoryIdByName = async () => {
        try {
          logger.info(LogSource.EDITOR, 'Fetching category ID for pre-selected category', { 
            categoryName,
            timing: 'before_fetch'
          });
          
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
            // Set the category ID in form and mark as dirty to ensure validation sees it
            form.setValue('categoryId', data.id, { shouldDirty: true, shouldValidate: false });
            
            logger.info(LogSource.EDITOR, 'Category ID set successfully from modal selection', { 
              categoryName,
              categoryId: data.id,
              timing: 'after_set',
              formValue: form.getValues('categoryId')
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
    logger.debug(LogSource.EDITOR, "ArticleForm render performance", { 
      time: new Date().toISOString(),
      articleId,
      draftId,
      articleType,
      isNewArticle,
      categorySlug,
      categoryName,
      currentCategoryId: form.getValues('categoryId')
    });
  }, [articleId, draftId, articleType, isNewArticle, categorySlug, categoryName, form]);

  return {
    effectiveArticleId: articleId || draftId
  };
};
