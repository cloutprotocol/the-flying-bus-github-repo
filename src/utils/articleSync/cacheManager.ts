
import { ArticleCache, CACHE_DURATION } from './types';
import { ArticleProps } from '@/components/Articles/ArticleCard';

// In-memory cache
const articleCache: ArticleCache = {};

export const getCachedArticle = (articleId: string): ArticleProps | null => {
  const now = Date.now();
  const cachedArticle = articleCache[articleId];
  
  if (cachedArticle && now < cachedArticle.expiresAt) {
    console.log('Cache hit for article:', articleId);
    return cachedArticle.data;
  }
  
  return null;
};

export const setCachedArticle = (articleId: string, article: ArticleProps): void => {
  const now = Date.now();
  articleCache[articleId] = {
    data: article,
    timestamp: now,
    expiresAt: now + CACHE_DURATION
  };
};

export const clearArticleCache = (articleId?: string) => {
  if (articleId) {
    delete articleCache[articleId];
  } else {
    Object.keys(articleCache).forEach(key => {
      delete articleCache[key];
    });
  }
};
