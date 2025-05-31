import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { saveDraftOptimized } from '@/services/articles/draft/optimizedDraftService';
import { submitArticleOptimized } from '@/services/articles/articleSubmissionService';
import { supabase } from '@/integrations/supabase/client';
import { articleFormSchema, ArticleFormSchemaType } from '@/utils/validation/articleFormSchema';
import ArticleFormContent from './Layout/ArticleFormContent';
import EnhancedFormActions from './EnhancedFormActions';
import ArticleEditorDebugPanel from './ArticleEditorDebugPanel';
import { Form } from '@/components/ui/form';

interface ArticleFormProps {
  articleId?: string;
  articleType: string;
  isNewArticle: boolean;
  categorySlug?: string;
  categoryName?: string;
}

// Map route slugs to database slugs for category lookup
const SLUG_MAPPING: Record<string, string> = {
  'in-the-neighborhood': 'neighborhood',
  'spice': 'spice-it-up',
  'school': 'school-news'
};

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

  // Initialize form with React Hook Form including all required default values
  const form = useForm<ArticleFormSchemaType>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: '',
      content: '',
      excerpt: '',
      imageUrl: '',
      categoryId: '',
      slug: '',
      articleType: articleType as any,
      status: 'draft',
      publishDate: null,
      shouldHighlight: false,
      allowVoting: false,
      debateSettings: {
        question: '',
        yesPosition: '',
        noPosition: '',
        votingEnabled: true,
        voting_ends_at: null
      },
      storyboardEpisodes: []
    }
  });

  const { handleSubmit, watch, setValue, formState: { isDirty, isSubmitting } } = form;
  const [isSaving, setIsSaving] = React.useState(false);

  console.log('ArticleForm: Rendering with props:', {
    articleId,
    articleType,
    isNewArticle,
    categorySlug,
    categoryName,
    formData: form.getValues()
  });

  // Category lookup on mount
  useEffect(() => {
    if (isNewArticle && (categorySlug || categoryName) && !form.getValues('categoryId')) {
      const lookupCategory = async () => {
        try {
          console.log('ArticleForm: Looking up category:', { categorySlug, categoryName });
          
          let query = supabase.from('categories').select('id, name, slug');
          
          if (categorySlug) {
            // First try direct slug match
            const directQuery = query.eq('slug', categorySlug);
            const { data: directData, error: directError } = await directQuery.maybeSingle();
            
            if (directData && !directError) {
              console.log('ArticleForm: Found category with direct slug:', directData);
              setValue('categoryId', directData.id);
              return;
            }
            
            // Try mapped slug if direct match fails
            const mappedSlug = SLUG_MAPPING[categorySlug];
            if (mappedSlug) {
              console.log('ArticleForm: Trying mapped slug:', { originalSlug: categorySlug, mappedSlug });
              const mappedQuery = supabase.from('categories').select('id, name, slug').eq('slug', mappedSlug);
              const { data: mappedData, error: mappedError } = await mappedQuery.maybeSingle();
              
              if (mappedData && !mappedError) {
                console.log('ArticleForm: Found category with mapped slug:', mappedData);
                setValue('categoryId', mappedData.id);
                return;
              }
            }
          } else if (categoryName) {
            query = query.eq('name', categoryName);
            const { data, error } = await query.maybeSingle();
            
            if (data && !error) {
              console.log('ArticleForm: Found category by name:', data);
              setValue('categoryId', data.id);
              return;
            }
          }
          
          console.warn('ArticleForm: Category not found');
          toast({
            title: "Category not found",
            description: `Could not find category "${categorySlug || categoryName}". Please select a category manually.`,
            variant: "destructive"
          });
        } catch (error) {
          console.error('ArticleForm: Category lookup error:', error);
        }
      };
      
      lookupCategory();
    }
  }, [categorySlug, categoryName, isNewArticle, form, setValue, toast]);

  // Convert form data to ArticleFormData format for services
  const convertToArticleFormData = (data: ArticleFormSchemaType): ArticleFormData => {
    return {
      id: articleId,
      title: data.title,
      content: data.content,
      excerpt: data.excerpt || '',
      imageUrl: data.imageUrl,
      categoryId: data.categoryId,
      slug: data.slug || '',
      articleType: data.articleType,
      videoUrl: data.videoUrl,
      status: data.status,
      publishDate: data.publishDate,
      shouldHighlight: data.shouldHighlight,
      allowVoting: data.allowVoting,
      debateSettings: data.debateSettings ? {
        question: data.debateSettings.question,
        yesPosition: data.debateSettings.yesPosition,
        noPosition: data.debateSettings.noPosition,
        votingEnabled: data.debateSettings.votingEnabled,
        voting_ends_at: data.debateSettings.voting_ends_at
      } : undefined,
      storyboardEpisodes: (data.storyboardEpisodes || []).map(episode => ({
        title: episode.title,
        description: episode.description,
        videoUrl: episode.videoUrl,
        thumbnailUrl: episode.thumbnailUrl,
        duration: episode.duration,
        number: episode.number,
        content: episode.content
      }))
    };
  };

  // Save draft function
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
      const formData = convertToArticleFormData(form.getValues());
      const result = await saveDraftOptimized(user.id, formData);
      
      if (result.success) {
        if (result.articleId && !articleId) {
          // Update the article ID if this was a new article
          // Note: We can't directly update the articleId prop, but we can store it internally
        }
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

  // Submit function
  const onSubmit = async (data: ArticleFormSchemaType): Promise<void> => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to submit articles.",
        variant: "destructive"
      });
      return;
    }

    try {
      const formData = convertToArticleFormData(data);
      const result = await submitArticleOptimized(user.id, formData, false);
      
      if (result.success) {
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
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <ArticleEditorDebugPanel
          formData={convertToArticleFormData(form.getValues())}
          isSubmitting={isSubmitting}
          isSaving={isSaving}
          hasUnsavedChanges={isDirty}
          effectiveArticleId={articleId}
          categorySlug={categorySlug}
          categoryName={categoryName}
          isNewArticle={isNewArticle}
        />
        
        <ArticleFormContent 
          form={form}
          isSubmitting={isSubmitting}
          preselectedCategoryName={categoryName}
        />
        
        <EnhancedFormActions 
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmit(onSubmit)}
          onViewRevisions={undefined}
          isSubmitting={isSubmitting}
          isDirty={isDirty}
          isSaving={isSaving}
          saveStatus={isDirty ? 'idle' : 'saved'}
          hasRevisions={false}
          form={form}
          content={watch('content')}
        />
      </form>
    </Form>
  );
};

export default ArticleForm;
