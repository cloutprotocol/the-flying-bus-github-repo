
import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useArticleDebug } from '@/hooks/useArticleDebug';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { useValidation } from '@/providers/ValidationProvider';
import { createArticleSchema } from '@/utils/validation/articleValidation';

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
  const { addDebugStep } = useArticleDebug();
  const { validateForm } = useValidation();
  
  // Prevent duplicate submissions and track submission state
  const submittingRef = useRef(false);
  const isMountedRef = useRef(true);
  
  // Disable auto-save during and after submission
  const submissionCompletedRef = useRef(false);
  
  // Setup mounted ref
  useEffect(() => {
    isMountedRef.current = true;
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
    
    // Lock submission to prevent race conditions
    submittingRef.current = true;
    setSubmitting(true);
    
    // Mark submission as started to prevent auto-saves from interfering
    submissionCompletedRef.current = true;
    
    try {
      // Centralized validation
      const validationResult = validateForm(createArticleSchema, data, {
        context: 'article_submission',
        showToast: true
      });
      
      if (!validationResult.isValid) {
        setSubmitting(false);
        submittingRef.current = false;
        return;
      }
      
      // Show submission toast
      toast({
        title: "Submitting article",
        description: "Your article is being submitted for review...",
      });
      
      let articleIdToSubmit = draftId || articleId;
      
      // Save as draft if needed (new article or has changes)
      if (!articleIdToSubmit || data.isDirty) {
        const formData = { ...data, status: 'draft' };
        
        setSaving(true);
        setSaveStatus('saving');
        
        // Save the draft first
        const saveResult = await saveDraft(formData);
        
        setSaving(false);
        
        if (!saveResult.success) {
          toast({
            title: "Error",
            description: "There was a problem saving your article.",
            variant: "destructive"
          });
          setSubmitting(false);
          submittingRef.current = false;
          return;
        }
        
        setSaveStatus('saved');
        
        // Update the article ID
        articleIdToSubmit = saveResult.articleId;
        
        if (!articleIdToSubmit) {
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

      // Submit for review using the optimized procedure
      const submissionResult = await submitForReview(articleIdToSubmit);
      
      if (!submissionResult.success) {
        const errorMessage = submissionResult.error?.message || "There was a problem submitting your article for review.";
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
        
        setSubmitting(false);
        submittingRef.current = false;
        return;
      }
      
      // Update draft ID if needed
      if (!draftId && !articleId && articleIdToSubmit && setDraftId) {
        setDraftId(articleIdToSubmit);
      }
      
      // Success toast
      toast({
        title: "Success",
        description: "Your article has been submitted for review.",
      });
      
      // Navigate immediately without delay
      navigate('/admin/articles');
      
      return articleIdToSubmit;
    } catch (error) {
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
