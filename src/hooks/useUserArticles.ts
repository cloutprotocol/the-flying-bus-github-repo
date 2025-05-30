
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { getUserArticles, UserArticle, deleteUserArticle } from '@/services/userArticleService';

export function useUserArticles() {
  const [articles, setArticles] = useState<UserArticle[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  
  const limit = 10;

  const fetchArticles = async (page: number = currentPage) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching articles for page:', page);
      const { articles, count, error } = await getUserArticles(page, limit);
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch articles');
      }
      
      console.log('Articles fetched successfully:', { 
        articlesCount: articles.length, 
        totalCount: count 
      });
      
      setArticles(articles);
      setTotalCount(count);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching articles:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load your articles",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteArticle = async (articleId: string) => {
    try {
      console.log('Deleting article:', articleId);
      const { success, error } = await deleteUserArticle(articleId);
      
      if (!success) {
        throw new Error(error.message || 'Failed to delete article');
      }
      
      toast({
        title: "Article deleted",
        description: "The article has been successfully deleted.",
      });
      
      // Refresh the current page
      fetchArticles();
      
    } catch (err) {
      console.error('Error deleting article:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete article",
        variant: "destructive"
      });
    }
  };

  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    fetchArticles(page);
  };

  useEffect(() => {
    console.log('useUserArticles hook initializing...');
    try {
      fetchArticles(1);
    } catch (err) {
      console.error('Error during initial fetch:', err);
      setError(err instanceof Error ? err : new Error('Failed to initialize articles'));
    }
  }, []);

  return {
    articles,
    isLoading,
    error,
    totalCount,
    currentPage,
    totalPages,
    handlePageChange,
    deleteArticle,
    refreshArticles: fetchArticles
  };
}
