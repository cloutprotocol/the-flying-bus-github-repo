import { useState, useEffect, useCallback } from 'react';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useToast } from '@/components/ui/use-toast';

export interface ApprovalQueueArticle {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
  };
  profiles?: {
    id: string;
    display_name: string;
  };
}

export function useSimpleApprovalQueue(statusFilter = 'pending') {
  const [articles, setArticles] = useState<ApprovalQueueArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching approval queue articles with status:', statusFilter);

      const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
      // Fetch pending/published etc via Convex and client-side filter
      const res: any = await convex.query(api.articles.getByStatus, { status: statusFilter === 'all' ? undefined : statusFilter });
      const items = (res?.articles || []).slice().sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      const mapped = items.map((a: any) => ({
        id: String(a._id),
        title: a.title,
        status: a.status,
        created_at: a.created_at,
        updated_at: a.updated_at,
        categories: a.category ? { id: String(a.category._id || a.category_id), name: a.category.name } : undefined,
        profiles: a.author ? { id: String(a.author._id), display_name: a.author.display_name } : undefined,
      }));
      console.log('Articles fetched successfully:', mapped.length);
      setArticles(mapped);
    } catch (err) {
      console.error('Error fetching approval queue articles:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      
      // Provide user-friendly error messages
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      let toastDescription = 'Failed to load articles for review';
      
      if (errorMessage.includes('Authentication required')) {
        toastDescription = 'Please log in to access admin features';
      } else if (errorMessage.includes('Admin privileges required')) {
        toastDescription = 'Admin access required to view pending articles';
      }
      
      toast({
        title: "Error",
        description: toastDescription,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const refetch = useCallback(() => {
    fetchArticles();
  }, [fetchArticles]);

  return {
    data: articles,
    isLoading: loading,
    error,
    refetch
  };
}
