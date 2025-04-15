
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
  AlertTriangle, 
  Search, 
  Shield,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  MessageSquare,
  User,
  Calendar,
  Info
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';

// Mock data for user reports
const MOCK_REPORTS = [
  {
    id: '1',
    type: 'comment',
    contentTitle: 'Comment on: "The Future of Ocean Conservation"',
    reportedUser: 'Alex Smith',
    reportedUserId: 'user1',
    reporterName: 'Jordan Lee',
    reporterEmail: 'jordan.lee@email.com',
    reason: 'Inappropriate language that may not be suitable for young readers',
    status: 'pending',
    createdAt: new Date('2025-04-14T09:30:00'),
    details: 'The comment contains words like "stupid" and "idiotic" which are against our community guidelines for a kids platform.'
  },
  {
    id: '2',
    type: 'article',
    contentTitle: 'Video Games in Education',
    reportedUser: 'Jamie Lee',
    reportedUserId: 'user2',
    reporterName: 'Taylor Wilson',
    reporterEmail: 'taylor.wilson@email.com',
    reason: 'Content contains promotional material',
    status: 'pending',
    createdAt: new Date('2025-04-13T14:15:00'),
    details: 'The article prominently features specific game titles and includes what appear to be promotional links.'
  },
  {
    id: '3',
    type: 'user',
    contentTitle: 'User Profile',
    reportedUser: 'Casey Johnson',
    reportedUserId: 'user3',
    reporterName: 'Riley Smith',
    reporterEmail: 'riley.smith@email.com',
    reason: 'Inappropriate username/avatar',
    status: 'under-review',
    createdAt: new Date('2025-04-12T11:45:00'),
    details: 'The user\'s avatar contains an image that may not be appropriate for our platform.'
  },
  {
    id: '4',
    type: 'comment',
    contentTitle: 'Comment on: "Should Schools Ban Smartphones?"',
    reportedUser: 'Morgan Parker',
    reportedUserId: 'user4',
    reporterName: 'Avery Thompson',
    reporterEmail: 'avery.thompson@email.com',
    reason: 'Bullying or harassment',
    status: 'resolved',
    createdAt: new Date('2025-04-11T16:20:00'),
    details: 'The comment seems to be targeting another commenter with personal attacks rather than discussing the topic.'
  },
  {
    id: '5',
    type: 'debate',
    contentTitle: 'Should Video Games Be Taught in Schools?',
    reportedUser: 'Jordan Parker',
    reportedUserId: 'user5',
    reporterName: 'Casey Miller',
    reporterEmail: 'casey.miller@email.com',
    reason: 'Misinformation',
    status: 'pending',
    createdAt: new Date('2025-04-10T10:10:00'),
    details: 'The article contains several unverified claims about the educational benefits of video games without citing sources.'
  }
];

const ReportManagement = () => {
  const [filter, setFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const { toast } = useToast();
  
  // Filter reports based on selected filters and search term
  const filteredReports = MOCK_REPORTS.filter(report => {
    const matchesStatus = filter === 'all' || report.status === filter;
    const matchesType = typeFilter === 'all' || report.type === typeFilter;
    const matchesSearch = 
      report.contentTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reportedUser.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reason.toLowerCase().includes(searchTerm.toLowerCase());
      
    return matchesStatus && matchesType && matchesSearch;
  });

  const handleResolve = (reportId: string) => {
    toast({
      title: "Report Resolved",
      description: `Report ID: ${reportId} has been marked as resolved`,
    });
  };

  const handleDismiss = (reportId: string) => {
    toast({
      title: "Report Dismissed",
      description: `Report ID: ${reportId} has been dismissed`,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <AlertTriangle className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
      case 'under-review':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Shield className="h-3 w-3 mr-1" /> Under Review
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="h-4 w-4 inline mr-1" />;
      case 'article':
        return <FileText className="h-4 w-4 inline mr-1" />;
      case 'user':
        return <User className="h-4 w-4 inline mr-1" />;
      case 'debate':
        return <Info className="h-4 w-4 inline mr-1" />;
      default:
        return <FileText className="h-4 w-4 inline mr-1" />;
    }
  };

  return (
    <AdminPortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Reports</h1>
          <p className="text-muted-foreground">
            Review and manage reports submitted by readers and users
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
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
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="comment">Comments</SelectItem>
                <SelectItem value="article">Articles</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="debate">Debates</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Tabs defaultValue="pending" onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="pending">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Pending
              </TabsTrigger>
              <TabsTrigger value="under-review">
                <Shield className="h-4 w-4 mr-2" />
                Under Review
              </TabsTrigger>
              <TabsTrigger value="resolved">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Resolved
              </TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
            
            <TabsContent value={filter} className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Content</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reported User</TableHead>
                        <TableHead>Reporter</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                            No reports found matching your criteria.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredReports.map(report => (
                          <TableRow key={report.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {report.contentTitle}
                            </TableCell>
                            <TableCell>
                              {getTypeIcon(report.type)}
                              {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                            </TableCell>
                            <TableCell>{getStatusBadge(report.status)}</TableCell>
                            <TableCell>{report.reportedUser}</TableCell>
                            <TableCell>{report.reporterName}</TableCell>
                            <TableCell>
                              <span className="text-muted-foreground text-sm">
                                {formatDistanceToNow(report.createdAt, { addSuffix: true })}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Eye className="h-4 w-4 mr-1" />
                                      Details
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Report Details</DialogTitle>
                                      <DialogDescription>
                                        Review the complete report information.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <ScrollArea className="h-[400px] mt-4">
                                      <div className="space-y-4 p-1">
                                        <div className="flex justify-between">
                                          <Badge className="capitalize">{report.type}</Badge>
                                          {getStatusBadge(report.status)}
                                        </div>
                                        
                                        <div>
                                          <h3 className="font-semibold text-sm">Content</h3>
                                          <p className="text-sm">{report.contentTitle}</p>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <h3 className="font-semibold text-sm">Reported User</h3>
                                            <p className="text-sm">{report.reportedUser}</p>
                                            <p className="text-xs text-muted-foreground">ID: {report.reportedUserId}</p>
                                          </div>
                                          
                                          <div>
                                            <h3 className="font-semibold text-sm">Reported By</h3>
                                            <p className="text-sm">{report.reporterName}</p>
                                            <p className="text-xs text-muted-foreground">{report.reporterEmail}</p>
                                          </div>
                                        </div>
                                        
                                        <div>
                                          <h3 className="font-semibold text-sm">Reason</h3>
                                          <p className="text-sm">{report.reason}</p>
                                        </div>
                                        
                                        <div>
                                          <h3 className="font-semibold text-sm">Details</h3>
                                          <p className="text-sm">{report.details}</p>
                                        </div>
                                        
                                        <div>
                                          <h3 className="font-semibold text-sm">Date Reported</h3>
                                          <p className="text-sm">{report.createdAt.toLocaleString()}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(report.createdAt, { addSuffix: true })}
                                          </p>
                                        </div>
                                      </div>
                                    </ScrollArea>
                                    <DialogFooter>
                                      {report.status !== 'resolved' && (
                                        <>
                                          <Button 
                                            variant="outline" 
                                            onClick={() => handleDismiss(report.id)}
                                          >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Dismiss Report
                                          </Button>
                                          <Button 
                                            onClick={() => handleResolve(report.id)}
                                          >
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Mark as Resolved
                                          </Button>
                                        </>
                                      )}
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                                
                                {report.status !== 'resolved' && (
                                  <>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => handleDismiss(report.id)}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Dismiss
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => handleResolve(report.id)}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Resolve
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

export default ReportManagement;
