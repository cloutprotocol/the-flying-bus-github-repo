
import React, { useState, useEffect, useCallback } from 'react';
import { Form } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import StoryboardFields from './StoryboardFields';
import { useZodForm } from '@/hooks/useZodForm';
import { createArticleSchema } from '@/utils/validation/articleValidation';
import { createArticle } from '@/services/articleService';
import { saveDraft, getDraftById } from '@/services/draftService';
import logger, { LogSource } from '@/utils/logger';
import ArticleFormHeader from './ArticleFormHeader';
import DebateFormSection from './DebateFormSection';
import VideoFormSection from './VideoFormSection';
import CategorySelector from './CategorySelector';
import MediaSelector from './MediaSelector';
import MetadataFields from './MetadataFields';
import FormActions from './FormActions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DraftSaveStatus } from '@/types/ArticleEditorTypes';
import useArticleRevisions from '@/hooks/useArticleRevisions';
import RevisionsList from './RevisionsList';

interface ArticleFormProps {
  articleId?: string;
  articleType: string;
  isNewArticle: boolean;
}

const AUTO_SAVE_INTERVAL = 60000; // Auto-save every minute

const ArticleForm: React.FC<ArticleFormProps> = ({ 
  articleId, 
  articleType = 'standard',
  isNewArticle = true 
}) => {
  const [content, setContent] = useState('');
  const [draftId, setDraftId] = useState<string | undefined>(articleId);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showRevisions, setShowRevisions] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Get article revisions if we have an article ID
  const { revisions, isLoading: revisionsLoading } = useArticleRevisions(
    !isNewArticle ? articleId : undefined
  );
  
  const form = useZodForm({
    schema: createArticleSchema,
    defaultValues: {
      title: '',
      excerpt: '',
      categoryId: '',
      content: '',
      imageUrl: '',
      readingLevel: 'Intermediate',
      status: 'draft',
      articleType: articleType as any,
      videoUrl: '',
    },
    logContext: 'article_form'
  });

  // Load existing draft
  useEffect(() => {
    if (!isNewArticle && articleId) {
      const loadDraft = async () => {
        try {
          logger.info(LogSource.CLIENT, 'Loading draft', { articleId });
          const { draft, error } = await getDraftById(articleId);
          
          if (error || !draft) {
            logger.error(LogSource.CLIENT, 'Error loading draft', { error, articleId });
            return;
          }
          
          // Populate form with draft data
          form.reset({
            title: draft.title,
            excerpt: draft.excerpt,
            categoryId: draft.categoryId,
            imageUrl: draft.imageUrl,
            readingLevel: 'Intermediate', // Default
            status: draft.status,
            articleType: draft.articleType,
            videoUrl: draft.videoUrl || ''
          });
          
          setContent(draft.content);
          setDraftId(draft.id);
          setLastSaved(new Date(draft.updatedAt));
          setSaveStatus('saved');
          
        } catch (error) {
          logger.error(LogSource.CLIENT, 'Exception loading draft', { error, articleId });
        }
      };
      
      loadDraft();
    }
  }, [articleId, isNewArticle, form]);

  // Auto-save draft periodically
  const saveDraftToServer = useCallback(async (formData: any, isDirty: boolean) => {
    if (!isDirty && draftId) {
      return { success: true };
    }
    
    try {
      setSaveStatus('saving');
      
      const draftData = {
        ...formData,
        content,
      };
      
      logger.info(LogSource.CLIENT, 'Auto-saving draft', {
        draftId,
        articleType
      });
      
      const result = await saveDraft(draftId || '', draftData);
      
      if (result.error) {
        logger.error(LogSource.CLIENT, 'Error auto-saving draft', { error: result.error });
        setSaveStatus('error');
        return { success: false };
      }
      
      if (!draftId && result.articleId) {
        setDraftId(result.articleId);
      }
      
      setLastSaved(new Date());
      setSaveStatus('saved');
      return { success: true };
      
    } catch (error) {
      logger.error(LogSource.CLIENT, 'Exception auto-saving draft', { error });
      setSaveStatus('error');
      return { success: false };
    }
  }, [draftId, content]);

  // Setup auto-save interval
  useEffect(() => {
    const isDirty = form.formState.isDirty;
    const contentChanged = content !== '';
    
    if (isDirty || contentChanged) {
      const autoSaveTimer = setTimeout(() => {
        const formData = form.getValues();
        saveDraftToServer(formData, true);
      }, AUTO_SAVE_INTERVAL);
      
      return () => clearTimeout(autoSaveTimer);
    }
  }, [form, content, saveDraftToServer, form.formState.isDirty]);

  const onSubmit = async (data: any, isDraft: boolean = false) => {
    data.content = content;
    
    if (isDraft) {
      data.status = 'draft';
    } else {
      data.status = isNewArticle ? 'pending' : form.getValues('status');
    }
    
    try {
      logger.info(LogSource.CLIENT, 'Submitting article form', {
        isDraft,
        articleType
      });
      
      if (isDraft) {
        const saveResult = await saveDraftToServer(data, true);
        if (!saveResult.success) {
          toast({
            title: "Error",
            description: "There was a problem saving your draft.",
            variant: "destructive"
          });
        }
        return;
      }
      
      const result = await createArticle(data);
      
      if (result.error) {
        toast({
          title: "Error",
          description: "There was a problem saving your article.",
          variant: "destructive"
        });
        logger.error(LogSource.CLIENT, "Article submission failed", result.error);
        return;
      }
      
      toast({
        title: "Article submitted for review",
        description: "Your article has been submitted for review.",
      });
      
      navigate('/admin/articles');
    } catch (error) {
      logger.error(LogSource.CLIENT, "Exception in article submission", error);
      toast({
        title: "Error",
        description: "There was a problem saving your article.",
        variant: "destructive"
      });
    }
  };

  const handleSaveDraft = () => {
    const formData = form.getValues();
    onSubmit(formData, true);
  };

  const handleViewRevisions = () => {
    setShowRevisions(true);
  };

  const showStoryboardFields = articleType === 'storyboard';
  const showVideoFields = articleType === 'video';
  const showDebateFields = articleType === 'debate';

  return (
    <>
      <Form {...form}>
        <form className="space-y-6" onSubmit={form.handleFormSubmit((data) => onSubmit(data, false))}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <ArticleFormHeader 
                form={form} 
                content={content} 
                setContent={setContent} 
              />
              
              {showStoryboardFields && (
                <StoryboardFields 
                  form={form}
                  isNewSeries={isNewArticle}
                />
              )}
              
              {showVideoFields && (
                <VideoFormSection form={form} />
              )}
              
              {showDebateFields && (
                <DebateFormSection 
                  form={form} 
                  content={content} 
                  setContent={setContent} 
                />
              )}
            </div>
            
            <div className="space-y-6">
              <CategorySelector form={form} />
              <MediaSelector form={form} />
              <MetadataFields form={form} articleType={articleType} />
              
              {lastSaved && (
                <div className="text-xs text-muted-foreground text-right">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
          
          <FormActions 
            onSaveDraft={handleSaveDraft}
            onViewRevisions={!isNewArticle && revisions.length > 0 ? handleViewRevisions : undefined}
            isSubmitting={form.formState.isSubmitting}
            isDirty={form.formState.isDirty || content !== ''}
            isSaving={saveStatus === 'saving'}
            saveStatus={saveStatus}
            hasRevisions={!isNewArticle && revisions.length > 0}
          />
        </form>
      </Form>
      
      {/* Revisions Dialog */}
      <Dialog open={showRevisions} onOpenChange={setShowRevisions}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Article Revisions</DialogTitle>
            <DialogDescription>
              View and restore previous versions of this article
            </DialogDescription>
          </DialogHeader>
          
          <RevisionsList 
            revisions={revisions} 
            isLoading={revisionsLoading} 
            articleId={articleId || ''} 
            onRestoreRevision={(content) => {
              setContent(content);
              setShowRevisions(false);
              form.setValue('content', content, { shouldDirty: true });
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ArticleForm;
