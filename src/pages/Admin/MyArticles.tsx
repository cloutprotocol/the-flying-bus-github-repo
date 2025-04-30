
import React, { useState } from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil, Eye, Trash2 } from 'lucide-react';
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
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BadgeInfo, FileEdit, Newspaper, ListTodo, BookOpen, Video } from 'lucide-react';
import { useUserArticles } from '@/hooks/useUserArticles';
import StatusBadge from '@/components/Admin/Status/StatusBadge';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

const MyArticles = () => {
  const [open, setOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<string | null>(null);
  
  const {
    articles,
    isLoading,
    totalCount,
    currentPage,
    totalPages,
    handlePageChange,
    deleteArticle
  } = useUserArticles();

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
  
  const handleDeleteConfirm = () => {
    if (articleToDelete) {
      deleteArticle(articleToDelete);
      setArticleToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

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
        
        <div className="bg-white rounded-md shadow">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-48"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-24 bg-gray-200 rounded"></div>
                    <div className="h-8 w-20 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="p-6">
              <p className="text-center text-gray-500 py-8">
                You haven't created any articles yet. Click "New Article" to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {articles.map((article) => (
                    <tr key={article.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{article.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={article.status as any} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="capitalize text-sm text-gray-700">
                          {article.article_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(article.updated_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Link to={`/articles/${article.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link to={`/admin/articles/edit/${article.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 hover:text-destructive"
                            onClick={() => setArticleToDelete(article.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {totalPages > 1 && (
                <div className="flex items-center justify-center py-4 bg-white border-t">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handlePageChange(currentPage - 1)}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            isActive={currentPage === i + 1}
                            onClick={() => handlePageChange(i + 1)}
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handlePageChange(currentPage + 1)}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <AlertDialog open={!!articleToDelete} onOpenChange={() => setArticleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              article and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPortalLayout>
  );
};

export default MyArticles;
