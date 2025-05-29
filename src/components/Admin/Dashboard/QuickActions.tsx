
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  PenLine, 
  MessageSquare, 
  AlertTriangle,
  Users,
  Image
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuickActionsProps {
  pendingArticles?: number;
  pendingComments?: number;
  flaggedContent?: number;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  pendingArticles = 0,
  pendingComments = 0,
  flaggedContent = 0,
}) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/admin/articles/select-type">
          <Button variant="outline" className="w-full">
            <PenLine className="h-4 w-4 mr-2" />
            New Article
          </Button>
        </Link>
        
        <Link to="/admin/articles">
          <Button variant="outline" className="w-full relative">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Pending Articles
            {pendingArticles > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2">
                {pendingArticles}
              </Badge>
            )}
          </Button>
        </Link>

        <Link to="/admin/comment-moderation">
          <Button variant="outline" className="w-full relative">
            <MessageSquare className="h-4 w-4 mr-2" />
            Comments
            {pendingComments > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2">
                {pendingComments}
              </Badge>
            )}
          </Button>
        </Link>

        <Link to="/admin/content-flagging">
          <Button variant="outline" className="w-full relative">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Flagged Content
            {flaggedContent > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2">
                {flaggedContent}
              </Badge>
            )}
          </Button>
        </Link>

        <Link to="/admin/users">
          <Button variant="outline" className="w-full">
            <Users className="h-4 w-4 mr-2" />
            Manage Users
          </Button>
        </Link>

        <Link to="/admin/media">
          <Button variant="outline" className="w-full">
            <Image className="h-4 w-4 mr-2" />
            Media Library
          </Button>
        </Link>
      </div>
    </Card>
  );
};

export default QuickActions;
