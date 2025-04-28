
import React, { useEffect, memo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import CategoryPageContainer from '@/components/Category/CategoryPageContainer';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

const CategoryPageContent = memo(({ categoryId }: { categoryId: string | undefined }) => {
  return (
    <div className="w-full">
      <CategoryPageContainer 
        category={categoryId} 
        key={`category-${categoryId || 'default'}`}
      />
    </div>
  );
});

CategoryPageContent.displayName = 'CategoryPageContent';

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
    <MainLayout fullWidth={true}>
      <CategoryPageContent categoryId={categoryId} />
    </MainLayout>
  );
};

export default CategoryPage;

