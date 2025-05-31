
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolveCategory = async () => {
      // Only proceed if we have a category slug to resolve
      if (!categorySlug) {
        console.log('useCategoryResolver: No categorySlug provided, skipping resolution');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        console.log('useCategoryResolver: Resolving category before form initialization', {
          categorySlug,
          categoryName
        });

        logger.info(LogSource.EDITOR, 'Resolving category before form initialization', {
          categorySlug,
          categoryName
        });

        const category = await getCategoryBySlug(categorySlug);
        
        if (category) {
          setCategoryData(category);
          console.log('useCategoryResolver: Category resolved successfully', {
            categoryId: category.id,
            categoryName: category.name
          });
          logger.info(LogSource.EDITOR, 'Category resolved successfully', {
            categoryId: category.id,
            categoryName: category.name
          });
        } else {
          const errorMsg = `Category not found for slug: ${categorySlug}`;
          setError(errorMsg);
          console.error('useCategoryResolver:', errorMsg);
          logger.error(LogSource.EDITOR, errorMsg);
        }
      } catch (err) {
        const errorMsg = `Failed to resolve category: ${err instanceof Error ? err.message : 'Unknown error'}`;
        setError(errorMsg);
        console.error('useCategoryResolver:', errorMsg, err);
        logger.error(LogSource.EDITOR, errorMsg, err);
      } finally {
        setIsLoading(false);
      }
    };

    resolveCategory();
  }, [categorySlug, categoryName]);

  return { categoryData, isLoading, error };
};
