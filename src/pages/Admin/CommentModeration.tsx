
import React, { useState, useEffect } from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare,
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Flag, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import ModerationCommentList from '@/components/Admin/Moderation/ModerationCommentList';
import { getFlaggedComments } from '@/services/commentService';
import { useModeration } from '@/hooks/useModeration';
import ModeratorDashboard from '@/components/Admin/Moderation/ModeratorDashboard';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

const CommentModeration = () => {
  const [filter, setFilter] = useState('flagged');
  const [searchTerm, setSearchTerm] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();
  const { handleApprove, handleReject, processingIds } = useModeration();

  useEffect(() => {
    const fetchComments = async () => {
      setLoading(true);
      try {
        logger.info(LogSource.MODERATION, 'Fetching comments for moderation', { filter, searchTerm });
        const { comments, count, error } = await getFlaggedComments(filter, searchTerm);
        if (error) {
          logger.error(LogSource.MODERATION, 'Error fetching comments', { error });
          toast({
            title: "Error",
            description: "Could not load comments for moderation",
            variant: "destructive"
          });
        } else {
          setComments(comments);
          setTotalCount(count);
          logger.info(LogSource.MODERATION, 'Comments fetched successfully', { count });
        }
      } catch (err) {
        logger.error(LogSource.MODERATION, 'Exception fetching comments', err);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [filter, searchTerm, toast]);

  const onApprove = async (commentId: string) => {
    logger.info(LogSource.MODERATION, 'Approving comment', { commentId });
    await handleApprove(commentId, (id) => {
      // Remove the comment from the list after successful approval
      setComments(prev => prev.filter(comment => comment.id !== id));
      setTotalCount(prev => Math.max(0, prev - 1));
    });
  };

  const onReject = async (commentId: string) => {
    logger.info(LogSource.MODERATION, 'Rejecting comment', { commentId });
    await handleReject(commentId, undefined, (id) => {
      // Remove the comment from the list after successful rejection
      setComments(prev => prev.filter(comment => comment.id !== id));
      setTotalCount(prev => Math.max(0, prev - 1));
    });
  };

  return (
    <AdminPortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comment Moderation</h1>
          <p className="text-muted-foreground">
            Review, approve, or remove comments flagged for moderation
          </p>
        </div>

        <Tabs defaultValue="comments">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="mt-6">
            <ModeratorDashboard />
          </TabsContent>
          
          <TabsContent value="comments" className="mt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search comments or users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                
                <Select
                  value={filter}
                  onValueChange={setFilter}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Comments</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="reported">User Reported</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Tabs defaultValue={filter} onValueChange={setFilter}>
                <TabsList>
                  <TabsTrigger value="flagged">
                    <Flag className="h-4 w-4 mr-2" />
                    Flagged
                  </TabsTrigger>
                  <TabsTrigger value="reported">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Reported
                  </TabsTrigger>
                  <TabsTrigger value="pending">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Pending
                  </TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
                
                <TabsContent value={filter}>
                  {loading ? (
                    <Card>
                      <CardContent className="py-10 flex justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="text-muted-foreground">Loading comments...</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <ModerationCommentList 
                      items={comments}
                      onApprove={onApprove}
                      onReject={onReject}
                      processingIds={processingIds}
                    />
                  )}
                  
                  {!loading && comments.length === 0 && (
                    <Card>
                      <CardContent className="py-10 text-center">
                        <p className="text-muted-foreground">No comments found matching your criteria.</p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {!loading && comments.length > 0 && totalCount > comments.length && (
                    <div className="flex justify-center mt-4">
                      <Button variant="outline">
                        Load More
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminPortalLayout>
  );
};

export default CommentModeration;
