
import { useEffect, useRef, useState } from 'react';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ArticleFormStateProps {
  formData: ArticleFormData;
  updateField: (field: keyof ArticleFormData, value: any) => void;
  categorySlug?: string;
  categoryName?: string;
  isNewArticle: boolean;
  articleId?: string;
  articleType: string;
}

export const useArticleFormState = ({
  formData,
  updateField,
  categorySlug,
  categoryName,
  isNewArticle,
  articleId,
  articleType
}: ArticleFormStateProps) => {
  const { toast } = useToast();
  const categoryLookupAttempted = useRef(false);
  const [isLookingUpCategory, setIsLookingUpCategory] = useState(false);
  const currentCategoryId = formData.categoryId;
  
  console.log('ArticleFormState: Hook called with:', {
    categorySlug,
    categoryName,
    isNewArticle,
    currentCategoryId,
    lookupAttempted: categoryLookupAttempted.current
  });
  
  // Set category ID based on categorySlug or categoryName when available
  useEffect(() => {
    // Guard: Only run for new articles with category info and no existing categoryId
    if (!isNewArticle || (!categorySlug && !categoryName) || currentCategoryId || categoryLookupAttempted.current) {
      console.log('ArticleFormState: Skipping category lookup:', {
        isNewArticle,
        hasCategoryInfo: !!(categorySlug || categoryName),
        currentCategoryId,
        lookupAttempted: categoryLookupAttempted.current
      });
      return;
    }

    // Mark that we've attempted the lookup to prevent re-runs
    categoryLookupAttempted.current = true;
    setIsLookingUpCategory(true);
    
    const getCategoryId = async () => {
      try {
        logger.info(LogSource.EDITOR, 'Starting category lookup', { 
          categorySlug,
          categoryName
        });
        
        console.log('ArticleFormState: Looking up category...', { categorySlug, categoryName });
        
        let categoryData = null;
        
        // First try by slug if available (more reliable)
        if (categorySlug) {
          console.log('ArticleFormState: Trying lookup by slug:', categorySlug);
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
            console.log('ArticleFormState: Category found by slug:', data);
            categoryData = data;
          } else if (slugError) {
            logger.warn(LogSource.EDITOR, 'Slug lookup failed', { error: slugError });
            console.warn('ArticleFormState: Slug lookup failed:', slugError);
          } else {
            console.log('ArticleFormState: No category found with slug:', categorySlug);
          }
        }
        
        // Fallback to name lookup if slug lookup failed or no slug provided
        if (!categoryData && categoryName) {
          console.log('ArticleFormState: Trying lookup by name:', categoryName);
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
            console.log('ArticleFormState: Category found by name:', data);
            categoryData = data;
          } else if (nameError) {
            logger.warn(LogSource.EDITOR, 'Name lookup failed', { error: nameError });
            console.warn('ArticleFormState: Name lookup failed:', nameError);
          } else {
            console.log('ArticleFormState: No category found with name:', categoryName);
          }
        }
        
        if (categoryData) {
          // Set the category ID in form
          console.log('ArticleFormState: Setting category ID:', categoryData.id);
          updateField('categoryId', categoryData.id);
          
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
          
          console.error('ArticleFormState: Category lookup failed for:', searchTerm);
          
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
        
        console.error('ArticleFormState: Exception during category lookup:', err);
        
        toast({
          title: "Error",
          description: "Failed to load the selected category. Please select a category manually.",
          variant: "destructive"
        });
      } finally {
        setIsLookingUpCategory(false);
      }
    };
    
    getCategoryId();
  }, [categorySlug, categoryName, isNewArticle, currentCategoryId, updateField, toast]);

  return {
    effectiveArticleId: articleId || formData.id,
    isLookingUpCategory
  };
};
