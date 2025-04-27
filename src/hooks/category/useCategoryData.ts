
import { useState, useEffect } from 'react';
import { fetchCategoryBySlug, fetchReadingLevelsForCategory } from '@/utils/categoryUtils';
import { handleApiError } from '@/utils/errors';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export const useCategoryData = (categorySlug: string | undefined) => {
  const [categoryData, setCategoryData] = useState<CategoryData | null>(null);
  const [displayCategory, setDisplayCategory] = useState<string | null>(null);
  const [availableReadingLevels, setAvailableReadingLevels] = useState<string[]>([]);
  const [isLoadingCategory, setIsLoadingCategory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingCategory(true);
        setError(null);
        
        logger.info(LogSource.API, `Fetching category data for slug: ${categorySlug}`);
        
        if (!categorySlug) {
          setIsLoadingCategory(false);
          return;
        }

        const category = await fetchCategoryBySlug(categorySlug);
        
        if (!category) {
          logger.warn(LogSource.API, `Category not found for slug: ${categorySlug}`);
          setIsLoadingCategory(false);
          setError('Category not found');
          return;
        }
        
        logger.info(LogSource.API, `Category data fetched: ${category.name}`);
        setCategoryData(category);
        setDisplayCategory(category.name);
        
        try {
          logger.info(LogSource.API, `Fetching reading levels for category: ${category.id}`);
          const levels = await fetchReadingLevelsForCategory(category.id);
          setAvailableReadingLevels(levels);
          logger.info(LogSource.API, `Found ${levels.length} reading levels for category`);
        } catch (levelsError) {
          logger.error(LogSource.API, 'Error fetching reading levels', levelsError);
        }
      } catch (error) {
        logger.error(LogSource.API, 'Error fetching category data', error);
        handleApiError(error);
        setError('Failed to load category data');
      } finally {
        setIsLoadingCategory(false);
      }
    };
    
    fetchData();
  }, [categorySlug]);

  return {
    categoryData,
    displayCategory,
    availableReadingLevels,
    isLoadingCategory,
    error
  };
};
