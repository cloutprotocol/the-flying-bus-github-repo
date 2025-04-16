
import { useState, useEffect } from 'react';
import { getArticleRevisions, createArticleRevision } from '@/services/draftService';
import { useToast } from '@/components/ui/use-toast';
import { ArticleRevision } from '@/types/ArticleEditorTypes';

interface UseArticleRevisionsReturn {
  revisions: ArticleRevision[];
  isLoading: boolean;
  error: Error | null;
  createRevision: (content: string, note?: string) => Promise<boolean>;
  refreshRevisions: () => void;
}

const useArticleRevisions = (articleId?: string): UseArticleRevisionsReturn => {
  const [revisions, setRevisions] = useState<ArticleRevision[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchRevisions = async () => {
    if (!articleId) {
      setRevisions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { revisions: data, error: revError } = await getArticleRevisions(articleId);
      
      if (revError) {
        throw new Error(revError.message || 'Failed to load article revisions');
      }
      
      setRevisions(data);
    } catch (err) {
      console.error('Error fetching article revisions:', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      
      toast({
        title: "Error loading revisions",
        description: err instanceof Error ? err.message : "Failed to load article revisions",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRevisions();
  }, [articleId, toast]);

  const createRevision = async (content: string, note?: string): Promise<boolean> => {
    if (!articleId) {
      toast({
        title: "Error",
        description: "Cannot create revision: No article ID provided",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { success, error: revError } = await createArticleRevision(articleId, content, note);
      
      if (!success || revError) {
        throw new Error(revError?.message || 'Failed to create revision');
      }
      
      toast({
        title: "Revision created",
        description: "A new revision has been saved for this article",
      });
      
      // Refresh the revisions list
      fetchRevisions();
      return true;
    } catch (err) {
      console.error('Error creating article revision:', err);
      
      toast({
        title: "Error creating revision",
        description: err instanceof Error ? err.message : "Failed to create article revision",
        variant: "destructive"
      });
      
      return false;
    }
  };

  return {
    revisions,
    isLoading,
    error,
    createRevision,
    refreshRevisions: fetchRevisions
  };
};

export default useArticleRevisions;
