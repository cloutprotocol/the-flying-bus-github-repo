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
import { supabase } from '@/integrations/supabase/client';

// Helper function for client-side slug generation
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

// Optimized draft saving with minimal validation
const saveDraftOptimized = async (formData: any) => {
  try {
    // If there's no actual content change, skip saving to reduce DB load
    if (formData.id && !formData.isDirty && !formData.forceSave) {
      return { 
        success: true, 
        articleId: formData.id, 
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
    
    // Get current user session - CRITICAL for author_id
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user?.id) {
      logger.error(LogSource.DATABASE, 'No authenticated user found when saving draft');
      return { 
        success: false, 
        error: { message: 'User authentication required' },
        articleId: formData.id
      };
    }
    
    // Create or update the article using our custom RPC function
    const { data, error } = await supabase
      .rpc('submit_article_for_review', {
        p_article_id: formData.id || null,
        p_user_id: session.user.id,
        // Additional parameters to be added if needed
      });
    
    if (error) {
      logger.error(LogSource.DATABASE, 'Error saving draft', { error });
      return { success: false, error, articleId: formData.id };
    }
    
    // Fix: Make sure data is treated as a single object, not an array
    let articleId = formData.id;
    
    // Type guard to ensure data has the expected structure
    if (data !== null && typeof data === 'object' && 'article_id' in data) {
      articleId = data.article_id || formData.id;
    }
    
    return { success: true, articleId, error: null };
  } catch (error) {
    logger.error(LogSource.DATABASE, 'Exception saving draft', { error });
    return { success: false, error, articleId: formData.id };
  }
};

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
