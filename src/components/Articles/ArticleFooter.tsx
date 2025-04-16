
import React from 'react';
import { Separator } from '@/components/ui/separator';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import CommentsSection from '@/components/Comments/CommentsSection';
import ShareArticle from '@/components/Articles/ShareArticle';

interface ArticleFooterProps {
  article: ArticleProps;
}

const ArticleFooter: React.FC<ArticleFooterProps> = ({ article }) => {
  // Create the full URL for the article
  const articleUrl = `/articles/${article.id}`;
  
  return (
    <>
      <Separator className="my-8" />
      
      <div className="flex items-center justify-between py-4">
        {/* Share Article Component */}
        <ShareArticle 
          url={articleUrl}
          title={article.title}
          description={article.excerpt}
          imageUrl={article.imageUrl}
        />
      </div>

      <CommentsSection articleId={article.id} />
    </>
  );
};

export default ArticleFooter;
