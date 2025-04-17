
import React, { useState } from 'react';
import { Form } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import StoryboardFields from './StoryboardFields';
import { useZodForm } from '@/hooks/useZodForm';
import { createArticleSchema } from '@/utils/validation/articleValidation';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import ArticleFormHeader from './ArticleFormHeader';
import DebateFormSection from './DebateFormSection';
import VideoFormSection from './VideoFormSection';
import CategorySelector from './CategorySelector';
import MediaSelector from './MediaSelector';
import MetadataFields from './MetadataFields';
import FormActions from './FormActions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import useArticleRevisions from '@/hooks/useArticleRevisions';
import RevisionsList from './RevisionsList';
import { useArticleForm } from '@/hooks/useArticleForm';

interface ArticleFormProps {
  articleId?: string;
  articleType: string;
  isNewArticle: boolean;
}

const ArticleForm: React.FC<ArticleFormProps> = ({ 
  articleId, 
  articleType = 'standard',
  isNewArticle = true 
}) => {
  const [showRevisions, setShowRevisions] = useState(false);
  const { toast } = useToast();
  
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

  // Use the article form hook
  const { 
    content, 
    setContent, 
    saveStatus,
    lastSaved,
    isSubmitting,
    handleSubmit,
    handleSaveDraft 
  } = useArticleForm(form, articleId, articleType, isNewArticle);

  const handleViewRevisions = () => {
    setShowRevisions(true);
  };

  const showStoryboardFields = articleType === 'storyboard';
  const showVideoFields = articleType === 'video';
  const showDebateFields = articleType === 'debate';

  // Log when form submission is attempted
  const onSubmit = (data: any) => {
    logger.info(LogSource.EDITOR, 'Article form submission initiated', {
      isNewArticle,
      articleType,
      hasArticleId: !!articleId
    });
    return handleSubmit(data, false);
  };

  return (
    <>
      <Form {...form}>
        <form className="space-y-6" onSubmit={form.handleFormSubmit(onSubmit)}>
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
            isSubmitting={isSubmitting}
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
