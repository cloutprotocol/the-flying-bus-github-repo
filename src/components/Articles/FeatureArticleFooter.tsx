
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';

interface FeatureArticleFooterProps {
  id: string | number;
  author: string;
  publishDate?: string;
  date?: string;
}

const FeatureArticleFooter = ({ id, author, publishDate, date }: FeatureArticleFooterProps) => {
  return (
    <div className="flex justify-between items-center">
      <div>
        <span className="block text-sm text-white/90">By {author}</span>
        <span className="flex items-center text-xs text-white/70 mt-1">
          <CalendarDays size={12} className="mr-1" />
          {date || publishDate}
        </span>
      </div>
      
      <Link to={`/articles/${id}`} className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-medium rounded-md px-3 py-1.5 flex items-center transition-colors">
        Read More <ArrowRight size={14} className="ml-1" />
      </Link>
    </div>
  );
};

export default FeatureArticleFooter;
