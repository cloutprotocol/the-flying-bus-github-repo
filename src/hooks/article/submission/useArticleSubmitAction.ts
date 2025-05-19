
import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useArticleDebug } from '@/hooks/useArticleDebug';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export interface ArticleSubmitOptions {
  draftId?: string;
  articleId?: string;
  articleType: string;
  isNewArticle: boolean;
  isSubmitting: boolean;
  setSubmitting: (isSubmitting: boolean) => void;
  isSaving: boolean;
  setSaving: (isSaving: boolean) => void;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  saveDraft: (formData: any) => Promise<{ success: boolean; articleId?: string; error?: any }>;
  submitForReview: (articleId: string) => Promise<{ success: boolean; error?: any }>;
  setDraftId?: (id: string) => void;
}

export function useArticleSubmitAction({
  draftId,
  articleId,
  articleType,
  isNewArticle,
  isSubmitting,
  setSubmitting,
  isSaving,
  setSaving,
  setSaveStatus,
  saveDraft,
  submitForReview,
  setDraftId
}: ArticleSubmitOptions) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addDebugStep, updateLastStep } = useArticleDebug();
  
  // Prevent duplicate submissions
  const submittingRef = useRef(false);
  const isMountedRef = useRef(true);
  
  // Disable auto-save during and after submission
  const submissionCompletedRef = useRef(false);
  
  // Setup mounted ref
  useEffect(() => {
    isMountedRef.current = true;
    // Reset submission completed flag on mount
    submissionCompletedRef.current = false;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSubmit = async (data: any) => {
    // Prevent duplicate submissions
    if (submittingRef.current || isSubmitting) {
      logger.info(LogSource.EDITOR, "Submission already in progress, skipping duplicate call");
      return;
    }
    
    // Mark submission as started to prevent auto-saves from interfering
    submissionCompletedRef.current = true;
    
    console.log("Submit button clicked", { data, content: data.content });
    try {
      submittingRef.current = true;
      setSubmitting(true);
      addDebugStep('Article submission initiated', {
        isDraft: false,
        articleType,
        isNewArticle,
        formData: {
          title: data.title,
          categoryId: data.categoryId, 
          contentLength: data.content?.length || 0
        }
      });
      
      logger.info(LogSource.EDITOR, 'Article submission started', {
        draftId,
        articleType,
        contentLength: data.content?.length || 0
      });
      
      // Validate required fields before submission
      if (!data.title || data.title.trim() === '') {
        toast({
          title: "Validation Error",
          description: "Article title is required",
          variant: "destructive"
        });
        updateLastStep('error', { error: 'Missing title' });
        setSubmitting(false);
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
        setSubmitting(false);
        submittingRef.current = false;
        return;
      }
      
      if (!data.content || data.content.trim() === '') {
        toast({
          title: "Validation Error",
          description: "Article content is required", 
          variant: "destructive"
        });
        updateLastStep('error', { error: 'Missing content' });
        setSubmitting(false);
        submittingRef.current = false;
        return;
      }
      
      // Show submission in progress toast
      const submittingToast = toast({
        title: "Submitting article",
        description: "Your article is being submitted for review...",
      });
      
      let articleIdToSubmit = draftId || articleId;
      
      // Only save draft if we don't already have an article ID (brand new article)
      // or if we have unsaved changes
      if (!articleIdToSubmit || data.isDirty) {
        // First save as draft to ensure all content is saved
        const formData = {
          ...data,
          status: 'draft' // Always save as draft first
        };
        
        addDebugStep('Saving draft before submission', { 
          articleId, 
          draftId, 
          formData: {
            title: formData.title,
            categoryId: formData.categoryId,
            articleType: formData.articleType,
            contentLength: data.content?.length || 0
          }
        });
        
        // Use the unified service to save the draft
        setSaving(true);
        setSaveStatus('saving');
        
        console.log("Saving draft before submission:", {
          contentType: typeof data.content,
          contentLength: data.content?.length || 0,
          title: formData.title,
          draftId
        });
        
        // Dismiss the submitting toast to prevent toast flooding
        submittingToast.dismiss();
        
        const saveResult = await saveDraft(formData);
        
        setSaving(false);
        
        if (!saveResult.success) {
          console.error("Failed to save draft:", saveResult.error);
          updateLastStep('error', { error: 'Failed to save draft' });
          logger.error(LogSource.EDITOR, 'Failed to save draft during submission', {
            saveResult,
            error: saveResult.error
          });
          
          toast({
            title: "Error",
            description: "There was a problem saving your article.",
            variant: "destructive"
          });
          setSubmitting(false);
          submittingRef.current = false;
          return;
        }
        
        updateLastStep('success', { articleId: saveResult.articleId });
        setSaveStatus('saved');
        
        // Update articleIdToSubmit with the saved article ID
        articleIdToSubmit = saveResult.articleId;
        
        if (!articleIdToSubmit) {
          console.error("No article ID returned from draft save");
          addDebugStep('Error: No article ID returned', null, 'error');
          logger.error(LogSource.EDITOR, 'No article ID returned from draft save');
          toast({
            title: "Error",
            description: "Could not determine article ID.",
            variant: "destructive"
          });
          setSubmitting(false);
          submittingRef.current = false;
          return;
        }
      }

      // Now submit for review using the unified service
      addDebugStep('Submitting article for review', { 
        articleId: articleIdToSubmit
      });
      
      console.log("Calling submitForReview with articleId:", articleIdToSubmit);
      logger.info(LogSource.EDITOR, 'Calling submitForReview', {
        articleId: articleIdToSubmit,
        timestamp: new Date().toISOString()
      });
      
      // Important: We now await the submission result properly
      // This ensures the status update happens before we proceed
      const submissionResult = await submitForReview(articleIdToSubmit);
      
      // Log the result immediately after the operation completes
      logger.info(LogSource.EDITOR, 'submitForReview completed', {
        success: submissionResult.success,
        error: submissionResult.error,
        timestamp: new Date().toISOString()
      });
      
      if (!submissionResult.success) {
        console.error("Submission failed:", submissionResult.error);
        const errorMessage = submissionResult.error?.message || "There was a problem submitting your article for review.";
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
        
        updateLastStep('error', { error: submissionResult.error });
        setSubmitting(false);
        submittingRef.current = false;
        return;
      }
      
      console.log("Article submitted successfully!");
      
      // Update draft ID if this was first submission
      if (!draftId && !articleId && articleIdToSubmit && setDraftId) {
        setDraftId(articleIdToSubmit);
      }
      
      toast({
        title: "Success",
        description: "Your article has been submitted for review.",
      });
      
      updateLastStep('success', { status: 'Submitted for review' });
      addDebugStep('Article submission completed', { 
        articleId: articleIdToSubmit
      }, 'success');
      
      // Increased navigation delay to ensure DB operations complete
      // Important: Log this delay so we can track it
      const navigationDelay = 3000; // Increased from 1500ms to 3000ms
      logger.info(LogSource.EDITOR, `Scheduling navigation after ${navigationDelay}ms delay`, {
        articleId: articleIdToSubmit,
        timestamp: new Date().toISOString()
      });
      
      // Navigate to articles list after successful submission
      setTimeout(() => {
        logger.info(LogSource.EDITOR, "Navigating to /admin/articles after submission", {
          timestamp: new Date().toISOString()
        });
        navigate('/admin/articles');
      }, navigationDelay);
      
      return articleIdToSubmit;
    } catch (error) {
      console.error("Exception in article submission:", error);
      addDebugStep('Exception in article submission', { error }, 'error');
      logger.error(LogSource.EDITOR, "Exception in article submission", error);
      toast({
        title: "Error",
        description: "There was a problem with your submission.",
        variant: "destructive"
      });
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
      submittingRef.current = false; // Reset the submitting flag
    }
  };

  // Return the submission completed ref to let components know if auto-save should run
  return {
    handleSubmit,
    submissionCompletedRef
  };
}
