
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import ArticleFormHeader from '../ArticleFormHeader';
import StoryboardFields from '../StoryboardFields';
import VideoFormSection from '../VideoFormSection';
import DebateFormSection from '../DebateFormSection';
import CategorySelector from '../CategorySelector';
import MediaSelector from '../MediaSelector';
import MetadataFields from '../MetadataFields';

interface ArticleFormContentProps {
  form: UseFormReturn<any>;
  content: string;
  setContent: (content: string) => void;
  articleType: string;
  isNewArticle: boolean;
  lastSaved: Date | null;
}

const ArticleFormContent: React.FC<ArticleFormContentProps> = ({
  form,
  content,
  setContent,
  articleType,
  isNewArticle,
  lastSaved
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <ArticleFormHeader 
          form={form} 
          content={content} 
          setContent={setContent} 
        />
        
        {articleType === 'storyboard' && (
          <StoryboardFields 
            form={form}
            isNewSeries={isNewArticle}
          />
        )}
        
        {articleType === 'video' && (
          <VideoFormSection form={form} />
        )}
        
        {articleType === 'debate' && (
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
  );
};

export default ArticleFormContent;
