
import React, { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import CategoryPageContainer from '@/components/Category/CategoryPageContainer';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

const CategoryPage: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const location = useLocation();
  
  useEffect(() => {
    logger.info(LogSource.APP, 'Category page loaded', {
      categoryId,
      pathname: location.pathname,
      key: location.key
    });
  }, [categoryId, location.pathname, location.key]);

  return (
    <CategoryPageContainer 
      category={categoryId} 
      key={`category-${location.key}-${categoryId || 'default'}`}
    />
  );
};

export default CategoryPage;
