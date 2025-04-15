
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
          fontWeight: 400, /* Explicit declaration of normal weight */
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'optimizeLegibility',
          textShadow: '1px 1px 2px rgba(0,0,0,0.5)' /* Keep the shadow for contrast on images */
        }}
      >
        {title}
      </h2>
    </>
  );
};

export default FeatureArticleHeader;
