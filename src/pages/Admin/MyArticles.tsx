
import React, { useState } from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BadgeInfo, FileEdit, Newspaper, ListTodo, BookOpen, Video } from 'lucide-react';

const MyArticles = () => {
  const [open, setOpen] = useState(false);

  const articleTypes = [
    {
      id: 'standard',
      name: 'Standard Article',
      description: 'A regular article with text and images',
      icon: <Newspaper className="h-8 w-8 text-primary" />,
      color: 'bg-primary/10'
    },
    {
      id: 'debate',
      name: 'Debate Topic',
      description: 'Present two sides of an argument',
      icon: <BadgeInfo className="h-8 w-8 text-red-500" />,
      color: 'bg-red-500/10'
    },
    {
      id: 'storyboard',
      name: 'Storyboard Series',
      description: 'Create a series with multiple episodes',
      icon: <BookOpen className="h-8 w-8 text-amber-500" />,
      color: 'bg-amber-500/10'
    },
    {
      id: 'spiceItUp',
      name: 'Spice It Up',
      description: 'Article with embedded video content',
      icon: <Video className="h-8 w-8 text-blue-500" />,
      color: 'bg-blue-500/10'
    },
    {
      id: 'learning',
      name: 'Learning Resource',
      description: 'Educational content with interactive elements',
      icon: <FileEdit className="h-8 w-8 text-green-500" />,
      color: 'bg-green-500/10'
    }
  ];

  return (
    <AdminPortalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Articles</h1>
            <p className="text-muted-foreground">
              Manage your written articles, drafts, and submissions
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-1">
                <PlusCircle className="h-4 w-4 mr-1" />
                New Article
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Choose Article Type</DialogTitle>
                <DialogDescription>
                  Select the type of article you want to create
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                {articleTypes.map((type) => (
                  <Link 
                    key={type.id}
                    to="/admin/articles/new"
                    state={{ articleType: type.id }}
                    onClick={() => setOpen(false)}
                  >
                    <Card className="cursor-pointer hover:border-primary transition-colors">
                      <CardHeader className={`flex flex-row items-center space-y-0 gap-3 pb-2 ${type.color} rounded-t-lg`}>
                        {type.icon}
                        <CardTitle className="text-lg">{type.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">
                          {type.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="bg-white rounded-md shadow p-6">
          <p className="text-center text-gray-500 py-8">
            You haven't created any articles yet. Click "New Article" to get started.
          </p>
        </div>
      </div>
    </AdminPortalLayout>
  );
};

export default MyArticles;
