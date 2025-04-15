
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookMarked, CalendarDays } from 'lucide-react';
import { getCategoryColor } from '@/utils/categoryColors';
import { ArticleProps } from '@/components/Articles/ArticleCard';

interface SeriesHeaderProps {
  article: ArticleProps;
}

const SeriesHeader: React.FC<SeriesHeaderProps> = ({ article }) => {
  const navigate = useNavigate();
  
  return (
    <div className="bg-gradient-to-b from-flyingbus-background to-white pt-6 pb-12">
      <div className="container mx-auto px-4">
        <Button
          variant="ghost" 
          className="mb-4 flex items-center"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Home
        </Button>
        
        {/* Series Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Badge className={`${getCategoryColor('Storyboard')}`}>
              <BookMarked size={14} className="mr-1" />
              Storyboard Series
            </Badge>
            {article.readingLevel && (
              <Badge variant="outline" className="bg-white border text-flyingbus-purple">
                {article.readingLevel}
              </Badge>
            )}
          </div>
          
          <h1 
            className="font-display text-3xl md:text-4xl font-bold mb-2 leading-tight"
            style={{ 
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale', 
              textRendering: 'optimizeLegibility',
              textShadow: 'none'
            }}
          >
            {article.title}
          </h1>
          
          <div className="flex flex-wrap items-center text-flyingbus-muted-text mb-4">
            <span className="mr-4 font-medium">Created by {article.author}</span>
            <span className="flex items-center mr-4">
              <CalendarDays size={16} className="mr-1" />
              Series started on {article.date || article.publishDate}
            </span>
          </div>
          
          <p className="text-lg text-gray-700 max-w-3xl mb-6">
            {article.excerpt}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SeriesHeader;
