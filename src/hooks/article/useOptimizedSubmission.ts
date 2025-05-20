
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { submitForReview } from '@/services/articles/submission/articleSubmitService';

/**
 * Optimized hook for article submission that uses the new SQL functions
 * for combined draft saving and submission in a single transaction
 */
export function useOptimizedSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Prevent duplicate submissions with a ref
  const submittingRef = useRef(false);
  
  const submitArticle = async (formData: any): Promise<boolean> => {
    // Prevent duplicate submissions
    if (submittingRef.current || isSubmitting) {
      logger.info(LogSource.EDITOR, "Submission already in progress, ignoring duplicate call");
      return false;
    }
    
    try {
      // Set submission flags
      submittingRef.current = true;
      setIsSubmitting(true);
      
      // Show submission toast
      toast({
        title: "Submitting article",
        description: "Your article is being processed...",
      });
      
      // Log detailed information about the form data being submitted
      logger.debug(LogSource.EDITOR, 'Article submission data', {
        hasId: !!formData.id,
        title: formData.title?.substring(0, 20),
        dataKeys: Object.keys(formData)
      });
      
      // The key optimization: submit directly with form data using new function
      // This handles both saving and status update in one DB operation
      const { success, error, submissionId } = await submitForReview(formData, true);
      
      if (!success) {
        const errorMessage = error?.message || "There was a problem submitting your article.";
        
        toast({
          title: "Submission Failed",
          description: errorMessage,
          variant: "destructive"
        });
        
        logger.error(LogSource.EDITOR, 'Article submission failed', { error });
        return false;
      }
      
      toast({
        title: "Success!",
        description: "Your article has been submitted for review.",
        variant: "default",
      });
      
      logger.info(LogSource.EDITOR, 'Article submitted successfully', {
        articleId: submissionId
      });
      
      // Navigate immediately to reduce perceived latency
      navigate('/admin/articles');
      return true;
      
    } catch (error) {
      logger.error(LogSource.EDITOR, "Exception in article submission", error);
      
      toast({
        title: "Error",
        description: "There was a problem with your submission.",
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
    submitArticle
  };
}
