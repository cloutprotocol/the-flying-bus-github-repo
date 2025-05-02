
import React from 'react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import DebateVote from '@/components/Articles/DebateVote';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import VideoPlayer from '@/components/Articles/VideoPlayer';

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
        className="article-content prose prose-lg max-w-none mt-6 mb-12 
          prose-headings:font-display prose-headings:text-gray-900
          prose-h1:text-4xl prose-h1:font-semibold prose-h1:mb-6 prose-h1:leading-tight
          prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-4
          prose-h3:text-xl prose-h3:font-medium prose-h3:mt-8 prose-h3:mb-4
          prose-p:text-gray-800 prose-p:leading-relaxed prose-p:mb-6 prose-p:text-lg
          prose-a:text-flyingbus-purple prose-a:no-underline prose-a:border-b prose-a:border-flyingbus-purple hover:prose-a:border-b-2
          prose-strong:font-semibold prose-strong:text-gray-900
          prose-blockquote:border-l-4 prose-blockquote:border-flyingbus-purple prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-gray-700 prose-blockquote:bg-gray-50 prose-blockquote:py-2 prose-blockquote:rounded-r-md
          prose-ul:list-disc prose-ul:mt-4 prose-ul:mb-6 prose-ul:pl-6
          prose-ol:list-decimal prose-ol:mt-4 prose-ol:mb-6 prose-ol:pl-6
          prose-li:mb-2 prose-li:text-gray-800
          prose-hr:my-8 prose-hr:border-gray-200
          prose-figure:my-8 prose-figure:mx-auto
          prose-figcaption:text-center prose-figcaption:text-gray-600 prose-figcaption:mt-2 prose-figcaption:text-sm
          prose-img:rounded-md prose-img:mx-auto"
        dangerouslySetInnerHTML={{ __html: articleContent || '<p>No content available.</p>' }}
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
