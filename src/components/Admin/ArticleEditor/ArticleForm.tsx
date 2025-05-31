
import React from 'react';
import ArticleFormContainer from './ArticleFormContainer';

interface ArticleFormProps {
  articleId?: string;
  articleType: string;
  isNewArticle: boolean;
  categorySlug?: string;
  categoryName?: string;
}

const ArticleForm: React.FC<ArticleFormProps> = (props) => {
  return <ArticleFormContainer {...props} />;
};

export default ArticleForm;
