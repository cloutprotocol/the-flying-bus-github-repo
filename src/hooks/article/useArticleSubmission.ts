
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { updateArticleStatus, submitArticleForReview } from '@/services/articles/articleReviewService';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError } from '@/utils/errors/types';

export function useArticleSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleArticleSubmission = async (
    savedArticleId: string, 
    isDraft: boolean = false
  ) => {
    try {
      if (!savedArticleId) {
        toast({
          title: "Error",
          description: "Could not determine article ID.",
          variant: "destructive"
        });
        logger.error(LogSource.EDITOR, 'Article submission failed - missing ID');
        return false;
      }

      logger.info(LogSource.EDITOR, 'Article submission in progress', { 
        articleId: savedArticleId, 
        isDraft,
        submissionMethod: isDraft ? 'save_draft' : 'submit_for_review'
      });

      if (!isDraft) {
        logger.info(LogSource.EDITOR, 'Submitting article for review', { 
          articleId: savedArticleId 
        });
        
        const statusResult = await submitArticleForReview(savedArticleId);
        
        if (!statusResult.success) {
          const errorMessage = statusResult.error instanceof ApiError 
            ? statusResult.error.message 
            : "There was a problem submitting your article for review.";
            
          logger.error(LogSource.EDITOR, 'Article submission failed', { 
            articleId: savedArticleId, 
            error: statusResult.error 
          });
          
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive"
          });
          return false;
        }
        
        logger.info(LogSource.EDITOR, 'Article submitted successfully', { 
          articleId: savedArticleId
        });
        
        toast({
          title: "Success",
          description: "Your article has been submitted for review.",
        });
        
        // Navigate to the articles list after a brief delay
        setTimeout(() => {
          navigate('/admin/articles');
        }, 1500);
        
        return true;
      } else {
        logger.info(LogSource.EDITOR, 'Draft saved successfully', { 
          articleId: savedArticleId 
        });
        
        toast({
          title: "Draft saved",
          description: "Your draft has been saved.",
        });
        return true;
      }
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Exception in article submission', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during submission.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    isSubmitting,
    setIsSubmitting,
    handleArticleSubmission
  };
}
