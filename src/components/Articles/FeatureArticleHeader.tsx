import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getCategoryColor } from '@/utils/categoryColors';
interface FeatureArticleHeaderProps {
  title: string;
  category: string;
  readingLevel?: string;
}
const FeatureArticleHeader = ({
  title,
  category,
  readingLevel
}: FeatureArticleHeaderProps) => {
  return <>
      <div className="flex gap-2 mb-3">
        <Badge className={`${getCategoryColor(category)}`}>
          {category}
        </Badge>
        
        {readingLevel && <Badge className="bg-white text-gray-800">
            Level: {readingLevel}
          </Badge>}
      </div>
      
      <h2 style={{
      letterSpacing: '-0.01em',
      fontWeight: 400,
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      textRendering: 'optimizeLegibility',
      textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
    }} className="feature-article-title text-4xl">
        {title}
      </h2>
    </>;
};
export default FeatureArticleHeader;