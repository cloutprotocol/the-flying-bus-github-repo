
import React from 'react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from '@/components/ui/table';
import StatusBadge, { StatusType } from '../Status/StatusBadge';
import { Button } from '@/components/ui/button';
import { Check, XCircle, MessageSquare, Clock, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

// Updated the interface to use StatusType from StatusBadge
export interface ArticleReviewItem {
  id: string;
  title: string;
  author: string;
  status: StatusType;
  submittedAt: Date;
  category: string;
  priority: 'low' | 'medium' | 'high';
}

interface ApprovalQueueListProps {
  articles: ArticleReviewItem[];
  onStatusChange: (articleId: string, newStatus: 'published' | 'rejected' | 'draft' | 'archived') => void;
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
    <div className="border rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Article</TableHead>
              <TableHead className="min-w-[120px]">Author</TableHead>
              <TableHead className="min-w-[120px]">Category</TableHead>
              <TableHead className="min-w-[100px]">Status</TableHead>
              <TableHead className="min-w-[140px]">Submitted</TableHead>
              <TableHead className="min-w-[100px]">Priority</TableHead>
              <TableHead className="min-w-[240px] w-[240px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedArticles.length > 0 ? (
              sortedArticles.map((article) => {
                const isProcessing = processingIds.includes(article.id);
                
                return (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium min-w-[200px]">
                      <div className="truncate max-w-[180px]" title={article.title}>
                        {article.title}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[120px]">{article.author}</TableCell>
                    <TableCell className="min-w-[120px]">{article.category}</TableCell>
                    <TableCell className="min-w-[100px]">
                      <StatusBadge status={article.status} size="sm" />
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <div className="text-sm">
                        {new Date(article.submittedAt).toLocaleDateString()}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {new Date(article.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[100px]">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityClass(article.priority)}`}>
                        {article.priority.charAt(0).toUpperCase() + article.priority.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[240px] w-[240px]">
                      <div className="flex items-center gap-1 flex-wrap">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleView(article.id)}
                          title="View Article"
                          disabled={isProcessing}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleComment(article.id)}
                          title="Add Review Comments"
                          disabled={isProcessing}
                          className="h-8 w-8 p-0"
                        >
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-green-600 hover:bg-green-50 h-8 w-8 p-0" 
                          onClick={() => handleApprove(article.id)}
                          title="Approve"
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                          onClick={() => handleReject(article.id)}
                          title="Reject"
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <XCircle className="h-3 w-3" />
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
    </div>
  );
};

export default ApprovalQueueList;
