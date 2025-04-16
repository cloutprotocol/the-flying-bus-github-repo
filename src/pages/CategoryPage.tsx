
import React from 'react';
import CategoryPageContainer from '@/components/Category/CategoryPageContainer';

interface CategoryPageProps {
  category?: string;
}

const CategoryPage: React.FC<CategoryPageProps> = ({ category }) => {
  return <CategoryPageContainer category={category} />;
};

export default CategoryPage;
