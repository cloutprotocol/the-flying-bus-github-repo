
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { saveDraftOptimized } from '@/services/articles/draft/optimizedDraftService';
import { submitArticleOptimized } from '@/services/articles/articleSubmissionService';
import { supabase } from '@/integrations/supabase/client';
import ArticleFormContent from './Layout/ArticleFormContent';
import EnhancedFormActions from './EnhancedFormActions';
import ArticleEditorDebugPanel from './ArticleEditorDebugPanel';

interface ArticleFormProps {
  articleId?: string;
  articleType: string;
  isNewArticle: boolean;
  categorySlug?: string;
  categoryName?: string;
}

const ArticleForm: React.FC<ArticleFormProps> = ({ 
  articleId, 
  articleType = 'standard',
  isNewArticle = true,
  categorySlug,
  categoryName
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Simple form state
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

  console.log('ArticleForm: Rendering with props:', {
    articleId,
    articleType,
    isNewArticle,
    categorySlug,
    categoryName,
    formData
  });

  // Simple category lookup on mount
  useEffect(() => {
    if (isNewArticle && (categorySlug || categoryName) && !formData.categoryId) {
      const lookupCategory = async () => {
        try {
          console.log('ArticleForm: Looking up category:', { categorySlug, categoryName });
          
          let query = supabase.from('categories').select('id, name, slug');
          
          if (categorySlug) {
            query = query.eq('slug', categorySlug);
          } else if (categoryName) {
            query = query.eq('name', categoryName);
          }
          
          const { data, error } = await query.maybeSingle();
          
          if (data && !error) {
            console.log('ArticleForm: Found category:', data);
            setFormData(prev => ({ ...prev, categoryId: data.id }));
          } else {
            console.warn('ArticleForm: Category not found');
            toast({
              title: "Category not found",
              description: `Could not find category "${categorySlug || categoryName}". Please select a category manually.`,
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('ArticleForm: Category lookup error:', error);
        }
      };
      
      lookupCategory();
    }
  }, [categorySlug, categoryName, isNewArticle, formData.categoryId, toast]);

  // Simple field update function
  const updateField = (field: keyof ArticleFormData, value: any) => {
    console.log('ArticleForm: Updating field:', field, value);
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  // Simple validation
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

  // Simple save draft function
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

  // Simple submit function
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

  return (
    <div className="space-y-6">
      <ArticleEditorDebugPanel
        formData={formData}
        isSubmitting={isSubmitting}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        effectiveArticleId={articleId || formData.id}
        categorySlug={categorySlug}
        categoryName={categoryName}
        isNewArticle={isNewArticle}
      />
      
      <ArticleFormContent 
        formData={formData}
        onChange={updateField}
        isSubmitting={isSubmitting}
      />
      
      <EnhancedFormActions 
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        onViewRevisions={undefined}
        isSubmitting={isSubmitting}
        isDirty={hasUnsavedChanges}
        isSaving={isSaving}
        saveStatus={hasUnsavedChanges ? 'idle' : 'saved'}
        hasRevisions={false}
        form={null}
        content={formData.content}
      />
    </div>
  );
};

export default ArticleForm;
