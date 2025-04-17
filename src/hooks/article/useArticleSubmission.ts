
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { updateArticleStatus } from '@/services/articles/articleReviewService';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export function useArticleSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleArticleSubmission = async (
    savedArticleId: string, 
    isDraft: boolean = false
  ) => {
    if (!savedArticleId) {
      toast({
        title: "Error",
        description: "Could not determine article ID.",
        variant: "destructive"
      });
      return false;
    }

    if (!isDraft) {
      logger.info(LogSource.EDITOR, 'Submitting article for review', { articleId: savedArticleId });
      
      const statusResult = await updateArticleStatus(savedArticleId, 'pending');
      
      if (!statusResult.success) {
        toast({
          title: "Error",
          description: "There was a problem submitting your article for review.",
          variant: "destructive"
        });
        return false;
      }
      
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
      toast({
        title: "Draft saved",
        description: "Your draft has been saved.",
      });
      return true;
    }
  };

  return {
    isSubmitting,
    setIsSubmitting,
    handleArticleSubmission
  };
}
