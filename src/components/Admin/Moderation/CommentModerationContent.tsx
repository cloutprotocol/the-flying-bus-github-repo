
import React from 'react';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ModerationCommentList from '@/components/Admin/Moderation/ModerationCommentList';

interface CommentModerationContentProps {
  loading: boolean;
  comments: any[];
  totalCount: number;
  processingIds: string[];
  onApprove: (commentId: string) => Promise<void>;
  onReject: (commentId: string) => Promise<void>;
  loadMoreComments?: () => void;
}

const CommentModerationContent: React.FC<CommentModerationContentProps> = ({
  loading,
  comments,
  totalCount,
  processingIds,
  onApprove,
  onReject,
  loadMoreComments
}) => {
  // Initial loading state with skeletons
  if (loading && comments.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // No comments state
  if (!loading && comments.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">No comments found matching your criteria.</p>
        </CardContent>
      </Card>
    );
  }

  // Content with comments
  return (
    <>
      <ModerationCommentList 
        comments={comments}
        onApprove={onApprove}
        onReject={onReject}
        processingIds={processingIds}
      />
      
      {totalCount > comments.length && loadMoreComments && (
        <div className="flex justify-center mt-4">
          <Button 
            variant="outline" 
            onClick={loadMoreComments}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </>
  );
};

export default CommentModerationContent;
