
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

  useEffect(() => {
    const resolveCategory = async () => {
      // Defensive check: if no category info provided, don't attempt resolution
      if (!categorySlug && !categoryName) {
        setIsLoading(false);
        setError(null);
        return;
      }

      // If only categoryName but no slug, that's unusual but not an error
      if (!categorySlug && categoryName) {
        logger.warn(LogSource.EDITOR, 'Category name provided without slug', { categoryName });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        logger.info(LogSource.EDITOR, 'Resolving category before form initialization', {
          categorySlug,
          categoryName
        });

        const category = await getCategoryBySlug(categorySlug);
        
        if (category) {
          setCategoryData(category);
          logger.info(LogSource.EDITOR, 'Category resolved successfully', {
            categoryId: category.id,
            categoryName: category.name
          });
        } else {
          const errorMsg = `Category not found for slug: ${categorySlug}`;
          setError(errorMsg);
          logger.error(LogSource.EDITOR, errorMsg);
        }
      } catch (err) {
        const errorMsg = `Failed to resolve category: ${err instanceof Error ? err.message : 'Unknown error'}`;
        setError(errorMsg);
        logger.error(LogSource.EDITOR, errorMsg, err);
      } finally {
        setIsLoading(false);
      }
    };

    resolveCategory();
  }, [categorySlug, categoryName]);

  return { categoryData, isLoading, error };
};
