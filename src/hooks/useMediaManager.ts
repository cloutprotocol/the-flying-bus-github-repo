
import { useState, useEffect, useCallback, useRef } from 'react';
import { MediaAsset, getMediaAssets, deleteMedia, updateMediaMetadata } from '@/services/mediaService';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export const useMediaManager = () => {
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Separate fetch logic to avoid circular dependencies
  const performFetch = async (currentFilter = filter, currentSearchTerm = searchTerm) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    if (!isMountedRef.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      logger.info(LogSource.MEDIA, 'Fetching media', { filter: currentFilter, searchTerm: currentSearchTerm });
      const { assets, count, error } = await getMediaAssets(currentFilter, currentSearchTerm);
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted || !isMountedRef.current) {
        return;
      }
      
      if (error) {
        throw error;
      }

      setMedia(assets);
      setTotalCount(count);
      setError(null);
    } catch (e) {
      // Don't set error if request was aborted
      if (abortControllerRef.current?.signal.aborted || !isMountedRef.current) {
        return;
      }
      
      setError(e as Error);
      toast({
        title: "Error",
        description: "Failed to load media assets",
        variant: "destructive",
      });
    } finally {
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  };

  // Create stable callback for external use
  const fetchMedia = useCallback(async () => {
    await performFetch();
  }, [toast]);

  // Initial fetch on mount
  useEffect(() => {
    performFetch();
  }, [toast]);

  // Fetch when filter changes
  useEffect(() => {
    performFetch(filter, searchTerm);
  }, [filter, toast]);

  // Fetch when search term changes
  useEffect(() => {
    performFetch(filter, searchTerm);
  }, [searchTerm, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const { success, error } = await deleteMedia(id);
      
      if (error) {
        throw error;
      }
      
      if (success) {
        setMedia(prev => prev.filter(item => item.id !== id));
        setTotalCount(prev => Math.max(0, prev - 1));
        
        toast({
          title: "Delete Success",
          description: "Media deleted successfully",
        });
      }
      
      return success;
    } catch (e) {
      toast({
        title: "Delete Failed",
        description: (e as Error).message || "Failed to delete media",
        variant: "destructive",
      });
      
      return false;
    }
  };

  const handleUpdateMetadata = async (id: string, updates: { title?: string; alt_text?: string }) => {
    try {
      const { asset, error } = await updateMediaMetadata(id, updates);
      
      if (error) {
        throw error;
      }
      
      if (asset) {
        setMedia(prev => 
          prev.map(item => item.id === id ? asset : item)
        );
        
        toast({
          title: "Update Success",
          description: "Media metadata updated successfully",
        });
      }
      
      return asset;
    } catch (e) {
      toast({
        title: "Update Failed",
        description: (e as Error).message || "Failed to update media metadata",
        variant: "destructive",
      });
      
      return null;
    }
  };

  return {
    media,
    loading,
    error,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    totalCount,
    fetchMedia,
    handleDelete,
    handleUpdateMetadata
  };
};

export default useMediaManager;
