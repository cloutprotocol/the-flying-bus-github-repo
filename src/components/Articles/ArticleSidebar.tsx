
import React from 'react';
import { ArticleProps } from './ArticleCard';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ArticleSidebarProps {
  article: ArticleProps;
  relatedArticles?: ArticleProps[];
}

const ArticleSidebar: React.FC<ArticleSidebarProps> = ({ 
  article,
  relatedArticles = []
}) => {
  const getCategoryColorClass = (colorName?: string) => {
    if (!colorName) return 'bg-flyingbus-red';
    return `bg-flyingbus-${colorName}`;
  };

  // Get author initials for avatar fallback
  const getAuthorInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <aside className="lg:col-span-4">
      <div className="sticky top-24 space-y-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold text-lg mb-3">About the Author</h3>
            <div className="flex items-start gap-3">
              <Avatar className="w-12 h-12">
                {article.authorAvatar ? (
                  <AvatarImage src={article.authorAvatar} alt={article.author} />
                ) : (
                  <AvatarFallback>
                    {getAuthorInitials(article.author || 'UA')}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <p className="font-medium">{article.author || 'Unknown Author'}</p>
                <p className="text-sm text-gray-600">
                  Writer at The Flying Bus
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {relatedArticles.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-lg mb-3">Related Articles</h3>
              <div className="space-y-4">
                {relatedArticles.map((related) => (
                  <Link key={related.id} to={`/articles/${related.id}`} className="block group">
                    <div className="flex gap-2">
                      <div className="w-16 h-16 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                        {related.imageUrl && (
                          <img 
                            src={related.imageUrl} 
                            alt={related.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm group-hover:text-blue-600 line-clamp-2">
                          {related.title}
                        </h4>
                        <div className="mt-1 flex items-center gap-2">
                          <span 
                            className={cn(
                              "text-xs px-2 py-0.5 rounded text-white",
                              getCategoryColorClass(related.categoryColor)
                            )}
                          >
                            {related.category || 'Uncategorized'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold text-lg mb-3">Reading Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Reading Level:</span>
                <span className="font-medium">{article.readingLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Reading Time:</span>
                <span className="font-medium">{article.readTime} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Published:</span>
                <span className="font-medium">{article.publishDate || article.date}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
};

export default ArticleSidebar;
