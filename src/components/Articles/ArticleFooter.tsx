
import React from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { MessageSquare, Share2, Facebook, Twitter } from 'lucide-react';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import CommentsSection from '@/components/Comments/CommentsSection';

interface ArticleFooterProps {
  article: ArticleProps;
}

const ArticleFooter: React.FC<ArticleFooterProps> = ({ article }) => {
  return (
    <>
      <Separator className="my-8" />
      
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          <span className="text-flyingbus-muted-text">Share:</span>
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 transition-transform hover:scale-105 active:scale-95 hover:bg-gray-100/50">
            <Facebook size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 transition-transform hover:scale-105 active:scale-95 hover:bg-gray-100/50">
            <Twitter size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 transition-transform hover:scale-105 active:scale-95 hover:bg-gray-100/50">
            <Share2 size={16} />
          </Button>
        </div>
      </div>

      <CommentsSection articleId={article.id} />
    </>
  );
};

export default ArticleFooter;
