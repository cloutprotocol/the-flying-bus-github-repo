
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getDraftById } from '@/services/draftService';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import type { UseFormReturn } from 'react-hook-form';

export function useContentManagement(
  form: UseFormReturn<any>,
  articleId?: string,
  isNewArticle: boolean = true
) {
  const [content, setContent] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!isNewArticle && articleId) {
      const loadDraft = async () => {
        try {
          logger.info(LogSource.EDITOR, 'Loading draft', { articleId });
          const { draft, error } = await getDraftById(articleId);
          
          if (error || !draft) {
            logger.error(LogSource.EDITOR, 'Error loading draft', { error, articleId });
            toast({
              title: "Error",
              description: "Failed to load article data. Please try again.",
              variant: "destructive"
            });
            return;
          }
          
          // Populate form with draft data
          form.reset({
            title: draft.title,
            excerpt: draft.excerpt,
            categoryId: draft.categoryId,
            imageUrl: draft.imageUrl,
            readingLevel: draft.readingLevel || 'Intermediate',
            status: draft.status,
            articleType: draft.articleType,
            videoUrl: draft.videoUrl || ''
          });
          
          setContent(draft.content || '');
          
        } catch (error) {
          logger.error(LogSource.EDITOR, 'Exception loading draft', { error, articleId });
          toast({
            title: "Error",
            description: "An unexpected error occurred loading the article.",
            variant: "destructive"
          });
        }
      };
      
      loadDraft();
    }
  }, [articleId, isNewArticle, form, toast]);

  return {
    content,
    setContent
  };
}
