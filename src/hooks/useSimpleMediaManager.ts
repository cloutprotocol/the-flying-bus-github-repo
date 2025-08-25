import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

      let query = supabase
        .from('media_assets')
        .select('*');

      // Apply filter
      if (filter === 'image') {
        query = query.eq('file_type', 'image');
      } else if (filter === 'video') {
        query = query.eq('file_type', 'video');
      }

      // Apply search
      if (searchTerm) {
        query = query.or(`filename.ilike.%${searchTerm}%,alt_text.ilike.%${searchTerm}%`);
      }

      // Order by created_at descending
      query = query.order('created_at', { ascending: false });

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('Media query error:', queryError);
        throw new Error(`Database query failed: ${queryError.message}`);
      }

      // Transform the data to include public URLs
      const mediaWithUrls = (data || []).map(item => {
        const url = supabase.storage
          .from('media')
          .getPublicUrl(item.storage_path).data.publicUrl;

        return {
          ...item,
          url
        };
      });

      console.log('Media assets fetched successfully:', mediaWithUrls.length);
      setMedia(mediaWithUrls);
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
      const { data: asset, error: fetchError } = await supabase
        .from('media_assets')
        .select('storage_path')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch asset: ${fetchError.message}`);
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('media')
        .remove([asset.storage_path]);

      if (storageError) {
        console.warn('Storage deletion failed:', storageError);
        // Continue with database deletion even if storage fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('media_assets')
        .delete()
        .eq('id', id);

      if (dbError) {
        throw new Error(`Failed to delete from database: ${dbError.message}`);
      }

      // Update local state
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
      const { data: updated, error } = await supabase
        .from('media_assets')
        .update({
          filename: updates.title,
          alt_text: updates.alt_text
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update metadata: ${error.message}`);
      }

      // Update local state
      setMedia(prev => 
        prev.map(item => item.id === id ? { ...item, ...updated } : item)
      );

      toast({
        title: "Success",
        description: "Media metadata updated successfully",
      });

      return updated;
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