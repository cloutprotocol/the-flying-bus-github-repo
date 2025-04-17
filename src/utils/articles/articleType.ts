
export const isDebateArticle = (articleType?: string): boolean => {
  if (!articleType) return false;
  return articleType.toLowerCase() === 'debate';
};

export const isStoryboardArticle = (articleType?: string): boolean => {
  if (!articleType) return false;
  return articleType.toLowerCase() === 'storyboard';
};

export const isVideoArticle = (articleType?: string): boolean => {
  if (!articleType) return false;
  return articleType.toLowerCase() === 'video';
};

