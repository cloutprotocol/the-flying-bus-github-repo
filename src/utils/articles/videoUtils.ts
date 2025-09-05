/**
 * Video article utilities
 */

import { ArticleProps } from '@/components/Articles/ArticleCard';
import { isVideoArticle } from './articleType';

/**
 * Determines if an article should display a video player
 */
export const shouldDisplayVideo = (article: ArticleProps): boolean => {
  console.log('shouldDisplayVideo - checking article:', {
    id: article.id,
    videoUrl: article.videoUrl,
    category: article.category,
    articleType: article.articleType,
    hasVideoUrl: !!article.videoUrl
  });
  
  if (!article.videoUrl) {
    console.log('shouldDisplayVideo - no video URL, returning false');
    return false;
  }
  
  // Show video for Spice It Up category articles with video URLs
  if (article.category === 'Spice It Up') {
    console.log('shouldDisplayVideo - Spice It Up category with video URL, returning true');
    return true;
  }
  
  // Show video for articles with video type
  if (isVideoArticle(article.articleType)) {
    console.log('shouldDisplayVideo - video article type, returning true');
    return true;
  }
  
  console.log('shouldDisplayVideo - no conditions met, returning false');
  return false;
};

/**
 * Gets the video display priority for an article
 * Higher numbers indicate higher priority
 */
export const getVideoDisplayPriority = (article: ArticleProps): number => {
  if (!article.videoUrl) return 0;
  
  // Video type articles have highest priority
  if (isVideoArticle(article.articleType)) return 3;
  
  // Spice It Up category has medium priority
  if (article.category === 'Spice It Up') return 2;
  
  // Any other article with video URL has low priority
  return 1;
};