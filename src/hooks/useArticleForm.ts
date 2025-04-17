import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Auto-save draft periodically
  const saveDraftToServer = useCallback(async (formData: any, isDirty: boolean) => {
    if (!isDirty && draftId) {
      return { success: true, articleId: draftId };
    }
    
    try {
      setSaveStatus('saving');
      
      const draftData = {
        ...formData,
        content,
        status: 'draft'
      };
      
      logger.info(LogSource.EDITOR, 'Saving draft', {
        draftId,
        articleType,
        isDirty
      });
      
      const result = await saveDraft(draftId || '', draftData);
      
      if (result.error) {
        logger.error(LogSource.EDITOR, 'Error saving draft', { error: result.error });
        setSaveStatus('error');
        return { success: false, articleId: draftId };
      }
      
      if (!draftId && result.articleId) {
        setDraftId(result.articleId);
      }
      
      setLastSaved(new Date());
      setSaveStatus('saved');
      return { success: true, articleId: result.articleId || draftId };
      
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Exception saving draft', { error });
      setSaveStatus('error');
      return { success: false, articleId: draftId };
    }
  }, [draftId, content, articleType]);

  // Submit handler
  const handleSubmit = async (data: any, isDraft: boolean = false) => {
    try {
      setIsSubmitting(true);
      
      const formData = {
        ...data,
        content: content,
        status: isDraft ? 'draft' : 'pending'
      };
      
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
        setIsSubmitting(false);
        return;
      }
      
      const savedArticleId = saveResult.articleId;
      
      if (!savedArticleId) {
        toast({
          title: "Error",
          description: "Could not determine article ID.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      // For regular submissions (not drafts), update the status
      if (!isDraft) {
        logger.info(LogSource.EDITOR, 'Submitting article for review', { articleId: savedArticleId });
        
        const statusResult = await updateArticleStatus(savedArticleId, 'pending');
        
        if (!statusResult.success) {
          toast({
            title: "Error",
            description: "There was a problem submitting your article for review.",
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }
        
        toast({
          title: "Success",
          description: "Your article has been submitted for review.",
        });
        
        // Navigate to the articles list after a brief delay
        setTimeout(() => {
          navigate('/admin/articles');
        }, 1500);
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
    } finally {
      setIsSubmitting(false);
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
    isSubmitting,
    handleSubmit,
    handleSaveDraft
  };
};
