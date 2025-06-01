
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ArticleType {
  id: string;
  name: string;
  description: string;
  iconSrc: string;
  articleType: 'standard' | 'debate' | 'video' | 'storyboard';
  categorySlug: string;
}

const articleTypes: ArticleType[] = [
  {
    id: 'headliners',
    name: 'Headliners',
    description: 'Breaking news and major stories that grab attention',
    iconSrc: '/headliners-icon.svg',
    articleType: 'standard',
    categorySlug: 'headliners'
  },
  {
    id: 'debates',
    name: 'Debates',
    description: 'Interactive articles with yes/no polling and arguments',
    iconSrc: '/debates-icon.svg',
    articleType: 'debate',
    categorySlug: 'debates'
  },
  {
    id: 'neighborhood',
    name: 'In the Neighborhood',
    description: 'Local community stories and neighborhood news',
    iconSrc: '/neighborhood-icon.svg',
    articleType: 'standard',
    categorySlug: 'neighborhood'
  },
  {
    id: 'learning',
    name: 'Learning',
    description: 'Educational content and learning resources',
    iconSrc: '/learning-icon.svg',
    articleType: 'standard',
    categorySlug: 'learning'
  },
  {
    id: 'school-news',
    name: 'School News',
    description: 'News and updates from schools and education',
    iconSrc: '/school-news-icon.svg',
    articleType: 'standard',
    categorySlug: 'school-news'
  },
  {
    id: 'spice-it-up',
    name: 'Spice It Up',
    description: 'Fun articles that can include optional videos',
    iconSrc: '/spice-it-up-icon.svg',
    articleType: 'video',
    categorySlug: 'spice-it-up'
  },
  {
    id: 'storyboard',
    name: 'Storyboard',
    description: 'Video series with episodes and storytelling',
    iconSrc: '/storyboard-icon.svg',
    articleType: 'storyboard',
    categorySlug: 'storyboard'
  }
];

interface ArticleTypeSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ArticleTypeSelectionModal: React.FC<ArticleTypeSelectionModalProps> = ({
  open,
  onOpenChange
}) => {
  const navigate = useNavigate();

  const handleTypeSelect = (articleType: ArticleType) => {
    // Navigate to the article editor with the selected type and category
    navigate('/admin/articles/new', {
      state: {
        articleType: articleType.articleType,
        categorySlug: articleType.categorySlug,
        categoryName: articleType.name
      }
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Article</DialogTitle>
          <DialogDescription>
            Choose the type of article you'd like to create. Each type has different features and fields.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {articleTypes.map((type) => (
            <Card 
              key={type.id} 
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 h-full"
              onClick={() => handleTypeSelect(type)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg flex items-center justify-center">
                    <img 
                      src={type.iconSrc} 
                      alt={`${type.name} icon`}
                      className="w-8 h-8"
                    />
                  </div>
                  <CardTitle className="text-lg">{type.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm mb-3">
                  {type.description}
                </CardDescription>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTypeSelect(type);
                  }}
                >
                  Create {type.name} Article
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ArticleTypeSelectionModal;
