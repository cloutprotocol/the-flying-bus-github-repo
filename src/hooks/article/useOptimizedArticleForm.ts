
import { useState, useEffect, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useContentManagement } from './useContentManagement';
import { useArticleAutoSave } from './autoSave/useArticleAutoSave';
import { useManualSave } from './manual/useManualSave';
import { useOptimizedSubmission } from './useOptimizedSubmission';
import type { DraftSaveStatus } from '@/types/ArticleEditorTypes';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export const useOptimizedArticleForm = (
  form: UseFormReturn<any>,
  articleId?: string,
  articleType: string = 'standard',
  isNewArticle: boolean = true
) => {
  // State management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftId, setDraftId] = useState<string | undefined>(articleId);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Content management
  const { content, setContent } = useContentManagement(form, articleId, isNewArticle);
  
  // Track if component is mounted
  const isMountedRef = useRef(true);
  
  // Use optimized submission
  const { submitArticle } = useOptimizedSubmission();
  
  useEffect(() => {
    isMountedRef.current = true;
    
    // Log component initialization for performance tracking
    logger.info(LogSource.EDITOR, 'ArticleForm initialized', {
      articleId,
      isNewArticle,
      articleType
    });
    
    return () => {
      isMountedRef.current = false;
    };
  }, [articleId, isNewArticle, articleType]);

  // Manual save functionality with optimized database calls
  const { handleSaveDraft } = useManualSave({
    draftId,
    articleType,
    setSaving: setIsSaving,
    setSaveStatus,
    setLastSaved,
    saveDraft: async (data) => {
      try {
        // Use the same service but skip validation to improve performance
        const { success, articleId, error } = await saveDraftOptimized(data);
        
        if (success && articleId && setDraftId) {
          setDraftId(articleId);
        }
        
        return { success, articleId, error };
      } catch (error) {
        return { success: false, error, articleId: undefined };
      }
    },
    setDraftId
  });

  // Optimized auto-save that reduces save frequency
  useArticleAutoSave({
    form,
    content,
    draftId,
    articleType,
    isSubmitting,
    isSaving,
    setSaving: setIsSaving,
    setSaveStatus,
    setLastSaved,
    saveDraft: saveDraftOptimized,
    setDraftId,
    // Added debounce interval to reduce frequency of autosaves
    debounceInterval: 5000, // 5 seconds
    submissionCompletedRef: { current: isSubmitting }
  });

  // Handle manual draft save
  const saveManualDraft = async (): Promise<void> => {
    if (isSaving || isSubmitting) {
      return;
    }
    
    const formData = {
      ...form.getValues(),
      content,
      id: draftId
    };
    
    await handleSaveDraft(formData);
  };

  // Handle article submission with combined save+submit
  const handleSubmit = async (data: any) => {
    if (isSubmitting) {
      return null;
    }
    
    setIsSubmitting(true);
    
    try {
      const completeData = {
        ...data,
        content,
        id: draftId,
        articleType
      };
      
      const success = await submitArticle(completeData);
      
      if (!success) {
        setIsSubmitting(false);
        return null;
      }
      
      return draftId;
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Error in form submission', { error });
      
      toast({
        title: 'Error',
        description: 'There was a problem submitting your article.',
        variant: 'destructive'
      });
      
      setIsSubmitting(false);
      return null;
    }
  };
  
  // Optimized draft saving with minimal validation
  const saveDraftOptimized = async (formData: any) => {
    try {
      // If there's no actual content change, skip saving to reduce DB load
      if (draftId && !form.formState.isDirty && formData.content === content) {
        return { 
          success: true, 
          articleId: draftId, 
          error: null 
        };
      }
      
      // Minimal client-side validation to improve performance
      if (!formData.title) {
        formData.title = 'Untitled Draft';
      }
      
      // Slug generation moved to client-side
      if (!formData.slug) {
        formData.slug = generateClientSideSlug(formData.title);
      }
      
      // Create or update the article in a single operation
      const { data, error } = await supabase.rpc('save_article_draft', {
        p_article_data: {
          ...formData,
          id: draftId || undefined,
          status: 'draft'
        }
      });
      
      if (error) {
        logger.error(LogSource.DATABASE, 'Error saving draft', { error });
        return { success: false, error, articleId: draftId };
      }
      
      const articleId = data?.article_id || draftId;
      
      return { success: true, articleId, error: null };
    } catch (error) {
      logger.error(LogSource.DATABASE, 'Exception saving draft', { error });
      return { success: false, error, articleId: draftId };
    }
  };
  
  /**
   * Generate a slug on the client-side to avoid database queries
   */
  const generateClientSideSlug = (title: string): string => {
    if (!title || typeof title !== 'string') {
      return `draft-${Date.now()}`;
    }
    
    // Create base slug from title
    const baseSlug = title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
      
    // Add timestamp to ensure uniqueness without needing additional DB queries
    return `${baseSlug}-${Date.now().toString().slice(-8)}`;
  };

  return {
    content,
    setContent,
    draftId,
    saveStatus,
    lastSaved,
    isSubmitting,
    isSaving,
    handleSubmit,
    handleSaveDraft: saveManualDraft
  };
};

// Fix circular dependency by adding the supabase import here
import { supabase } from '@/integrations/supabase/client';
