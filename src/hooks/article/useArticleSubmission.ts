
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
        return false;
      }
      
      logger.info(LogSource.EDITOR, 'Article submission in progress', { 
        articleId, 
        isDraft
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
        
        // Call the actual submission service
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
            error
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
        
        // Navigate to articles list after successful submission
        setTimeout(() => {
          navigate('/admin/articles');
        }, 1500);
        
        return true;
      }
    } catch (error) {
      addDebugStep('Exception in article submission', { error }, 'error');
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
    setIsSubmitting,
    handleArticleSubmission
  };
}
