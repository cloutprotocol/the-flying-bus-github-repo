
import { ArticleProps } from '@/components/Articles/ArticleCard';

export const filterAndSortArticles = (
  articles: ArticleProps[],
  selectedReadingLevel: string | null,
  sortBy: 'newest' | 'oldest' | 'a-z'
): ArticleProps[] => {
  // Filter by reading level if selected
  let filteredArticles = selectedReadingLevel
    ? articles.filter(article => article.readingLevel === selectedReadingLevel)
    : articles;
  
  // Sort articles based on selected option
  if (sortBy === 'newest') {
    // Use a stable sort algorithm
    return [...filteredArticles].sort((a, b) => 
      new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );
  } else if (sortBy === 'oldest') {
    return [...filteredArticles].sort((a, b) => 
      new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime()
    );
  } else if (sortBy === 'a-z') {
    return [...filteredArticles].sort((a, b) => a.title.localeCompare(b.title));
  }
  
  return filteredArticles;
};

export const paginateArticles = (
  articles: ArticleProps[],
  currentPage: number,
  articlesPerPage: number
): ArticleProps[] => {
  const startIndex = (currentPage - 1) * articlesPerPage;
  return articles.slice(startIndex, startIndex + articlesPerPage);
};

// Cache for category mapping
const categoryMapping: Record<string, string> = {
  'headliners': 'Headliners',
  'debates': 'Debates',
  'spice-it-up': 'Spice It Up',
  'neighborhood': 'In the Neighborhood',
  'learning': 'Learning',
  'school-news': 'School News',
  'storyboard': 'Storyboard'
};

export const getCategoryFromSlug = (slug: string): string => {
  return categoryMapping[slug] || 'Articles';
};
