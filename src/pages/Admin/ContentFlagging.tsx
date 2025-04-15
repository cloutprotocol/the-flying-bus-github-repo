
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
  Flag, 
  Search, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  Tag
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';

// Mock data for flagged content
const MOCK_FLAGGED_CONTENT = [
  {
    id: '1',
    type: 'article',
    title: 'The Science Behind Climate Change',
    author: 'Jamie Smith',
    status: 'under-review',
    flagReason: 'Content accuracy concerns',
    flaggedAt: new Date('2025-04-14T09:30:00'),
    flaggedBy: 'Reader',
    priority: 'high'
  },
  {
    id: '2',
    type: 'article',
    title: 'New Mobile Game Review',
    author: 'Alex Johnson',
    status: 'flagged',
    flagReason: 'Potential advertisement/sponsored content',
    flaggedAt: new Date('2025-04-13T12:15:00'),
    flaggedBy: 'Moderator',
    priority: 'medium'
  },
  {
    id: '3',
    type: 'debate',
    title: 'Should Schools Ban Smartphones?',
    author: 'Taylor Brown',
    status: 'resolved',
    flagReason: 'Unbalanced viewpoints',
    flaggedAt: new Date('2025-04-12T14:45:00'),
    flaggedBy: 'System',
    priority: 'low'
  },
  {
    id: '4',
    type: 'storyboard',
    title: 'The Mystery of the Missing Library Book: Part 2',
    author: 'Riley Wilson',
    status: 'flagged',
    flagReason: 'Age-inappropriate content',
    flaggedAt: new Date('2025-04-11T10:20:00'),
    flaggedBy: 'Teacher',
    priority: 'high'
  },
  {
    id: '5',
    type: 'article',
    title: 'Understanding Vaccines',
    author: 'Casey Miller',
    status: 'under-review',
    flagReason: 'Fact checking needed',
    flaggedAt: new Date('2025-04-10T16:50:00'),
    flaggedBy: 'System',
    priority: 'high'
  }
];

const ContentFlagging = () => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const { toast } = useToast();

  // Filter content based on selected filters and search term
  const filteredContent = MOCK_FLAGGED_CONTENT.filter(content => {
    const matchesStatus = filter === 'all' || content.status === filter;
    const matchesType = typeFilter === 'all' || content.type === typeFilter;
    const matchesPriority = priorityFilter === 'all' || content.priority === priorityFilter;
    const matchesSearch = 
      content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      content.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      content.flagReason.toLowerCase().includes(searchTerm.toLowerCase());
      
    return matchesStatus && matchesType && matchesPriority && matchesSearch;
  });

  const handleApprove = (contentId: string) => {
    toast({
      title: "Content Approved",
      description: `Content ID: ${contentId} has been approved`,
    });
  };

  const handleReject = (contentId: string) => {
    toast({
      title: "Content Rejected",
      description: `Content ID: ${contentId} has been rejected`,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'flagged':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Flag className="h-3 w-3 mr-1" /> Flagged
          </Badge>
        );
      case 'under-review':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <AlertTriangle className="h-3 w-3 mr-1" /> Under Review
          </Badge>
        );
      case 'resolved':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Resolved
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">Unknown</Badge>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            High
          </Badge>
        );
      case 'medium':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            Medium
          </Badge>
        );
      case 'low':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Low
          </Badge>
        );
      default:
        return (
          <Badge>Unknown</Badge>
        );
    }
  };

  return (
    <AdminPortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Flagging</h1>
          <p className="text-muted-foreground">
            Review and manage content that has been flagged for review
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content, authors, or reasons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select
              value={typeFilter}
              onValueChange={setTypeFilter}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="article">Articles</SelectItem>
                <SelectItem value="debate">Debates</SelectItem>
                <SelectItem value="storyboard">Storyboard</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={priorityFilter}
              onValueChange={setPriorityFilter}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Tabs defaultValue="all" onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="flagged">
                <Flag className="h-4 w-4 mr-2" />
                Flagged
              </TabsTrigger>
              <TabsTrigger value="under-review">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Under Review
              </TabsTrigger>
              <TabsTrigger value="resolved">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Resolved
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value={filter} className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Flagged By</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContent.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                            No flagged content found matching your criteria.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredContent.map(content => (
                          <TableRow key={content.id}>
                            <TableCell className="font-medium">{content.title}</TableCell>
                            <TableCell>
                              {content.type === 'article' && <FileText className="h-4 w-4 inline mr-1" />}
                              {content.type === 'debate' && <Tag className="h-4 w-4 inline mr-1" />}
                              {content.type === 'storyboard' && <FileText className="h-4 w-4 inline mr-1" />}
                              {content.type.charAt(0).toUpperCase() + content.type.slice(1)}
                            </TableCell>
                            <TableCell>{getStatusBadge(content.status)}</TableCell>
                            <TableCell>{getPriorityBadge(content.priority)}</TableCell>
                            <TableCell>{content.author}</TableCell>
                            <TableCell>{content.flaggedBy}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={`/admin/reviews/${content.id}`}>
                                    <Eye className="h-4 w-4 mr-1" />
                                    Review
                                  </a>
                                </Button>
                                {content.status !== 'resolved' && (
                                  <>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => handleReject(content.id)}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => handleApprove(content.id)}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminPortalLayout>
  );
};

export default ContentFlagging;
