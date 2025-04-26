
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export interface ArticleProps {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  imageUrl?: string;
  category: string;
  categorySlug?: string;
  categoryColor?: string;
  categoryId?: string;
  readingLevel: string;
  readTime: number;
  author: string;
  date: string;
  publishDate: string;
  commentCount?: number;
  articleType?: string;
  videoUrl?: string;
  duration?: string;
  onClick?: () => void;
}

interface ArticleCardProps extends ArticleProps {
  className?: string;
}

const ArticleCard: React.FC<ArticleCardProps> = ({
  id,
  title,
  excerpt,
  imageUrl,
  category,
  categoryColor,
  readingLevel,
  readTime = 3,
  author = 'Unknown',
  date,
  className,
  onClick,
}) => {
  const getCategoryColorClass = (colorName?: string) => {
    if (!colorName) return 'bg-flyingbus-red';
    return `bg-flyingbus-${colorName}`;
  };

  const handleClick = () => {
    logger.info(LogSource.ARTICLE, 'Article card clicked', { 
      articleId: id, 
      articleTitle: title,
      navigationUrl: `/articles/${id}`
    });
    
    if (onClick) {
      onClick();
    }
  };

  return (
    <Link 
      to={`/articles/${id}`} 
      className="block" 
      onClick={handleClick}
    >
      <Card 
        className={cn(
          "overflow-hidden h-full flex flex-col hover:shadow-lg transition-shadow", 
          className
        )}
      >
        <div className="relative h-40 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
          <div className="absolute top-2 left-2">
            <Badge className={cn("text-white", getCategoryColorClass(categoryColor))}>
              {category || 'Uncategorized'}
            </Badge>
          </div>
        </div>
        
        <CardContent className="pt-4 flex-grow">
          <h3 className="text-lg font-bold mb-2 hover:text-blue-600 transition-colors">
            {title}
          </h3>
          <p className="text-gray-600 text-sm line-clamp-3">{excerpt || 'No excerpt available'}</p>
        </CardContent>
        
        <CardFooter className="pt-0 pb-4 text-xs text-gray-500 flex items-center justify-between">
          <div>
            <span>{author}</span> • <span>{date}</span>
          </div>
          <div>
            <span>{readTime} min read</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
};

export default ArticleCard;
