
import React from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { Skeleton } from '@/components/ui/skeleton';

const CategoryPageSkeleton: React.FC = () => {
  return (
    <MainLayout fullWidth={true}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-10">
            <Skeleton className="h-[144px] w-[144px] rounded-md" />
            <Skeleton className="h-12 w-60" />
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
        </div>
        <Skeleton className="h-12 w-full max-w-lg mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-[300px] w-full rounded-lg" />
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default CategoryPageSkeleton;
