import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export const useArticleSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const submitMutation = useMutation(api.articles.submit);

  const submitArticle = async (formData: ArticleFormData): Promise<{ success: boolean; articleId?: string }> => {
    if (!user?.id) {
      throw new Error('User authentication required');
    }

    setIsSubmitting(true);

    try {
      logger.info(LogSource.ARTICLE, 'Submitting article via Convex', {
        articleType: formData.articleType,
        title: formData.title
      });

      // Map formData to Convex mutation args
      const articleId = await submitMutation({
        id: formData.id ? (formData.id as Id<"articles">) : undefined,
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt,
        imageUrl: formData.imageUrl,
        categoryId: formData.categoryId,
        articleType: formData.articleType,
        slug: formData.slug,
        shouldHighlight: formData.shouldHighlight,
        publishImmediately: false,
      });

      toast({
        title: "Article submitted",
        description: "Your article has been submitted for review!",
      });

      // Navigate based on article type
      if (formData.articleType === 'storyboard' && articleId) {
        navigate(`/storyboard/${articleId}`);
      } else {
        navigate('/admin/my-articles');
      }

      return { success: true, articleId };

    } catch (error) {
      logger.error(LogSource.ARTICLE, 'Error submitting article', error);

      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to submit article. Please try again.",
        variant: "destructive"
      });

      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitArticle,
    isSubmitting
  };
};
