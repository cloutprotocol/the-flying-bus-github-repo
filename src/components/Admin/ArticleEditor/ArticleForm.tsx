
import React, { useState } from 'react';
import { Form } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import StoryboardFields from './StoryboardFields';
import { useZodForm } from '@/hooks/useZodForm';
import { createArticleSchema } from '@/utils/validation/articleValidation';
import { createArticle } from '@/services/articleService';
import logger, { LogSource } from '@/utils/logger';
import ArticleFormHeader from './ArticleFormHeader';
import DebateFormSection from './DebateFormSection';
import VideoFormSection from './VideoFormSection';
import CategorySelector from './CategorySelector';
import MediaSelector from './MediaSelector';
import MetadataFields from './MetadataFields';
import FormActions from './FormActions';

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
  const [content, setContent] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  
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
    },
    logContext: 'article_form'
  });

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
        title: isDraft ? "Draft saved" : "Article submitted for review",
        description: isDraft 
          ? "Your article has been saved as a draft."
          : "Your article has been submitted for review.",
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

  const showStoryboardFields = articleType === 'storyboard';
  const showVideoFields = articleType === 'video';
  const showDebateFields = articleType === 'debate';

  return (
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
          </div>
        </div>
        
        <FormActions 
          onSaveDraft={handleSaveDraft} 
        />
      </form>
    </Form>
  );
};

export default ArticleForm;
