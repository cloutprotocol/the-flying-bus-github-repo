
export const isDebateArticle = (articleType?: string): boolean => {
  if (!articleType) return false;
  const normalizedType = articleType.toLowerCase().trim();
  return normalizedType === 'debate' || normalizedType === 'debates';
};

export const isStoryboardArticle = (articleType?: string): boolean => {
  if (!articleType) return false;
  const normalizedType = articleType.toLowerCase().trim();
  return normalizedType === 'storyboard' || normalizedType === 'storyboards';
};

export const isVideoArticle = (articleType?: string): boolean => {
  if (!articleType) return false;
  const normalizedType = articleType.toLowerCase().trim();
  return normalizedType === 'video' || normalizedType === 'videos';
};

export const getArticleTypeName = (articleType?: string): string => {
  if (!articleType) return 'Standard';
  
  const normalizedType = articleType.toLowerCase().trim();
  
  switch (normalizedType) {
    case 'debate':
    case 'debates':
      return 'Debate';
    case 'storyboard':
    case 'storyboards':
      return 'Storyboard';
    case 'video':
    case 'videos':
      return 'Video';
    default:
      return 'Standard';
  }
};
