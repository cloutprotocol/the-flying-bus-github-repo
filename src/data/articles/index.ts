
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { StoryboardArticleProps, storyboardArticles } from '@/data/articles/storyboard';
import logger from '@/utils/logger';
import { LogSource } from '@/utils/logger';
import { ComponentLifecycleManager } from '@/utils/componentLifecycleManager';

// Mock data for related articles and functionality that isn't connected to Supabase yet
export const mockArticles: ArticleProps[] = [
  {
    id: "1",
    title: "Kids from Around the World Unite for Climate Change Action",
    excerpt: "Young activists from over 20 countries participated in a virtual summit to discuss and propose solutions for climate change.",
    content: "In an inspiring display of global cooperation, young activists from over 20 countries came together for a virtual summit focused on climate change. The event, which took place over three days, featured presentations, workshops, and collaborative sessions where kids shared their unique perspectives on environmental challenges in their regions.\n\nParticipants proposed innovative solutions ranging from school-based recycling programs to community gardens and renewable energy initiatives. Many emphasized the importance of education and raising awareness among their peers about the urgency of climate action.\n\nThe summit concluded with a joint declaration calling on world leaders to take more decisive action on climate change and to include young voices in policy-making processes.",
    imageUrl: "https://images.unsplash.com/photo-1604326531570-2689ea7ae287?w=800&auto=format&fit=crop",
    category: "Headliners",
    readingLevel: "Intermediate",
    readTime: 5,
    author: "Jamie Fields",
    date: "March 15, 2025",
    publishDate: "March 15, 2025",
    commentCount: 12
  },
  {
    id: "2",
    title: "Should School Uniforms Be Mandatory?",
    excerpt: "Students debate the pros and cons of requiring uniforms in schools.",
    content: "The debate over school uniforms has been a hot topic in schools across the country. Students have strong opinions on both sides of this issue.\n\nThose in favor of uniforms argue that they promote equality, reduce bullying based on clothing choices, and help students focus on learning rather than fashion. They also point out that uniforms can save families money and simplify morning routines.\n\nOn the other hand, students against mandatory uniforms believe that clothing is a form of self-expression and that uniforms limit creativity and individuality. They argue that students should have the freedom to dress in ways that reflect their personality and culture.\n\nWhat do you think? Should schools require uniforms, or should students be free to choose their own clothes?",
    imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop",
    category: "Debates",
    readingLevel: "Beginner",
    readTime: 3,
    author: "Alex Chen",
    date: "March 10, 2025",
    publishDate: "March 10, 2025",
    commentCount: 28
  },
  {
    id: "3",
    title: "DIY Science Experiments You Can Do at Home",
    excerpt: "Learn how to create amazing science experiments with everyday household items.",
    content: "Science doesn't have to happen only in the classroom! Here are some fun and safe experiments you can try at home with common household items.\n\n**Volcano Eruption**: Create a chemical reaction using baking soda and vinegar. Build a volcano shape around a small container, add baking soda, food coloring, and dish soap. Pour in vinegar and watch it erupt!\n\n**Homemade Slime**: Mix glue, water, and borax solution to create your own stretchy slime. You can add food coloring or glitter for extra fun.\n\n**Rainbow in a Glass**: Layer different liquids with varying densities (honey, dish soap, water, oil, rubbing alcohol) to create a colorful rainbow effect.\n\nRemember to always ask an adult for help and supervision when conducting experiments. Have fun exploring science!",
    imageUrl: "https://images.unsplash.com/photo-1603356033288-acfcb54801e6?w=800&auto=format&fit=crop",
    category: "Learning",
    readingLevel: "Advanced",
    readTime: 7,
    author: "Dr. Emma Wright",
    date: "March 5, 2025",
    publishDate: "March 5, 2025"
  }
];

export const getHeadlineArticle = async (): Promise<ArticleProps | null> => {
  // TODO: Replace with Convex query when migration is complete
  // For now, return the first mock article as headline
  try {
    return mockArticles[0] || null;
  } catch (error) {
    logger.error(LogSource.ARTICLE, 'Exception fetching headline article', error);
    return null;
  }
};

export const getCategoryArticles = async (categoryName: string): Promise<ArticleProps[]> => {
  // TODO: Replace with Convex query when migration is complete
  // For now, filter mock articles by category
  try {
    const results = mockArticles.filter(article => article.category === categoryName);
    return results;
  } catch (error) {
    logger.error(LogSource.ARTICLE, `Exception fetching articles for category ${categoryName}`, error);
    return [];
  }
};

// Get article by ID
export const getArticleById = async (id: string): Promise<ArticleProps | StoryboardArticleProps | undefined> => {
  // TODO: Replace with Convex query when migration is complete
  // First check mock data (regular articles)
  const regularArticle = mockArticles.find(article => article.id === id);
  if (regularArticle) {
    return regularArticle;
  }

  // Then check storyboard mock articles
  const storyboardArticle = storyboardArticles.find(article => article.id === id);
  if (storyboardArticle) {
    return storyboardArticle;
  }

  return undefined;
};

// Synchronous version for backward compatibility with existing code
export const getArticleByIdSync = (id: string): ArticleProps | StoryboardArticleProps | undefined => {
  // First check regular articles
  const regularArticle = mockArticles.find(article => article.id === id);
  if (regularArticle) {
    return regularArticle;
  }
  
  // Then check storyboard articles
  const storyboardArticle = storyboardArticles.find(article => article.id === id);
  return storyboardArticle;
};

// Check if an article is a storyboard article
export const isStoryboardArticle = (article: ArticleProps): boolean => {
  return article.category === 'Storyboard';
};

// Function to get comments for an article (placeholder)
export const getCommentsByArticleId = (articleId: string) => {
  // Mock comments data
  return [];
};
