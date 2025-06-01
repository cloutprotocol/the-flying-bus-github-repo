
import { useState, useEffect } from 'react';
import { getCategoryBySlug } from '@/utils/category/categoryIdMapper';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface CategoryData {
  id: string;
  name: string;
  slug: string;
}

interface UseCategoryResolverResult {
  categoryData: CategoryData | null;
  isLoading: boolean;
  error: string | null;
}

export const useCategoryResolver = (
  categorySlug?: string,
  categoryName?: string
): UseCategoryResolverResult => {
  const [categoryData, setCategoryData] = useState<CategoryData | null>(null);
  const [isLoading, setIsLoading] = useState(!!categorySlug);
  const [error, setError] = useState<string | null>(null);

  console.log('useCategoryResolver: Hook called with:', {
    categorySlug,
    categoryName,
    shouldResolve: !!categorySlug
  });

  useEffect(() => {
    const resolveCategory = async () => {
      console.log('useCategoryResolver: Starting resolution process');
      
      // Defensive check: if no category info provided, don't attempt resolution
      if (!categorySlug && !categoryName) {
        console.log('useCategoryResolver: No category info provided, skipping resolution');
        setIsLoading(false);
        setError(null);
        return;
      }

      // If only categoryName but no slug, that's unusual but not an error
      if (!categorySlug && categoryName) {
        console.warn('useCategoryResolver: Category name provided without slug:', { categoryName });
        logger.warn(LogSource.EDITOR, 'Category name provided without slug', { categoryName });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        console.log('useCategoryResolver: Resolving category with slug:', categorySlug);
        logger.info(LogSource.EDITOR, 'Resolving category before form initialization', {
          categorySlug,
          categoryName
        });

        const category = await getCategoryBySlug(categorySlug);
        
        console.log('useCategoryResolver: Category resolution result:', {
          found: !!category,
          categoryData: category
        });
        
        if (category) {
          setCategoryData(category);
          console.log('useCategoryResolver: Category resolved successfully:', {
            categoryId: category.id,
            categoryName: category.name,
            categorySlug: category.slug
          });
          logger.info(LogSource.EDITOR, 'Category resolved successfully', {
            categoryId: category.id,
            categoryName: category.name
          });
        } else {
          const errorMsg = `Category not found for slug: ${categorySlug}`;
          console.error('useCategoryResolver:', errorMsg);
          setError(errorMsg);
          logger.error(LogSource.EDITOR, errorMsg);
        }
      } catch (err) {
        const errorMsg = `Failed to resolve category: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error('useCategoryResolver:', errorMsg, err);
        setError(errorMsg);
        logger.error(LogSource.EDITOR, errorMsg, err);
      } finally {
        setIsLoading(false);
        console.log('useCategoryResolver: Resolution process completed');
      }
    };

    resolveCategory();
  }, [categorySlug, categoryName]);

  const result = { categoryData, isLoading, error };
  console.log('useCategoryResolver: Returning result:', result);

  return result;
};
