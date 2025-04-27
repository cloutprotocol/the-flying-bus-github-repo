
import { useState } from 'react';
import { ArticleSortType } from '@/hooks/article/types';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export const useCategoryFilters = (clearFilters: () => void) => {
  const [selectedReadingLevel, setSelectedReadingLevel] = useState<string | null>(null);
  
  const handleReadingLevelChange = (level: string | null) => {
    logger.info(LogSource.CLIENT, `Reading level changed by user: ${level || 'All Levels'}`);
    setSelectedReadingLevel(level);
  };

  const handleSortChange = (sort: ArticleSortType) => {
    logger.info(LogSource.CLIENT, `Sort method changed by user: ${sort}`);
  };

  const handleClearFilters = () => {
    logger.info(LogSource.CLIENT, 'User cleared all filters');
    setSelectedReadingLevel(null);
    clearFilters();
  };

  return {
    selectedReadingLevel,
    handleReadingLevelChange,
    handleSortChange,
    handleClearFilters
  };
};
