
export * from './types';
export * from './articleType';
export * from './articleRead';
export * from './fetchArticle';
export * from './fetchDebate';
export * from './fetchVideo';
// Export the trackArticleView functions from trackArticleView.ts
export { trackArticleView, trackArticleViewWithRetry } from './trackArticleView';

// Additional helper functions
export const isStoryboardArticle = (articleType?: string): boolean => {
  return articleType === 'storyboard';
};
