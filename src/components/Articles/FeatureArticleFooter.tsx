
import React from 'react';

interface FeatureArticleFooterProps {
  id: string;
  author: string;
  date: string;
  publishDate: string;
}

const FeatureArticleFooter = ({ author, date }: FeatureArticleFooterProps) => {
  return (
    <div className="flex items-center justify-between text-xs text-white/80">
      <span>{author}</span>
      <span>{date}</span>
    </div>
  );
};

export default FeatureArticleFooter;
