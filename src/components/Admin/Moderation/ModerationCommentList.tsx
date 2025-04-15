
import React from 'react';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  Flag, 
  AlertTriangle,
  Eye,
  MessageSquare
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Mock data for comments
const MOCK_COMMENTS = [
  {
    id: '1',
    content: 'This article is completely wrong and misleading! The author clearly doesn\'t understand basic science.',
    author: {
      id: 'user1',
      name: 'Alex Smith',
      avatar: 'https://i.pravatar.cc/150?u=1',
    },
    articleTitle: 'How Plants Communicate',
    createdAt: new Date('2025-04-14T08:30:00'),
    status: 'flagged',
    reason: 'Potentially harmful or offensive content',
    reportedBy: 'System',
  },
  {
    id: '2',
    content: 'Check out my website at www.s ketch y-site.com for cool games!',
    author: {
      id: 'user2',
      name: 'Jamie Lee',
      avatar: 'https://i.pravatar.cc/150?u=2',
    },
    articleTitle: 'Video Games in Education',
    createdAt: new Date('2025-04-14T10:15:00'),
    status: 'flagged',
    reason: 'Potential spam or external link',
    reportedBy: 'System',
  },
  {
    id: '3',
    content: 'This comment is inappropriate and shouldn\'t be visible to our young readers.',
    author: {
      id: 'user3',
      name: 'Taylor Wilson',
      avatar: 'https://i.pravatar.cc/150?u=3',
    },
    articleTitle: 'Our School\'s New Recycling Program',
    createdAt: new Date('2025-04-13T14:45:00'),
    status: 'reported',
    reason: 'Inappropriate for young readers',
    reportedBy: 'Reader',
  },
  {
    id: '4',
    content: 'I think the author did a great job explaining this complex topic. My kids really enjoyed learning about plant communication!',
    author: {
      id: 'user4',
      name: 'Jordan Parker',
      avatar: 'https://i.pravatar.cc/150?u=4',
    },
    articleTitle: 'How Plants Communicate',
    createdAt: new Date('2025-04-12T16:20:00'),
    status: 'pending',
    reason: '',
    reportedBy: '',
  },
  {
    id: '5',
    content: 'Great article! I learned so much about ocean conservation.',
    author: {
      id: 'user5',
      name: 'Casey Johnson',
      avatar: 'https://i.pravatar.cc/150?u=5',
    },
    articleTitle: 'The Future of Ocean Conservation',
    createdAt: new Date('2025-04-11T11:10:00'),
    status: 'approved',
    reason: '',
    reportedBy: '',
  }
];

interface ModerationCommentListProps {
  filter: string;
  searchTerm: string;
  onApprove: (commentId: string) => void;
  onReject: (commentId: string) => void;
}

const ModerationCommentList: React.FC<ModerationCommentListProps> = ({
  filter,
  searchTerm,
  onApprove,
  onReject
}) => {
  // Filter comments based on filter and search term
  const filteredComments = MOCK_COMMENTS.filter(comment => {
    const matchesFilter = filter === 'all' || comment.status === filter;
    const matchesSearch = 
      comment.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.author.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.articleTitle.toLowerCase().includes(searchTerm.toLowerCase());
      
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'flagged':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Flag className="h-3 w-3 mr-1" /> Flagged
          </Badge>
        );
      case 'reported':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" /> Reported
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <MessageSquare className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {filteredComments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No comments found matching your criteria.
          </CardContent>
        </Card>
      ) : (
        filteredComments.map(comment => (
          <Card key={comment.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
                      <AvatarFallback>{comment.author.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">{comment.author.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(comment.status)}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Comment Details</DialogTitle>
                          <DialogDescription>
                            Review the comment details before making a decision.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <h4 className="text-sm font-medium">Comment</h4>
                            <p className="text-sm mt-1">{comment.content}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium">Article</h4>
                              <p className="text-sm mt-1">{comment.articleTitle}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium">Author</h4>
                              <p className="text-sm mt-1">{comment.author.name}</p>
                            </div>
                          </div>
                          {comment.reason && (
                            <div>
                              <h4 className="text-sm font-medium">Flagged Reason</h4>
                              <p className="text-sm mt-1">{comment.reason}</p>
                            </div>
                          )}
                          {comment.reportedBy && (
                            <div>
                              <h4 className="text-sm font-medium">Reported By</h4>
                              <p className="text-sm mt-1">{comment.reportedBy}</p>
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => onReject(comment.id)}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                          <Button onClick={() => onApprove(comment.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-3">
                  <span className="text-xs font-medium text-muted-foreground">on article:</span>
                  <span className="text-xs ml-1">{comment.articleTitle}</span>
                </div>
                <p className="text-sm mb-4">{comment.content}</p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onReject(comment.id)}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => onApprove(comment.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default ModerationCommentList;
