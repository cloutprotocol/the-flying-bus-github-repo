/**
 * Skeleton Loading Components
 * 
 * Provides skeleton loading states for dashboard components
 * to improve user experience and prevent layout shifts.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Skeleton for dashboard metric cards
 */
export const MetricCardSkeleton: React.FC = () => (
  <Card>
    <CardContent className="p-6">
      <div className="animate-pulse">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        </div>
      </div>
    </CardContent>
  </Card>
);

/**
 * Skeleton for metrics grid
 */
export const MetricsGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: count }, (_, i) => (
      <MetricCardSkeleton key={i} />
    ))}
  </div>
);

/**
 * Skeleton for activity feed items
 */
export const ActivityItemSkeleton: React.FC = () => (
  <div className="animate-pulse flex space-x-3 p-2">
    <div className="rounded-full bg-gray-200 h-8 w-8 flex-shrink-0"></div>
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
  </div>
);

/**
 * Skeleton for activity feed
 */
export const ActivityFeedSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <Card className="p-4">
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <ActivityItemSkeleton key={i} />
      ))}
    </div>
  </Card>
);

/**
 * Skeleton for article list items
 */
export const ArticleItemSkeleton: React.FC = () => (
  <div className="animate-pulse flex justify-between items-center p-3 border-b">
    <div className="flex-1">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
    <div className="h-6 bg-gray-200 rounded w-16 flex-shrink-0"></div>
  </div>
);

/**
 * Skeleton for recent articles list
 */
export const RecentArticlesSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <Card className="p-4">
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <ArticleItemSkeleton key={i} />
      ))}
    </div>
  </Card>
);

/**
 * Skeleton for quick actions section
 */
export const QuickActionsSkeleton: React.FC = () => (
  <Card className="p-6">
    <div className="animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center space-x-3 p-4 border rounded-lg">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </Card>
);

/**
 * Skeleton for dashboard section with header
 */
export const DashboardSectionSkeleton: React.FC<{ 
  title?: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <section>
    <div className="flex justify-between items-center mb-4">
      {title ? (
        <h2 className="text-2xl font-semibold">{title}</h2>
      ) : (
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      )}
      <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
    </div>
    {children}
  </section>
);

/**
 * Progressive loading skeleton that shows different states
 */
export const ProgressiveLoadingSkeleton: React.FC<{
  stage: 'initial' | 'loading' | 'error' | 'loaded';
  children?: React.ReactNode;
  error?: string;
}> = ({ stage, children, error }) => {
  switch (stage) {
    case 'initial':
      return (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      );
    
    case 'loading':
      return (
        <div className="animate-pulse">
          <div className="h-4 bg-blue-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-blue-200 rounded w-3/4"></div>
        </div>
      );
    
    case 'error':
      return (
        <div className="text-red-500 text-sm">
          {error || 'Failed to load content'}
        </div>
      );
    
    case 'loaded':
      return <>{children}</>;
    
    default:
      return null;
  }
};

/**
 * Shimmer effect for skeleton loaders
 */
export const ShimmerSkeleton: React.FC<{
  className?: string;
  width?: string;
  height?: string;
}> = ({ className = '', width = 'w-full', height = 'h-4' }) => (
  <div className={`${width} ${height} bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite] rounded ${className}`} />
);

// Add shimmer animation to global styles if not already present
const shimmerStyles = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('shimmer-styles')) {
  const style = document.createElement('style');
  style.id = 'shimmer-styles';
  style.textContent = shimmerStyles;
  document.head.appendChild(style);
}