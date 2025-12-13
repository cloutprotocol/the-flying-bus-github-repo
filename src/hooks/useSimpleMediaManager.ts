import { useState, useEffect, useCallback } from 'react';
// Supabase removed; media management via Convex is not implemented yet. Using stubs.
import { useToast } from '@/components/ui/use-toast';

export interface SimpleMediaAsset {
  id: string;
  filename: string;
  file_type: string;
  storage_path: string;
  mime_type?: string;
  size_bytes?: number;
  width?: number;
  height?: number;
  alt_text?: string;
  created_at: string;
  url: string;
}

export function useSimpleMediaManager() {
  const [media, setMedia] = useState<SimpleMediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching media assets with filter:', filter, 'search:', searchTerm);

      // Stubbed: no Convex media listing yet
      setMedia([]);
    } catch (err) {
      console.error('Error fetching media assets:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
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
      // First, get the asset to know its storage path
      // Stubbed: update local state only
      setMedia(prev => prev.filter(item => item.id !== id));

      toast({
        title: "Success",
        description: "Media asset deleted successfully",
      });

      return true;
    } catch (err) {
      console.error('Error deleting media asset:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete media asset",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleUpdateMetadata = async (id: string, updates: { title?: string; alt_text?: string }) => {
    try {
      // Stubbed: update memory only
      setMedia(prev => prev.map(item => item.id === id ? { ...item, filename: updates.title || item.filename, alt_text: updates.alt_text } : item));

      toast({
        title: "Success",
        description: "Media metadata updated successfully",
      });

      return { id, ...updates } as any;
    } catch (err) {
      console.error('Error updating media metadata:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update media metadata",
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
    totalCount: media.length,
    fetchMedia,
    handleDelete,
    handleUpdateMetadata
  };
}
