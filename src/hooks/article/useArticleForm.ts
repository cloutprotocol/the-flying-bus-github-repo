import { useEffect, useState, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useDraftManagement } from './useDraftManagement';
import { useArticleSubmission } from './useArticleSubmission';
import { useContentManagement } from './useContentManagement';
import { useArticleDebug } from '../useArticleDebug';
import { useToast } from '../use-toast';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

const AUTO_SAVE_INTERVAL = 60000;

export const useArticleForm = (
  form: UseFormReturn<any>,
  articleId?: string,
  articleType: string = 'standard',
  isNewArticle: boolean = true
) => {
  const { toast } = useToast();
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { content, setContent } = useContentManagement(form, articleId, isNewArticle);
  const { draftId, saveStatus, lastSaved, saveDraftToServer } = useDraftManagement(articleId, articleType);
  const { isSubmitting, submitArticle } = useArticleSubmission();
  const { addDebugStep, updateLastStep } = useArticleDebug();
  
  const isMountedRef = useRef(true);
  const submittingRef = useRef(false);
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSubmit = async (data: any, isDraft: boolean = false) => {
    if (submittingRef.current) {
      console.log("Submission already in progress, ignoring duplicate call");
      return;
    }
    
    try {
      submittingRef.current = true;
      
      addDebugStep('Form validation passed', {
        formData: {
          title: data.title,
          excerpt: data.excerpt?.substring(0, 20) + '...',
          articleType: data.articleType,
          categoryId: data.categoryId
        }
      });
      
      if (!data.title) {
        toast({
          title: "Validation Error",
          description: "Article title is required",
          variant: "destructive"
        });
        updateLastStep('error', { error: 'Missing title' });
        submittingRef.current = false;
        return;
      }
      
      if (!data.categoryId) {
        toast({
          title: "Validation Error",
          description: "Please select a category",
          variant: "destructive"
        });
        updateLastStep('error', { error: 'Missing category' });
        submittingRef.current = false;
        return;
      }
      
      if (!content || content.trim() === '') {
        toast({
          title: "Validation Error",
          description: "Article content is required",
          variant: "destructive"
        });
        updateLastStep('error', { error: 'Missing content' });
        submittingRef.current = false;
        return;
      }
      
      const formData = {
        ...data,
        content: content,
        status: isDraft ? 'draft' : 'pending'
      };
      
      addDebugStep('Saving draft before submission', { 
        articleId, 
        draftId, 
        formData: {
          title: formData.title,
          categoryId: formData.categoryId,
          articleType: formData.articleType,
          status: formData.status
        }
      });
      
      console.log("Saving draft with content:", {
        contentLength: content.length,
        contentPreview: content.substring(0, 100) + '...'
      });
      
      setIsSaving(true);
      const saveResult = await saveDraftToServer(formData, true);
      setIsSaving(false);
      
      if (!saveResult.success) {
        updateLastStep('error', { error: 'Failed to save draft' });
        logger.error(LogSource.EDITOR, 'Failed to save draft during submission', {
          saveResult,
          isDraft
        });
        
        toast({
          title: "Error",
          description: "There was a problem saving your article.",
          variant: "destructive"
        });
        
        if (isMountedRef.current) {
          // Note: isSubmitting is managed by useArticleSubmission hook
        }
        submittingRef.current = false;
        return;
      }
      
      updateLastStep('success', { articleId: saveResult.articleId });
      
      if (!saveResult.articleId) {
        addDebugStep('Error: No article ID returned', null, 'error');
        logger.error(LogSource.EDITOR, 'No article ID returned from draft save');
        toast({
          title: "Error",
          description: "Could not determine article ID.",
          variant: "destructive"
        });
        
        submittingRef.current = false;
        return;
      }

      if (isDraft) {
        toast({
          title: "Draft Saved",
          description: "Your draft has been saved successfully",
          variant: "default"
        });
        
        submittingRef.current = false;
        return;
      }

      addDebugStep('Changing article status', { 
        articleId: saveResult.articleId,
        targetStatus: isDraft ? 'draft' : 'pending'
      });
      
      try {
        // Call the actual article submission service
        const submissionResult = await submitArticle(formData);
        
        if (submissionResult.success) {
          updateLastStep('success', { status: isDraft ? 'Draft saved' : 'Submitted for review' });
          addDebugStep('Article submission completed', { 
            isDraft,
            articleId: saveResult.articleId
          }, 'success');
        }
      } catch (error) {
        updateLastStep('error', { error: 'Submission failed' });
        console.error("Article submission error:", error);
      }
      
    } catch (error) {
      addDebugStep('Exception in article submission', { error }, 'error');
      logger.error(LogSource.EDITOR, "Exception in article submission", error);
      toast({
        title: "Error",
        description: "There was a problem with your submission.",
        variant: "destructive"
      });
    } finally {
      submittingRef.current = false;
    }
  };

  useEffect(() => {
    const isDirty = form.formState.isDirty;
    const contentChanged = content !== '';
    
    if ((isDirty || contentChanged) && !isSubmitting) {
      const autoSaveTimer = setTimeout(() => {
        if (isAutoSaving) return;
        
        setIsAutoSaving(true);
        setIsSaving(true);
        
        const formData = form.getValues();
        
        saveDraftToServer({
          ...formData,
          content
        }, true).finally(() => {
          if (isMountedRef.current) {
            setIsAutoSaving(false);
            setIsSaving(false);
          }
        });
      }, AUTO_SAVE_INTERVAL);
      
      return () => clearTimeout(autoSaveTimer);
    }
  }, [form, content, saveDraftToServer, form.formState.isDirty, isSubmitting, isAutoSaving]);

  const handleSaveDraft = async () => {
    setIsSaving(true);
    
    const formData = {
      ...form.getValues(),
      content
    };
    
    try {
      await handleSubmit(formData, true);
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
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
    handleSaveDraft
  };
};
