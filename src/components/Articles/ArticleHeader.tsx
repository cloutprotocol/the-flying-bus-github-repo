import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock } from 'lucide-react';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { getCategoryColor } from '@/utils/categoryColors';

interface ArticleHeaderProps {
  article: ArticleProps;
}

const ArticleHeader: React.FC<ArticleHeaderProps> = ({ article }) => {
  return (
    <div className="w-full bg-gradient-to-b from-flyingbus-background to-white py-6 sm:py-8 mb-2">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center space-x-2 mb-4 sm:mb-6">
          <Badge className={`${getCategoryColor(article.category)}`}>
            {article.category}
          </Badge>
          {article.readingLevel && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-neutral-600 font-medium">Reading Level:</span>
              <Badge 
                variant="outline" 
                className="bg-neutral-100 border-neutral-200 text-neutral-800 font-normal"
              >
                {article.readingLevel}
              </Badge>
            </div>
          )}
        </div>
        
        <h1 className="font-instrument-serif text-5xl md:text-6xl lg:text-7xl mb-4 sm:mb-6 leading-snug tracking-tight md:tracking-tighter text-left text-flyingbus-headline-text">
          {article.title}
        </h1>
        
        <div className="flex flex-wrap items-center text-flyingbus-muted-text mb-6 sm:mb-8">
          <span className="mr-4 font-medium">By {article.author}</span>
          <span className="flex items-center mr-4">
            <CalendarDays size={16} className="mr-1" />
            {article.publishDate}
          </span>
          <span className="flex items-center mr-4">
            <Clock size={16} className="mr-1" />
            5 min read
          </span>
        </div>
      </div>
    </div>
  );
};

export default ArticleHeader;
