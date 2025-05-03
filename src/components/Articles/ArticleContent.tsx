
import React from 'react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import DebateVote from '@/components/Articles/DebateVote';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import VideoPlayer from '@/components/Articles/VideoPlayer';
import DOMPurify from 'dompurify';

interface ArticleContentProps {
  article: ArticleProps;
  articleContent: string;
  debateSettings?: {
    initialVotes: {
      yes: number;
      no: number;
    }
  };
}

const ArticleContent: React.FC<ArticleContentProps> = ({ article, articleContent, debateSettings }) => {
  // Add null checks to prevent errors when category is undefined
  const isDebate = article.category && 
    (article.category.toLowerCase() === 'debate' || article.category.toLowerCase() === 'debates');
  
  const isSpiceItUpWithVideo = article.category === 'Spice It Up' && article.videoUrl;
  
  // Sanitize the HTML content
  const sanitizedContent = DOMPurify.sanitize(articleContent);
  
  return (
    <div className="lg:col-span-8">
      {isSpiceItUpWithVideo && (
        <VideoPlayer 
          videoUrl={article.videoUrl!} 
          title={article.title} 
          duration={article.duration} 
        />
      )}
      
      {article.imageUrl && (
        <div className={`mb-2 rounded-xl overflow-hidden ${isSpiceItUpWithVideo ? 'mt-2' : ''}`}>
          <AspectRatio ratio={16/9} className="bg-gray-100">
            <img 
              src={article.imageUrl} 
              alt={article.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://placehold.co/800x450/e2e8f0/64748b?text=Image+Not+Found';
              }}
            />
          </AspectRatio>
        </div>
      )}
      
      <div 
        className="article-content prose prose-lg max-w-none mt-6 mb-12"
        dangerouslySetInnerHTML={{ __html: sanitizedContent || '<p>No content available.</p>' }}
      />
      
      {isDebate && debateSettings && (
        <div className="my-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="inline-block w-10 h-0.5 bg-flyingbus-purple mr-4"></span>
            Join the debate
          </h3>
          <DebateVote 
            debateId={article.id} 
            topicTitle={article.title}
            initialVotes={debateSettings.initialVotes} 
          />
        </div>
      )}
    </div>
  );
};

export default ArticleContent;
