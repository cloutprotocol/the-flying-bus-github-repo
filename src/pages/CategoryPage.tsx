
import React from 'react';
import { useParams } from 'react-router-dom';
import CategoryPageContainer from '@/components/Category/CategoryPageContainer';

const CategoryPage: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  return <CategoryPageContainer category={categoryId} />;
};

export default CategoryPage;
