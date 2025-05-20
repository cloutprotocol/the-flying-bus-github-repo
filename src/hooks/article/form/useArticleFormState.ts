import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getDraftById } from '@/services/articleService';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

/**
 * Hook to manage article form state with improved draft ID persistence
 */
export const useArticleFormState = (form: any, initialArticleId?: string, isNewArticle: boolean = true) => {
  // Main form state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [content, setContent] = useState<string>('');
  
  // Improved draft ID management
  const [draftId, setDraftId] = useState<string | undefined>(initialArticleId);
  const draftIdRef = useRef<string | undefined>(initialArticleId);
  
  // Lifecycle refs
  const submissionCompletedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(false);
  
  const { toast } = useToast();

  // Keep the ref in sync with state for consistent draft ID access
  useEffect(() => {
    draftIdRef.current = draftId;
    
    logger.debug(LogSource.EDITOR, 'Draft ID updated', {
      draftId,
      initialArticleId,
      isNew: isNewArticle
    });
  }, [draftId, initialArticleId, isNewArticle]);

  // Fetch article data if ID is provided
  useEffect(() => {
    if (!isNewArticle && initialArticleId) {
      const fetchArticleData = async () => {
        logger.info(LogSource.EDITOR, 'Fetching existing article', { articleId: initialArticleId });
        
        try {
          const { draft, error } = await getDraftById(initialArticleId);
          
          if (error) {
            toast({
              title: 'Error',
              description: 'Failed to fetch article data',
              variant: 'destructive'
            });
            logger.error(LogSource.EDITOR, 'Error fetching article', { error });
            return;
          }
          
          if (draft) {
            // Populate form with article data
            form.reset({
              title: draft.title,
              excerpt: draft.excerpt,
              categoryId: draft.categoryId,
              imageUrl: draft.imageUrl,
              articleType: draft.articleType,
              status: draft.status
            });
            
            // Set content if available
            if (draft.content) {
              setContent(draft.content);
            }
            
            // Set video URL or debate settings if applicable
            if (draft.videoUrl) {
              form.setValue('videoUrl', draft.videoUrl);
            }
            
            if (draft.debateSettings) {
              form.setValue('debateSettings', draft.debateSettings);
            }
            
            logger.info(LogSource.EDITOR, 'Article loaded successfully', {
              articleId: initialArticleId,
              title: draft.title
            });
          }
        } catch (err) {
          logger.error(LogSource.EDITOR, 'Exception fetching article', { error: err });
        }
      };
      
      fetchArticleData();
    }
  }, [initialArticleId, isNewArticle, form, toast]);
  
  return {
    isSubmitting,
    setIsSubmitting,
    isSaving,
    setIsSaving,
    saveStatus,
    setSaveStatus,
    lastSaved,
    setLastSaved,
    content,
    setContent,
    draftId,
    setDraftId,
    draftIdRef, // Expose ref for more reliable access to current draft ID
    submissionCompletedRef,
    isMountedRef
  };
};
