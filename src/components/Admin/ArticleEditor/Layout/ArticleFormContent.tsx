
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import ArticleFormHeader from '../ArticleFormHeader';
import StoryboardFields from '../StoryboardFields';
import VideoFormSection from '../VideoFormSection';
import DebateFormSection from '../DebateFormSection';
import SelectedCategoryDisplay from '../SelectedCategoryDisplay';
import MediaSelector from '../MediaSelector';
import MetadataFields from '../MetadataFields';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface ArticleFormContentProps {
  form: UseFormReturn<any>;
  content: string;
  setContent: (content: string) => void;
  articleType: string;
  isNewArticle: boolean;
  lastSaved: Date | null;
  categorySlug?: string;
  categoryName?: string;
}

const ArticleFormContent: React.FC<ArticleFormContentProps> = ({
  form,
  content,
  setContent,
  articleType,
  isNewArticle,
  lastSaved,
  categorySlug,
  categoryName
}) => {
  // Show category info if selected from modal
  const showCategoryInfo = isNewArticle && categoryName;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        {showCategoryInfo && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Creating a new <strong>{categoryName}</strong> article. 
              {articleType === 'debate' && ' This will include polling and debate features.'}
              {articleType === 'video' && ' You can add an optional video to this article.'}
              {articleType === 'storyboard' && ' This will be part of a video series.'}
            </AlertDescription>
          </Alert>
        )}

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
        
        {(articleType === 'video' || categorySlug === 'spice-it-up') && (
          <VideoFormSection 
            form={form} 
            isOptional={categorySlug === 'spice-it-up'}
          />
        )}
        
        {articleType === 'debate' && (
          <DebateFormSection form={form} />
        )}
      </div>
      
      <div className="space-y-6">
        <SelectedCategoryDisplay 
          categoryName={categoryName}
          categorySlug={categorySlug}
          articleType={articleType}
        />
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
