
import { useEffect, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const categoryLookupAttempted = useRef(false);
  const currentCategoryId = form.watch('categoryId');
  
  // Set category ID based on categorySlug or categoryName when available
  useEffect(() => {
    // Guard: Only run for new articles with category info and no existing categoryId
    if (!isNewArticle || (!categorySlug && !categoryName) || currentCategoryId || categoryLookupAttempted.current) {
      return;
    }

    // Mark that we've attempted the lookup to prevent re-runs
    categoryLookupAttempted.current = true;
    
    const getCategoryId = async () => {
      try {
        logger.info(LogSource.EDITOR, 'Starting category lookup', { 
          categorySlug,
          categoryName
        });
        
        let categoryData = null;
        
        // First try by slug if available (more reliable)
        if (categorySlug) {
          const { data, error: slugError } = await supabase
            .from('categories')
            .select('id, name, slug')
            .eq('slug', categorySlug)
            .maybeSingle();
          
          if (data && !slugError) {
            logger.info(LogSource.EDITOR, 'Category found by slug', { 
              categoryId: data.id, 
              foundName: data.name 
            });
            categoryData = data;
          } else if (slugError) {
            logger.warn(LogSource.EDITOR, 'Slug lookup failed', { error: slugError });
          }
        }
        
        // Fallback to name lookup if slug lookup failed or no slug provided
        if (!categoryData && categoryName) {
          const { data, error: nameError } = await supabase
            .from('categories')
            .select('id, name, slug')
            .eq('name', categoryName)
            .maybeSingle();
          
          if (data && !nameError) {
            logger.info(LogSource.EDITOR, 'Category found by name', { 
              categoryId: data.id, 
              foundName: data.name 
            });
            categoryData = data;
          } else if (nameError) {
            logger.warn(LogSource.EDITOR, 'Name lookup failed', { error: nameError });
          }
        }
        
        if (categoryData) {
          // Set the category ID in form with validation trigger
          form.setValue('categoryId', categoryData.id, { 
            shouldDirty: true, 
            shouldValidate: true 
          });
          
          logger.info(LogSource.EDITOR, 'Category ID set successfully', { 
            categoryId: categoryData.id,
            categoryName: categoryData.name
          });
        } else {
          // Show user-friendly error
          const searchTerm = categorySlug || categoryName;
          const errorMessage = `Could not find category "${searchTerm}". Please select a category manually.`;
          
          logger.error(LogSource.EDITOR, 'Category lookup failed', {
            categorySlug,
            categoryName,
            searchTerm
          });
          
          toast({
            title: "Category Not Found",
            description: errorMessage,
            variant: "destructive"
          });
        }
      } catch (err) {
        logger.error(LogSource.EDITOR, 'Exception during category lookup', {
          error: err,
          categorySlug,
          categoryName
        });
        
        toast({
          title: "Error",
          description: "Failed to load the selected category. Please select a category manually.",
          variant: "destructive"
        });
      }
    };
    
    getCategoryId();
  }, [categorySlug, categoryName, isNewArticle, currentCategoryId, form, toast]);

  return {
    effectiveArticleId: articleId || draftId
  };
};
