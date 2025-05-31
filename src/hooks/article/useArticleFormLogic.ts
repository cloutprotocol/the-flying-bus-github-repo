
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { saveDraftOptimized } from '@/services/articles/draft/optimizedDraftService';
import { submitArticleOptimized } from '@/services/articles/articleSubmissionService';

export const useArticleFormLogic = (
  articleId?: string,
  articleType: string = 'standard'
) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<ArticleFormData>({
    title: '',
    content: '',
    excerpt: '',
    imageUrl: '',
    categoryId: '',
    slug: '',
    articleType: articleType as any,
    storyboardEpisodes: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const updateField = (field: keyof ArticleFormData, value: any) => {
    console.log('ArticleForm: Updating field:', field, value);
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.title.trim()) {
      errors.push('Title is required');
    }
    
    if (!formData.categoryId) {
      errors.push('Category is required');
    }
    
    if (!formData.content.trim()) {
      errors.push('Content is required');
    }
    
    return errors;
  };

  const handleSaveDraft = async (): Promise<void> => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to save drafts.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveDraftOptimized(user.id, formData);
      
      if (result.success) {
        if (result.articleId && !formData.id) {
          setFormData(prev => ({ ...prev, id: result.articleId }));
        }
        setHasUnsavedChanges(false);
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully.",
        });
      } else {
        throw new Error(result.error || 'Failed to save draft');
      }
    } catch (error) {
      console.error('ArticleForm: Save draft error:', error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save draft. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to submit articles.",
        variant: "destructive"
      });
      return;
    }

    const errors = validateForm();
    if (errors.length > 0) {
      toast({
        title: "Validation failed",
        description: errors.join('. '),
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitArticleOptimized(user.id, formData, false);
      
      if (result.success) {
        setHasUnsavedChanges(false);
        toast({
          title: "Submission successful",
          description: "Your article has been submitted for review!",
        });
        navigate('/admin/my-articles');
      } else {
        throw new Error(result.error || 'Failed to submit article');
      }
    } catch (error) {
      console.error('ArticleForm: Submit error:', error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to submit article. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    setFormData,
    updateField,
    isSubmitting,
    isSaving,
    hasUnsavedChanges,
    handleSaveDraft,
    handleSubmit,
    validateForm
  };
};
