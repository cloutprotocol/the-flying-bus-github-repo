
import React from 'react';
import StandardArticleForm from './forms/StandardArticleForm';
import VideoArticleForm from './forms/VideoArticleForm';
import DebateArticleForm from './forms/DebateArticleForm';
import StoryboardArticleForm from './forms/StoryboardArticleForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ArticleFormProps {
  articleId?: string;
  articleType: string;
  isNewArticle: boolean;
  categorySlug?: string;
  categoryName?: string;
}

const ArticleForm: React.FC<ArticleFormProps> = (props) => {
  const { articleType, isNewArticle, categorySlug, categoryName } = props;

  console.log('ArticleForm: Rendering with props:', props);

  // Validate required props for new articles
  if (isNewArticle && !categorySlug && !categoryName) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Cannot create new article without category information. Please select a category first.
        </AlertDescription>
      </Alert>
    );
  }

  // Route to the appropriate form based on article type
  try {
    switch (articleType) {
      case 'video':
        return <VideoArticleForm {...props} />;
      
      case 'debate':
        return <DebateArticleForm {...props} />;
      
      case 'storyboard':
        return <StoryboardArticleForm {...props} />;
      
      case 'standard':
      default:
        return <StandardArticleForm {...props} />;
    }
  } catch (error) {
    console.error('ArticleForm: Error rendering form:', error);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading article form. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }
};

export default ArticleForm;
