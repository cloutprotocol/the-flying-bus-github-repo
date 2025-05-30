
import { useEffect } from 'react';
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
  
  // Set category ID based on categorySlug or categoryName when available
  useEffect(() => {
    if ((categorySlug || categoryName) && isNewArticle) {
      const getCategoryId = async () => {
        try {
          logger.info(LogSource.EDITOR, 'Starting category lookup', { 
            categorySlug,
            categoryName,
            timing: 'before_fetch'
          });
          
          let categoryData = null;
          let error = null;
          
          // First try by slug if available (more reliable)
          if (categorySlug) {
            logger.info(LogSource.EDITOR, 'Attempting lookup by slug', { categorySlug });
            
            const { data, error: slugError } = await supabase
              .from('categories')
              .select('id, name, slug')
              .eq('slug', categorySlug)
              .maybeSingle();
            
            if (slugError) {
              logger.warn(LogSource.EDITOR, 'Slug lookup failed', { error: slugError, categorySlug });
            } else if (data) {
              logger.info(LogSource.EDITOR, 'Category found by slug', { 
                categoryId: data.id, 
                foundName: data.name,
                foundSlug: data.slug 
              });
              categoryData = data;
            } else {
              logger.warn(LogSource.EDITOR, 'No category found by slug', { categorySlug });
            }
          }
          
          // Fallback to name lookup if slug lookup failed or no slug provided
          if (!categoryData && categoryName) {
            logger.info(LogSource.EDITOR, 'Attempting fallback lookup by name', { categoryName });
            
            const { data, error: nameError } = await supabase
              .from('categories')
              .select('id, name, slug')
              .eq('name', categoryName)
              .maybeSingle();
            
            if (nameError) {
              logger.warn(LogSource.EDITOR, 'Name lookup failed', { error: nameError, categoryName });
              error = nameError;
            } else if (data) {
              logger.info(LogSource.EDITOR, 'Category found by name', { 
                categoryId: data.id, 
                foundName: data.name,
                foundSlug: data.slug 
              });
              categoryData = data;
            } else {
              logger.warn(LogSource.EDITOR, 'No category found by name', { categoryName });
            }
          }
          
          // Additional debugging: List all available categories
          const { data: allCategories } = await supabase
            .from('categories')
            .select('id, name, slug');
          
          logger.info(LogSource.EDITOR, 'Available categories in database', { 
            count: allCategories?.length || 0,
            categories: allCategories?.map(c => ({ name: c.name, slug: c.slug })) || []
          });
          
          if (categoryData) {
            // Set the category ID in form with validation trigger
            form.setValue('categoryId', categoryData.id, { 
              shouldDirty: true, 
              shouldValidate: true 
            });
            
            logger.info(LogSource.EDITOR, 'Category ID set successfully', { 
              categoryId: categoryData.id,
              categoryName: categoryData.name,
              timing: 'after_set',
              formValue: form.getValues('categoryId')
            });
          } else {
            // Show user-friendly error
            const searchTerm = categorySlug || categoryName;
            const errorMessage = `Could not find category "${searchTerm}". Please select a category manually.`;
            
            logger.error(LogSource.EDITOR, 'Category lookup completely failed', {
              categorySlug,
              categoryName,
              searchTerm,
              availableCategories: allCategories?.length || 0
            });
            
            toast({
              title: "Category Not Found",
              description: errorMessage,
              variant: "destructive"
            });
            
            // Don't set any category ID, let user select manually
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
    }
  }, [categorySlug, categoryName, isNewArticle, form, toast]);

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
