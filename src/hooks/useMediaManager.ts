
import { useState, useEffect, useCallback } from 'react';
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

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      logger.info(LogSource.MEDIA, 'Fetching media', { filter, searchTerm });
      const { assets, count, error } = await getMediaAssets(filter, searchTerm);
      
      if (error) {
        throw error;
      }

      setMedia(assets);
      setTotalCount(count);
      setError(null);
    } catch (e) {
      setError(e as Error);
      toast({
        title: "Error",
        description: "Failed to load media assets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filter, searchTerm, toast]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

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
