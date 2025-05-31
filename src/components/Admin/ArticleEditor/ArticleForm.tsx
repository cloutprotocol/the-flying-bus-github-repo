
import React from 'react';
import StandardArticleForm from './forms/StandardArticleForm';
import VideoArticleForm from './forms/VideoArticleForm';
import DebateArticleForm from './forms/DebateArticleForm';
import StoryboardArticleForm from './forms/StoryboardArticleForm';
import FormErrorBoundary from './FormErrorBoundary';

interface ArticleFormProps {
  articleId?: string;
  articleType: string;
  isNewArticle: boolean;
  categorySlug?: string;
  categoryName?: string;
}

const ArticleForm: React.FC<ArticleFormProps> = (props) => {
  const { articleType } = props;

  console.log('ArticleForm: Rendering with props:', {
    articleType,
    isNewArticle: props.isNewArticle,
    categorySlug: props.categorySlug,
    categoryName: props.categoryName
  });

  // Route to the appropriate form based on article type
  const renderForm = () => {
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
  };

  return (
    <FormErrorBoundary>
      {renderForm()}
    </FormErrorBoundary>
  );
};

export default ArticleForm;
