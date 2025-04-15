
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getCategoryColor } from '@/utils/categoryColors';

interface FeatureArticleHeaderProps {
  title: string;
  category: string;
  readingLevel?: string;
}

const FeatureArticleHeader = ({ title, category, readingLevel }: FeatureArticleHeaderProps) => {
  return (
    <>
      <div className="flex gap-2 mb-3">
        <Badge className={`${getCategoryColor(category)}`}>
          {category}
        </Badge>
        
        {readingLevel && (
          <Badge className="bg-white text-gray-800">
            Level: {readingLevel}
          </Badge>
        )}
      </div>
      
      <h2 
        className="feature-article-title"
        style={{
          letterSpacing: '-0.01em', /* Slight negative tracking for better readability */
        }}
      >
        {title}
      </h2>
    </>
  );
};

export default FeatureArticleHeader;
