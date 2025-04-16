
import React from 'react';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import ModerationCommentList from '@/components/Admin/Moderation/ModerationCommentList';

interface CommentModerationContentProps {
  loading: boolean;
  comments: any[];
  totalCount: number;
  processingIds: string[];
  onApprove: (commentId: string) => Promise<void>;
  onReject: (commentId: string) => Promise<void>;
}

const CommentModerationContent: React.FC<CommentModerationContentProps> = ({
  loading,
  comments,
  totalCount,
  processingIds,
  onApprove,
  onReject
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading comments...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (comments.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">No comments found matching your criteria.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ModerationCommentList 
        comments={comments}
        onApprove={onApprove}
        onReject={onReject}
        processingIds={processingIds}
      />
      
      {totalCount > comments.length && (
        <div className="flex justify-center mt-4">
          <Button variant="outline">
            Load More
          </Button>
        </div>
      )}
    </>
  );
};

export default CommentModerationContent;
