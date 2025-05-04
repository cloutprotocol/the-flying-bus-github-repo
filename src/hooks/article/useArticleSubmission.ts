
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { articleSubmissionService } from '@/services/articles/articleSubmissionService';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { handleApiError } from '@/utils/errors';

export function useArticleSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false); // Prevent duplicate submissions
  const navigationAttemptedRef = useRef(false); // Track if navigation was attempted
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleArticleSubmission = async (
    savedArticleId: string, 
    isDraft: boolean = false
  ) => {
    // Prevent duplicate submissions
    if (submittingRef.current) {
      console.log("Submission already in progress, ignoring duplicate call");
      return false;
    }
    
    try {
      submittingRef.current = true;
      navigationAttemptedRef.current = false;
      
      if (!savedArticleId) {
        logger.error(LogSource.EDITOR, 'Article submission failed - missing ID');
        toast({
          title: "Submission Error",
          description: "Could not determine article ID for submission.",
          variant: "destructive"
        });
        return false;
      }

      logger.info(LogSource.EDITOR, 'Article submission in progress', { 
        articleId: savedArticleId, 
        isDraft,
        submissionMethod: isDraft ? 'save_draft' : 'submit_for_review'
      });

      if (!isDraft) {
        // Show an in-progress toast that we'll dismiss on completion
        const pendingToast = toast({
          title: "Submitting Article",
          description: "Your article is being submitted for review...",
        });
        
        // Use the unified submission service
        const statusResult = await articleSubmissionService.submitForReview(savedArticleId);
        
        // Dismiss the pending toast
        pendingToast.dismiss();
        
        if (!statusResult.success) {
          const error = statusResult.error;
          
          // Use our error handling utility for consistent error display
          handleApiError(error, true);
          
          logger.error(LogSource.EDITOR, 'Article submission failed', { 
            articleId: savedArticleId, 
            error: error 
          });
          return false;
        }
        
        logger.info(LogSource.EDITOR, 'Article submitted successfully', { 
          articleId: savedArticleId,
          submissionId: statusResult.submissionId
        });
        
        toast({
          title: "Success!",
          description: "Your article has been submitted for review. Redirecting...",
          variant: "default",
          duration: 3000, // Longer duration so user sees it
        });
        
        // First navigation attempt - primary
        setTimeout(() => {
          console.log("Navigation attempt 1: Redirecting to article list");
          navigationAttemptedRef.current = true;
          navigate('/admin/articles');
          
          // Second navigation attempt - fallback with force flag
          setTimeout(() => {
            // If we're still on the page, try again with force flag
            console.log("Navigation attempt 2: Fallback navigation");
            navigate('/admin/articles', { replace: true });
          }, 300);
        }, 1000);
        
        return true;
      } else {
        logger.info(LogSource.EDITOR, 'Draft saved successfully', { 
          articleId: savedArticleId 
        });
        
        toast({
          title: "Draft saved",
          description: "Your draft has been saved successfully.",
          variant: "default",
        });
        return true;
      }
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Exception in article submission', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during submission. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    setIsSubmitting,
    handleArticleSubmission
  };
}
