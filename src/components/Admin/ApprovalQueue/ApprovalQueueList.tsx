
import React from 'react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from '@/components/ui/table';
import StatusBadge from '../Status/StatusBadge';
import { Button } from '@/components/ui/button';
import { Check, XCircle, MessageSquare, Clock, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

// Data interface for the approval queue
export interface ArticleReviewItem {
  id: string;
  title: string;
  author: string;
  status: 'pending' | 'published' | 'rejected' | 'draft';
  submittedAt: Date;
  category: string;
  priority: 'low' | 'medium' | 'high';
}

interface ApprovalQueueListProps {
  articles: ArticleReviewItem[];
  onStatusChange: (articleId: string, newStatus: 'published' | 'rejected' | 'draft') => void;
  processingIds?: string[]; // Track articles being processed
}

const ApprovalQueueList: React.FC<ApprovalQueueListProps> = ({ 
  articles, 
  onStatusChange,
  processingIds = []
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleApprove = (articleId: string) => {
    onStatusChange(articleId, 'published');
  };

  const handleReject = (articleId: string) => {
    onStatusChange(articleId, 'rejected');
  };

  const handleView = (articleId: string) => {
    navigate(`/admin/articles/${articleId}`);
  };

  const handleComment = (articleId: string) => {
    navigate(`/admin/reviews/${articleId}`);
  };

  // Sort by priority and submission date
  const sortedArticles = [...articles].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  });

  const getPriorityClass = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return 'bg-red-50 text-red-700';
      case 'medium': return 'bg-orange-50 text-orange-700';
      case 'low': return 'bg-blue-50 text-blue-700';
      default: return '';
    }
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Article</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead className="w-[180px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedArticles.length > 0 ? (
            sortedArticles.map((article) => {
              const isProcessing = processingIds.includes(article.id);
              
              return (
                <TableRow key={article.id}>
                  <TableCell className="font-medium">{article.title}</TableCell>
                  <TableCell>{article.author}</TableCell>
                  <TableCell>{article.category}</TableCell>
                  <TableCell>
                    <StatusBadge status={article.status} size="sm" />
                  </TableCell>
                  <TableCell>
                    {new Date(article.submittedAt).toLocaleDateString()}{' '}
                    {new Date(article.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityClass(article.priority)}`}>
                      {article.priority.charAt(0).toUpperCase() + article.priority.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="icon" 
                        variant="outline" 
                        onClick={() => handleView(article.id)}
                        title="View Article"
                        disabled={isProcessing}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="outline" 
                        onClick={() => handleComment(article.id)}
                        title="Add Review Comments"
                        disabled={isProcessing}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="text-green-600 hover:bg-green-50" 
                        onClick={() => handleApprove(article.id)}
                        title="Approve"
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleReject(article.id)}
                        title="Reject"
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                No articles waiting for review
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default ApprovalQueueList;
