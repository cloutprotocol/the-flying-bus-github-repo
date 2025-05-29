
import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Video, 
  MessageSquare, 
  BookOpen,
  ArrowRight
} from 'lucide-react';

const ArticleTypeSelection = () => {
  const navigate = useNavigate();

  const articleTypes = [
    {
      type: 'standard',
      title: 'Standard Article',
      description: 'Write a traditional news article with text and images',
      icon: <FileText className="h-8 w-8" />,
      color: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
    },
    {
      type: 'video',
      title: 'Video Article',
      description: 'Create an article featuring a video with supporting content',
      icon: <Video className="h-8 w-8" />,
      color: 'border-green-200 hover:border-green-400 hover:bg-green-50'
    },
    {
      type: 'debate',
      title: 'Debate Article',
      description: 'Present both sides of an issue with voting functionality',
      icon: <MessageSquare className="h-8 w-8" />,
      color: 'border-red-200 hover:border-red-400 hover:bg-red-50'
    },
    {
      type: 'storyboard',
      title: 'Storyboard Episode',
      description: 'Create an episode for an ongoing story series',
      icon: <BookOpen className="h-8 w-8" />,
      color: 'border-purple-200 hover:border-purple-400 hover:bg-purple-50'
    }
  ];

  const handleTypeSelection = (type: string) => {
    navigate(`/admin/articles/new/${type}`, { 
      state: { articleType: type }
    });
  };

  return (
    <AdminPortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Article</h1>
          <p className="text-muted-foreground">
            Choose the type of article you want to create
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articleTypes.map((articleType) => (
            <Card 
              key={articleType.type} 
              className={`cursor-pointer transition-all duration-200 ${articleType.color}`}
              onClick={() => handleTypeSelection(articleType.type)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-primary">
                      {articleType.icon}
                    </div>
                    <CardTitle className="text-lg">{articleType.title}</CardTitle>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {articleType.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center pt-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin/articles')}
          >
            Back to Articles
          </Button>
        </div>
      </div>
    </AdminPortalLayout>
  );
};

export default ArticleTypeSelection;
