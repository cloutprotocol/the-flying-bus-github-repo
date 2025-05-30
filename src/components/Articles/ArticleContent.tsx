
import React from 'react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import DebateVote from '@/components/Articles/DebateVote';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import VideoPlayer from '@/components/Articles/VideoPlayer';
import DOMPurify from 'dompurify';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { isDebateArticle } from '@/utils/articles';

interface ArticleContentProps {
  article: ArticleProps;
  articleContent: string;
  debateSettings?: {
    initialVotes: {
      yes: number;
      no: number;
    };
    question?: string;
  };
}

const ArticleContent: React.FC<ArticleContentProps> = ({ article, articleContent, debateSettings }) => {
  // Enhanced debate article detection
  const isDebate = isDebateArticle(article.articleType);
  const isSpiceItUpWithVideo = article.category === 'Spice It Up' && article.videoUrl;
  
  // Sanitize the HTML content and log its length
  const sanitizedContent = DOMPurify.sanitize(articleContent || '');
  
  // Enhanced logging for debate articles
  React.useEffect(() => {
    if (isDebate) {
      logger.info(LogSource.ARTICLE, 'Debate article detected in ArticleContent', {
        articleId: article.id,
        articleType: article.articleType,
        hasDebateSettings: !!debateSettings,
        debateQuestion: debateSettings?.question || 'Using article title',
        initialVotes: debateSettings?.initialVotes || { yes: 0, no: 0 }
      });
    }
  }, [isDebate, article.id, article.articleType, debateSettings]);
  
  logger.info(LogSource.ARTICLE, 'Rendering article content', {
    articleId: article.id,
    originalLength: articleContent?.length || 0,
    sanitizedLength: sanitizedContent.length,
    hasHTML: sanitizedContent.includes('<') && sanitizedContent.includes('>'),
    isDebate,
    willShowVoting: isDebate && debateSettings
  });
  
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
        <div className={`mb-6 rounded-xl overflow-hidden ${isSpiceItUpWithVideo ? 'mt-6' : ''}`}>
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
      
      {/* Enhanced conditional rendering for debate voting */}
      {isDebate && (
        <div className="my-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="inline-block w-10 h-0.5 bg-flyingbus-purple mr-4"></span>
            Join the debate
          </h3>
          <DebateVote 
            debateId={article.id} 
            topicTitle={debateSettings?.question || article.title}
            initialVotes={debateSettings?.initialVotes || { yes: 0, no: 0 }} 
          />
        </div>
      )}
    </div>
  );
};

export default ArticleContent;
