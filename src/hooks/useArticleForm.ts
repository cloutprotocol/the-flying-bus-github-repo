
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { saveDraft, getDraftById } from '@/services/draftService';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { UseFormReturn } from 'react-hook-form';
import { DraftSaveStatus } from '@/types/ArticleEditorTypes';
import { updateArticleStatus } from '@/services/articles/articleReviewService';

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
            readingLevel: draft.readingLevel || 'Intermediate', // Default
            status: draft.status,
            articleType: draft.articleType,
            videoUrl: draft.videoUrl || ''
          });
          
          setContent(draft.content || '');
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
      return { success: true, articleId: result.articleId };
      
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Exception auto-saving draft', { error });
      setSaveStatus('error');
      return { success: false };
    }
  }, [draftId, content, articleType]);

  // Submit handler
  const handleSubmit = async (data: any, isDraft: boolean = false) => {
    try {
      const formData = {
        ...data,
        content: content
      };
      
      if (isDraft) {
        formData.status = 'draft';
      } else {
        formData.status = isNewArticle ? 'pending' : form.getValues('status');
      }
      
      logger.info(LogSource.EDITOR, 'Submitting article form', {
        isDraft,
        articleType,
        isNewArticle
      });
      
      // First save the draft to ensure we have an article ID
      const saveResult = await saveDraftToServer(formData, true);
      
      if (!saveResult.success) {
        toast({
          title: "Error",
          description: "There was a problem saving your article.",
          variant: "destructive"
        });
        return;
      }
      
      // For regular submissions (not drafts), update the status
      if (!isDraft) {
        const savedArticleId = saveResult.articleId || draftId;
        
        if (!savedArticleId) {
          toast({
            title: "Error",
            description: "Could not determine article ID.",
            variant: "destructive"
          });
          return;
        }
        
        // Update the status to pending for review
        const statusResult = await updateArticleStatus(savedArticleId, 'pending');
        
        if (!statusResult.success) {
          toast({
            title: "Error",
            description: "There was a problem submitting your article for review.",
            variant: "destructive"
          });
          return;
        }
        
        toast({
          title: "Article submitted for review",
          description: "Your article has been submitted for review.",
        });
        
        // Navigate to the articles list
        navigate('/admin/articles');
      } else {
        toast({
          title: "Draft saved",
          description: "Your draft has been saved.",
        });
      }
    } catch (error) {
      logger.error(LogSource.EDITOR, "Exception in article submission", error);
      toast({
        title: "Error",
        description: "There was a problem with your submission.",
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
