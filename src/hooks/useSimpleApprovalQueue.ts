import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Authentication required to access admin features');
      }

      let query = supabase
        .from('articles')
        .select(`
          id,
          title,
          status,
          created_at,
          updated_at,
          categories (
            id,
            name
          ),
          profiles!author_id (
            id,
            display_name
          )
        `);

      // Apply status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          // Handle both 'pending' and 'pending_review' statuses for backward compatibility
          query = query.in('status', ['pending', 'pending_review']);
        } else {
          query = query.eq('status', statusFilter);
        }
      }

      // Order by updated_at descending
      query = query.order('updated_at', { ascending: false });

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('Query error:', queryError);
        
        // Provide more specific error messages
        if (queryError.message.includes('RLS')) {
          throw new Error('Access denied: Admin privileges required to view pending articles');
        }
        
        throw new Error(`Database query failed: ${queryError.message}`);
      }

      console.log('Articles fetched successfully:', data?.length || 0);
      setArticles(data || []);
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