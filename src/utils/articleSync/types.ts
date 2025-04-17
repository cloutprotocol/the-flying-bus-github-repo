
import { ArticleProps } from '@/components/Articles/ArticleCard';

export type ArticleCache = {
  [key: string]: {
    data: ArticleProps;
    timestamp: number;
    expiresAt: number;
  };
};

export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
