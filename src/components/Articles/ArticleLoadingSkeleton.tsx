
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const ArticleLoadingSkeleton = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <Skeleton className="h-12 w-3/4 mb-4" />
      <Skeleton className="h-6 w-1/2 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <Skeleton className="h-64 w-full mb-6" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-8" />
        </div>
        <div className="lg:col-span-4">
          <Skeleton className="h-48 w-full mb-4" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
};

export default ArticleLoadingSkeleton;
