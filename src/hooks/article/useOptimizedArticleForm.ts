
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { ArticleFormData, StoryboardEpisode } from '@/types/ArticleEditorTypes';
import { submitArticleOptimized } from '@/services/articles/articleSubmissionService';
import { saveDraftOptimized } from '@/services/articles/draft/optimizedDraftService';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

const initialFormData: ArticleFormData = {
  title: '',
  content: '',
  excerpt: '',
  imageUrl: '',
  categoryId: '',
  slug: '',
  articleType: 'standard',
  storyboardEpisodes: []
};

const initialStoryboardEpisode: StoryboardEpisode = {
  title: 'Episode 1',
  description: '',
  videoUrl: '',
  thumbnailUrl: '',
  duration: '',
  number: 1,
  content: ''
};

export const useOptimizedArticleForm = (initialData?: Partial<ArticleFormData>) => {
  const [formData, setFormData] = useState<ArticleFormData>(() => ({
    ...initialFormData,
    ...initialData,
    // Initialize with one episode for storyboard articles
    storyboardEpisodes: initialData?.articleType === 'storyboard' 
      ? initialData?.storyboardEpisodes?.length ? initialData.storyboardEpisodes : [initialStoryboardEpisode]
      : initialData?.storyboardEpisodes || []
  }));
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Auto-generate slug from title
  useEffect(() => {
    if (formData.title && !formData.slug) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({ ...prev, slug }));
    }
  }, [formData.title, formData.slug]);

  // Initialize storyboard episodes when article type changes
  useEffect(() => {
    if (formData.articleType === 'storyboard' && (!formData.storyboardEpisodes || formData.storyboardEpisodes.length === 0)) {
      setFormData(prev => ({
        ...prev,
        storyboardEpisodes: [initialStoryboardEpisode]
      }));
    }
  }, [formData.articleType]);

  const updateField = useCallback((field: keyof ArticleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  }, []);

  const validateForm = useCallback((): string[] => {
    const errors: string[] = [];

    if (!formData.title.trim()) {
      errors.push('Title is required');
    }

    if (!formData.categoryId) {
      errors.push('Category is required');
    }

    if (formData.articleType === 'storyboard') {
      if (!formData.storyboardEpisodes || formData.storyboardEpisodes.length === 0) {
        errors.push('At least one episode is required for storyboard series');
      } else {
        formData.storyboardEpisodes.forEach((episode, index) => {
          if (!episode.title.trim()) {
            errors.push(`Episode ${index + 1} title is required`);
          }
        });
      }
    } else if (formData.articleType === 'video') {
      if (!formData.videoUrl) {
        errors.push('Video URL is required for video articles');
      }
    } else if (formData.articleType === 'debate') {
      if (!formData.debateSettings?.question?.trim()) {
        errors.push('Debate question is required');
      }
    } else {
      if (!formData.content.trim()) {
        errors.push('Content is required');
      }
    }

    return errors;
  }, [formData]);

  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to save drafts.",
        variant: "destructive"
      });
      return false;
    }

    setIsSaving(true);

    try {
      logger.info(LogSource.ARTICLE, 'Saving draft', {
        articleType: formData.articleType,
        title: formData.title
      });

      const result = await saveDraftOptimized(user.id, formData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save draft');
      }

      // Update form data with the returned article ID
      if (result.articleId && !formData.id) {
        setFormData(prev => ({ ...prev, id: result.articleId }));
      }

      setHasUnsavedChanges(false);
      
      toast({
        title: "Draft saved",
        description: "Your changes have been saved successfully.",
      });

      return true;

    } catch (error) {
      logger.error(LogSource.ARTICLE, 'Error saving draft', error);
      
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save draft. Please try again.",
        variant: "destructive"
      });

      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, formData, toast]);

  const submitForReview = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to submit articles.",
        variant: "destructive"
      });
      return false;
    }

    const errors = validateForm();
    if (errors.length > 0) {
      toast({
        title: "Validation failed",
        description: errors.join('. '),
        variant: "destructive"
      });
      return false;
    }

    setIsSubmitting(true);

    try {
      logger.info(LogSource.ARTICLE, 'Submitting article for review', {
        articleType: formData.articleType,
        title: formData.title
      });

      const result = await submitArticleOptimized(user.id, formData, false);

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit article');
      }

      setHasUnsavedChanges(false);

      const successMessage = formData.articleType === 'storyboard' 
        ? "Your storyboard series has been submitted successfully!"
        : "Your article has been submitted for review!";

      toast({
        title: "Submission successful",
        description: successMessage,
      });

      // Navigate based on article type
      if (formData.articleType === 'storyboard' && result.articleId) {
        navigate(`/storyboard/${result.articleId}`);
      } else {
        navigate('/admin/my-articles');
      }

      return true;

    } catch (error) {
      logger.error(LogSource.ARTICLE, 'Error submitting article', error);
      
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to submit article. Please try again.",
        variant: "destructive"
      });

      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [user?.id, formData, validateForm, toast, navigate]);

  return {
    formData,
    updateField,
    isSubmitting,
    isSaving,
    hasUnsavedChanges,
    saveDraft,
    submitForReview,
    validateForm
  };
};
