
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface NotFoundMessageProps {
  title?: string;
  message?: string;
  type?: 'series' | 'episode';
  seriesId?: string;
}

const NotFoundMessage: React.FC<NotFoundMessageProps> = ({ 
  type = 'series', 
  seriesId,
  title,
  message
}) => {
  // Use provided title/message or fallback to defaults based on type
  const defaultTitle = type === 'series' ? 'Series Not Found' : 'Episode Not Found';
  const defaultMessage = type === 'series' 
    ? "Sorry, we couldn't find the series you're looking for."
    : "Sorry, we couldn't find the episode you're looking for.";
  
  const displayTitle = title || defaultTitle;
  const displayMessage = message || defaultMessage;
  
  const linkUrl = type === 'series' ? '/' : `/storyboard/${seriesId}`;
  const linkText = type === 'series' ? 'Back to Home' : 'Back to Series';
  
  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <h1 className="text-3xl font-display font-bold mb-4">{displayTitle}</h1>
      <p className="mb-8">{displayMessage}</p>
      <Button asChild>
        <Link to={linkUrl}>{linkText}</Link>
      </Button>
    </div>
  );
};

export default NotFoundMessage;
