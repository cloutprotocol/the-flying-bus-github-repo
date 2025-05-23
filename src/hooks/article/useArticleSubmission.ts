
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArticleDebug } from '../useArticleDebug';
import { useToast } from '../use-toast';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { articleSubmissionService } from '@/services/articles/articleSubmissionService';

export function useArticleSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addDebugStep, updateLastStep } = useArticleDebug();
  
  // Prevent duplicate submissions
  const submittingRef = useRef(false);
  
  const handleArticleSubmission = async (
    articleId: string, 
    isDraft: boolean = false
  ): Promise<boolean> => {
    // Prevent duplicate submissions
    if (submittingRef.current) {
      logger.info(LogSource.EDITOR, "Submission already in progress, ignoring duplicate call");
      return false;
    }
    
    try {
      submittingRef.current = true;
      setIsSubmitting(true);
      
      addDebugStep('Article submission initiated', {
        isDraft,
        articleId
      });
      
      if (!articleId) {
        toast({
          title: "Error",
          description: "Could not determine article ID for submission.",
          variant: "destructive"
        });
        logger.error(LogSource.EDITOR, "Missing article ID during submission");
        return false;
      }
      
      // Check if user session is valid before proceeding
      const { data: sessionData } = await articleSubmissionService.checkSession();
      if (!sessionData || !sessionData.valid) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        });
        logger.error(LogSource.EDITOR, "Invalid user session during submission");
        // Redirect to login
        navigate('/login', { state: { returnTo: window.location.pathname } });
        return false;
      }
      
      logger.info(LogSource.EDITOR, 'Article submission in progress', { 
        articleId, 
        isDraft,
        userHasValidSession: true
      });
      
      if (isDraft) {
        // For drafts, just confirm success
        toast({
          title: "Draft Saved",
          description: "Your draft has been saved successfully",
          variant: "default"
        });
        
        logger.info(LogSource.EDITOR, 'Draft saved successfully', { 
          articleId 
        });
        
        return true;
      } else {
        // For submissions, perform the actual submission process
        addDebugStep('Changing article status', { 
          articleId,
          targetStatus: 'pending'
        });
        
        logger.info(LogSource.EDITOR, 'Submitting article for review', {
          articleId
        });
        
        // Call the actual submission service with await to ensure it completes
        const { success, error } = await articleSubmissionService.submitForReview(articleId);
        
        if (!success) {
          const errorMessage = error?.message || "There was a problem submitting your article.";
          
          toast({
            title: "Submission Failed",
            description: errorMessage,
            variant: "destructive"
          });
          
          logger.error(LogSource.EDITOR, 'Article submission failed', {
            articleId,
            errorDetails: error
          });
          
          updateLastStep('error', { error: errorMessage });
          return false;
        }
        
        toast({
          title: "Success!",
          description: "Your article has been submitted for review.",
          variant: "default",
        });
        
        addDebugStep('Article submission completed', { 
          isDraft,
          articleId
        }, 'success');
        
        logger.info(LogSource.EDITOR, 'Article submitted successfully', {
          articleId
        });
        
        // Increase navigation timeout to ensure DB operations complete
        setTimeout(() => {
          logger.info(LogSource.EDITOR, 'Executing navigation to articles list', {
            articleId
          });
          navigate('/admin/articles');
        }, 3000);
        
        return true;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addDebugStep('Exception in article submission', { error }, 'error');
      logger.error(LogSource.EDITOR, "Exception in article submission", { 
        error, 
        errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      toast({
        title: "Error",
        description: "There was a problem with your submission. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  return {
    isSubmitting,
    setIsSubmitting,
    handleArticleSubmission
  };
}
