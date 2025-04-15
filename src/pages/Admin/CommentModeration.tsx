
import React, { useState } from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare,
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Flag, 
  AlertTriangle 
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import ModerationCommentList from '@/components/Admin/Moderation/ModerationCommentList';

const CommentModeration = () => {
  const [filter, setFilter] = useState('flagged');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const handleApprove = (commentId: string) => {
    toast({
      title: "Comment Approved",
      description: `Comment ID: ${commentId} has been approved`,
    });
  };

  const handleReject = (commentId: string) => {
    toast({
      title: "Comment Rejected",
      description: `Comment ID: ${commentId} has been removed`,
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
          
          <Tabs defaultValue="flagged" onValueChange={setFilter}>
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
              <ModerationCommentList 
                filter={filter} 
                searchTerm={searchTerm}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminPortalLayout>
  );
};

export default CommentModeration;
