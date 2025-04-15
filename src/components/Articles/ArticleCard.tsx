
import React from 'react';
import { Link } from 'react-router-dom';
import { getCategoryColor } from '@/utils/categoryColors';
import { BookOpen } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';

export interface ArticleProps {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  readingLevel: string;
  readTime: number;
  author: {
    name: string;
    avatar: string;
  };
  date: string;
  commentCount?: number;
  videoUrl?: string;
  duration?: string;
}

const ArticleCard: React.FC<ArticleProps> = ({ 
  id,
  title, 
  excerpt, 
  imageUrl, 
  category, 
  readingLevel, 
  readTime,
  author,
  date,
  commentCount = 0,
  videoUrl,
  duration
}) => {
  const categoryColor = getCategoryColor(category);
  
  const isVideo = !!videoUrl;
  
  // Determine the link URL based on the category
  const getArticleUrl = () => {
    if (category === 'Storyboard') {
      return `/storyboard/${id}`;
    }
    return `/articles/${id}`;
  };
  
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl shadow-md transition hover:shadow-lg bg-white">
      <div className="relative">
        <AspectRatio ratio={16/9} className="bg-gray-100">
          <img 
            src={imageUrl} 
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </AspectRatio>
        
        <div className="absolute top-0 left-0 m-4">
          <span 
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColor}`}
          >
            {category}
          </span>
        </div>
        
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-white/30 p-3 backdrop-blur">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="text-white drop-shadow-lg"
              >
                <polygon points="5 3 19 12 5 21 5 3" fill="white" />
              </svg>
            </div>
          </div>
        )}
        
        {isVideo && duration && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
            {duration}
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-2 p-4 flex-grow">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center">
            <BookOpen size={12} className="mr-1" />
            {readTime} min read
          </span>
          <span>Reading Level: {readingLevel}</span>
        </div>
        
        <h3 className="font-bold leading-tight text-xl line-clamp-2 text-gray-900 font-display">
          <Link to={getArticleUrl()} className="hover:text-gray-700">
            {title}
          </Link>
        </h3>
        
        <p className="text-sm text-gray-600 line-clamp-3 flex-grow">{excerpt}</p>
        
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          <div className="flex items-center">
            <img
              src={author.avatar}
              alt={author.name}
              className="h-8 w-8 rounded-full object-cover"
            />
            <div className="ml-2">
              <h3 className="text-xs font-medium">{author.name}</h3>
              <p className="text-xs text-gray-500">{date}</p>
            </div>
          </div>
          
          {commentCount > 0 && (
            <span className="flex items-center text-xs text-gray-500">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="mr-1"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {commentCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArticleCard;
