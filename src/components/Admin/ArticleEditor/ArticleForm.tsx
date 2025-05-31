
import React from 'react';
import StandardArticleForm from './forms/StandardArticleForm';
import VideoArticleForm from './forms/VideoArticleForm';
import DebateArticleForm from './forms/DebateArticleForm';
import StoryboardArticleForm from './forms/StoryboardArticleForm';

interface ArticleFormProps {
  articleId?: string;
  articleType: string;
  isNewArticle: boolean;
  categorySlug?: string;
  categoryName?: string;
}

const ArticleForm: React.FC<ArticleFormProps> = (props) => {
  const { articleType } = props;

  // Route to the appropriate form based on article type
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

export default ArticleForm;
