
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { createArticle } from '@/services/articleService';
import { saveDraft, getDraftById } from '@/services/draftService';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { UseFormReturn } from 'react-hook-form';
import { DraftSaveStatus } from '@/types/ArticleEditorTypes';
import { supabase } from '@/integrations/supabase/client';

const AUTO_SAVE_INTERVAL = 60000; // Auto-save every minute

/**
 * Custom hook for article form functionality
 */
export const useArticleForm = (
  form: UseFormReturn<any>,
  articleId?: string,
  articleType: string = 'standard',
  isNewArticle: boolean = true
) => {
  const [content, setContent] = useState('');
  const [draftId, setDraftId] = useState<string | undefined>(articleId);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get default category if creating new article
  useEffect(() => {
    if (isNewArticle) {
      const getDefaultCategory = async () => {
        try {
          const { data, error } = await supabase
            .from('categories')
            .select('id')
            .limit(1)
            .single();
          
          if (error) {
            logger.error(LogSource.EDITOR, 'Error getting default category', error);
            return;
          }
          
          if (data) {
            form.setValue('categoryId', data.id, { 
              shouldValidate: true 
            });
          }
        } catch (err) {
          logger.error(LogSource.EDITOR, 'Error setting default category', err);
        }
      };
      
      getDefaultCategory();
    }
  }, [isNewArticle, form]);

  // Load existing draft
  useEffect(() => {
    if (!isNewArticle && articleId) {
      const loadDraft = async () => {
        try {
          logger.info(LogSource.EDITOR, 'Loading draft', { articleId });
          const { draft, error } = await getDraftById(articleId);
          
          if (error || !draft) {
            logger.error(LogSource.EDITOR, 'Error loading draft', { error, articleId });
            return;
          }
          
          // Populate form with draft data
          form.reset({
            title: draft.title,
            excerpt: draft.excerpt,
            categoryId: draft.categoryId,
            imageUrl: draft.imageUrl,
            readingLevel: 'Intermediate', // Default
            status: draft.status,
            articleType: draft.articleType,
            videoUrl: draft.videoUrl || ''
          });
          
          setContent(draft.content);
          setDraftId(draft.id);
          setLastSaved(new Date(draft.updatedAt));
          setSaveStatus('saved');
          
        } catch (error) {
          logger.error(LogSource.EDITOR, 'Exception loading draft', { error, articleId });
        }
      };
      
      loadDraft();
    }
  }, [articleId, isNewArticle, form]);

  // Auto-save draft periodically
  const saveDraftToServer = useCallback(async (formData: any, isDirty: boolean) => {
    if (!isDirty && draftId) {
      return { success: true };
    }
    
    try {
      setSaveStatus('saving');
      
      const draftData = {
        ...formData,
        content,
      };
      
      logger.info(LogSource.EDITOR, 'Auto-saving draft', {
        draftId,
        articleType
      });
      
      const result = await saveDraft(draftId || '', draftData);
      
      if (result.error) {
        logger.error(LogSource.EDITOR, 'Error auto-saving draft', { error: result.error });
        setSaveStatus('error');
        return { success: false };
      }
      
      if (!draftId && result.articleId) {
        setDraftId(result.articleId);
      }
      
      setLastSaved(new Date());
      setSaveStatus('saved');
      return { success: true };
      
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Exception auto-saving draft', { error });
      setSaveStatus('error');
      return { success: false };
    }
  }, [draftId, content, articleType]);

  // Submit handler
  const handleSubmit = async (data: any, isDraft: boolean = false) => {
    data.content = content;
    
    if (isDraft) {
      data.status = 'draft';
    } else {
      data.status = isNewArticle ? 'pending' : form.getValues('status');
    }
    
    try {
      logger.info(LogSource.EDITOR, 'Submitting article form', {
        isDraft,
        articleType
      });
      
      if (isDraft) {
        const saveResult = await saveDraftToServer(data, true);
        if (!saveResult.success) {
          toast({
            title: "Error",
            description: "There was a problem saving your draft.",
            variant: "destructive"
          });
        }
        return;
      }
      
      const result = await createArticle(data);
      
      if (result.error) {
        toast({
          title: "Error",
          description: "There was a problem saving your article.",
          variant: "destructive"
        });
        logger.error(LogSource.EDITOR, "Article submission failed", result.error);
        return;
      }
      
      toast({
        title: "Article submitted for review",
        description: "Your article has been submitted for review.",
      });
      
      navigate('/admin/articles');
    } catch (error) {
      logger.error(LogSource.EDITOR, "Exception in article submission", error);
      toast({
        title: "Error",
        description: "There was a problem saving your article.",
        variant: "destructive"
      });
    }
  };

  // Setup auto-save interval
  useEffect(() => {
    const isDirty = form.formState.isDirty;
    const contentChanged = content !== '';
    
    if (isDirty || contentChanged) {
      const autoSaveTimer = setTimeout(() => {
        const formData = form.getValues();
        saveDraftToServer(formData, true);
      }, AUTO_SAVE_INTERVAL);
      
      return () => clearTimeout(autoSaveTimer);
    }
  }, [form, content, saveDraftToServer, form.formState.isDirty]);

  const handleSaveDraft = () => {
    const formData = form.getValues();
    handleSubmit(formData, true);
  };

  return {
    content,
    setContent,
    saveStatus,
    lastSaved,
    handleSubmit,
    handleSaveDraft
  };
};
