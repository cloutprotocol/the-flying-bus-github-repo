import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge, { StatusType } from '@/components/Admin/Status/StatusBadge';
import { Link } from 'react-router-dom';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { deleteArticle, updateArticleStatus } from '@/services/articleService';
import StatusDropdown from '@/components/Admin/Status/StatusDropdown';
import ArticlePaginationControls from './ArticlePaginationControls';

interface RecentArticle {
  id: string;
  title: string;
  status: StatusType;
  lastEdited: string;
}

interface RecentArticlesSectionProps {
  articles: RecentArticle[];
  loading: boolean;
  onRefresh: () => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

const RecentArticlesSection: React.FC<RecentArticlesSectionProps> = ({
  articles,
  loading,
  onRefresh,
  currentPage = 1,
  totalPages = 1,
  onPageChange = () => {},
}) => {
  const [articleToDelete, setArticleToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!articleToDelete) return;
    
    const { success, error } = await deleteArticle(articleToDelete);
    
    if (success) {
      toast({
        title: "Article deleted",
        description: "The article has been successfully deleted.",
      });
      onRefresh();
    } else {
      toast({
        title: "Error",
        description: "Could not delete the article. Please try again.",
        variant: "destructive",
      });
    }
    
    setArticleToDelete(null);
  };

  const handleStatusChange = async (articleId: string, newStatus: StatusType) => {
    onRefresh(); // Refresh the list after status change
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle>Recent Articles</CardTitle>
        </div>
        <Link to="/admin/articles/new">
          <Button size="sm">
            New Article
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center border-b pb-2">
                <div className="space-y-1">
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : !articles.length ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>No articles found. Create your first article to get started!</p>
            <Link to="/admin/articles/new" className="mt-4 inline-block">
              <Button variant="outline" size="sm">Create Article</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {articles.map((article) => (
              <div key={article.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">{article.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Last edited {article.lastEdited}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusDropdown
                    currentStatus={article.status}
                    onStatusChange={(newStatus) => handleStatusChange(article.id, newStatus)}
                    articleId={article.id}
                  />
                  <div className="flex items-center gap-1">
                    <Link to={`/articles/${article.id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to={`/admin/articles/edit/${article.id}`}>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setArticleToDelete(article.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            <ArticlePaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </CardContent>

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
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default RecentArticlesSection;
