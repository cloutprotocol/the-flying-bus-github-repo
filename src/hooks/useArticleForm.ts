
import { useEffect, useState, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useDraftManagement } from './article/useDraftManagement';
import { useArticleSubmission } from './article/useArticleSubmission';
import { useContentManagement } from './article/useContentManagement';
import { useArticleDebug } from './useArticleDebug';
import { useToast } from './use-toast';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { useNavigate } from 'react-router-dom';

const AUTO_SAVE_INTERVAL = 60000;

export const useArticleForm = (
  form: UseFormReturn<any>,
  articleId?: string,
  articleType: string = 'standard',
  isNewArticle: boolean = true
) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const { content, setContent } = useContentManagement(form, articleId, isNewArticle);
  const { draftId, saveStatus, lastSaved, saveDraftToServer } = useDraftManagement(articleId, articleType);
  const { isSubmitting, setIsSubmitting, handleArticleSubmission } = useArticleSubmission();
  const { addDebugStep, updateLastStep } = useArticleDebug();
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Prevent duplicate submissions
  const submittingRef = useRef(false);
  
  useEffect(() => {
    // Set up the mounted ref
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSubmit = async (data: any, isDraft: boolean = false) => {
    // Prevent duplicate submissions
    if (submittingRef.current) {
      console.log("Submission already in progress, ignoring duplicate call");
      return;
    }
    
    try {
      submittingRef.current = true;
      setIsSubmitting(true);
      
      addDebugStep('Form validation passed', {
        formData: {
          title: data.title,
          excerpt: data.excerpt?.substring(0, 20) + '...',
          articleType: data.articleType,
          categoryId: data.categoryId
        }
      });
      
      // Validate required fields
      if (!data.title) {
        toast({
          title: "Validation Error",
          description: "Article title is required",
          variant: "destructive"
        });
        updateLastStep('error', { error: 'Missing title' });
        setIsSubmitting(false);
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
        setIsSubmitting(false);
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
        setIsSubmitting(false);
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
      
      const saveResult = await saveDraftToServer(formData, true);
      
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
          setIsSubmitting(false);
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
        
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
        submittingRef.current = false;
        return;
      }

      if (isDraft) {
        // For drafts, just confirm success
        toast({
          title: "Draft Saved",
          description: "Your draft has been saved successfully",
          variant: "default"
        });
        
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
        submittingRef.current = false;
        return;
      }

      // For submissions, continue with the submission process
      addDebugStep('Changing article status', { 
        articleId: saveResult.articleId,
        targetStatus: isDraft ? 'draft' : 'pending'
      });
      
      try {
        const submissionResult = await handleArticleSubmission(saveResult.articleId, isDraft);
        
        if (submissionResult) {
          updateLastStep('success', { status: isDraft ? 'Draft saved' : 'Submitted for review' });
          addDebugStep('Article submission completed', { 
            isDraft,
            articleId: saveResult.articleId
          }, 'success');
          
          toast({
            title: "Success!",
            description: "Your article has been submitted for review.",
            variant: "default",
          });
          
          // Navigate to articles list after successful submission
          setTimeout(() => {
            if (isMountedRef.current) {
              navigate('/admin/articles');
            }
          }, 1500);
        }
      } catch (error) {
        updateLastStep('error', { error: 'Submission failed' });
        console.error("Article submission error:", error);
        
        // Error toast already shown by handleArticleSubmission
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
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
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
        const formData = form.getValues();
        
        saveDraftToServer({
          ...formData,
          content
        }, true).finally(() => {
          if (isMountedRef.current) {
            setIsAutoSaving(false);
          }
        });
      }, AUTO_SAVE_INTERVAL);
      
      return () => clearTimeout(autoSaveTimer);
    }
  }, [form, content, saveDraftToServer, form.formState.isDirty, isSubmitting, isAutoSaving]);

  const handleSaveDraft = async () => {
    const formData = {
      ...form.getValues(),
      content
    };
    
    await handleSubmit(formData, true);
  };

  return {
    content,
    setContent,
    draftId,
    saveStatus,
    lastSaved,
    isSubmitting,
    handleSubmit,
    handleSaveDraft
  };
};
