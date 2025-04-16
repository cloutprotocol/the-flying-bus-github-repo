import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { mockArticles } from '@/data/articles';
import { ArrowUpRight } from 'lucide-react';
import ProfileLink from '@/components/Comments/ProfileLink';

interface ArticleSidebarProps {
  article: ArticleProps;
}

const ArticleSidebar: React.FC<ArticleSidebarProps> = ({ article }) => {
  // Get 3 related articles from the same category
  const relatedArticles = mockArticles
    .filter(a => a.category === article.category && a.id !== article.id)
    .slice(0, 3);

  const fallbackImage = "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8dGVjaG5vbG9neXxlbnwwfHwwfHx8MA%3D";

  // For the author profile url - we'll assume the author name is used to create the URL
  const authorUsername = typeof article.author === 'string' ? 
    article.author.toLowerCase().replace(/\s+/g, '_') : 
    'anonymous';

  return (
    <div className="lg:col-span-4">
      <div className="sticky top-24">
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">About the Author</h3>
            <p className="text-flyingbus-muted-text mb-4">
              {article.author} is a young journalist passionate about sharing important stories.
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link to={`/profile/${authorUsername}`}>View Profile</Link>
            </Button>
          </CardContent>
        </Card>
        
        <div className="bg-gray-100 rounded-xl p-6 text-center mb-6 min-h-[300px] flex items-center justify-center">
          <div>
            <p className="text-flyingbus-muted-text mb-2">Future Ad Space</p>
            <p className="text-xs text-gray-500">This space reserved for ads or in-house CTAs</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Related Articles</h3>
            <div className="space-y-4">
              {relatedArticles.map((relatedArticle) => {
                const [imageError, setImageError] = useState(false);
                
                return (
                  <Link 
                    key={relatedArticle.id} 
                    to={`/article/${relatedArticle.id}`}
                    className="flex gap-3 group items-start hover:bg-gray-50 p-2 rounded-lg transition-all"
                  >
                    <div className="flex-shrink-0 w-16 h-16 overflow-hidden rounded-md">
                      <img 
                        src={imageError ? fallbackImage : relatedArticle.imageUrl}
                        alt={relatedArticle.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={() => setImageError(true)}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-medium line-clamp-2 group-hover:opacity-80 transition-opacity">
                          {relatedArticle.title}
                        </p>
                        <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {relatedArticle.date || relatedArticle.publishDate}
                      </p>
                    </div>
                  </Link>
                );
              })}
              
              {relatedArticles.length === 0 && (
                <p className="text-gray-500 text-sm italic">No related articles found.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ArticleSidebar;
