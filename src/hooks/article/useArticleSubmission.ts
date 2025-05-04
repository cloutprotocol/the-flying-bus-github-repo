
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
  const navigationTimersRef = useRef<number[]>([]); // Track navigation timers for cleanup
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
    
    // Cleanup any existing navigation timers
    navigationTimersRef.current.forEach(clearTimeout);
    navigationTimersRef.current = [];
    
    try {
      setIsSubmitting(true);
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
          description: "Your article has been submitted for review.",
          variant: "default",
          duration: 4000, // Longer duration so user sees it
        });
        
        // Delay navigation to ensure UI updates are visible
        // Use multiple navigation attempts with increasing delays
        const timer1 = setTimeout(() => {
          console.log("Navigation attempt 1: Redirecting to article list");
          navigationAttemptedRef.current = true;
          navigate('/admin/articles');
        }, 3000);
        navigationTimersRef.current.push(timer1);
        
        // Second navigation attempt as fallback
        const timer2 = setTimeout(() => {
          console.log("Navigation attempt 2: Fallback with replace flag");
          navigate('/admin/articles', { replace: true });
        }, 4000);
        navigationTimersRef.current.push(timer2);
        
        // Final fallback with force flag
        const timer3 = setTimeout(() => {
          console.log("Navigation attempt 3: Last resort with window.location");
          window.location.href = '/admin/articles';
        }, 5000);
        navigationTimersRef.current.push(timer3);
        
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
      // Delay resetting submission state to ensure all UI updates complete
      setTimeout(() => {
        submittingRef.current = false;
        setIsSubmitting(false);
      }, 1000);
    }
  };

  return {
    isSubmitting,
    setIsSubmitting,
    handleArticleSubmission
  };
}
