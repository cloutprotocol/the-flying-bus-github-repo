
import React, { useState } from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import ApprovalQueueList, { ArticleReviewItem } from '@/components/Admin/ApprovalQueue/ApprovalQueueList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

// Mock data for the approval queue
const MOCK_ARTICLES: ArticleReviewItem[] = [
  {
    id: '1',
    title: 'The Future of Ocean Conservation',
    author: 'Jamie Smith',
    status: 'pending',
    submittedAt: new Date('2025-04-10T10:30:00'),
    category: 'Headliners',
    priority: 'high'
  },
  {
    id: '2',
    title: 'Should Video Games Be Taught in Schools?',
    author: 'Alex Johnson',
    status: 'pending',
    submittedAt: new Date('2025-04-09T14:15:00'),
    category: 'Debates',
    priority: 'medium'
  },
  {
    id: '3',
    title: 'Interview with a Young Chef',
    author: 'Taylor Brown',
    status: 'pending',
    submittedAt: new Date('2025-04-08T09:45:00'),
    category: 'Spice It Up',
    priority: 'low'
  },
  {
    id: '4',
    title: 'The Mystery of the Missing Library Book: Part 1',
    author: 'Riley Wilson',
    status: 'draft',
    submittedAt: new Date('2025-04-07T16:20:00'),
    category: 'Storyboard',
    priority: 'medium'
  },
  {
    id: '5',
    title: "Our School's New Recycling Program", // Use double quotes to escape the apostrophe
    author: 'Casey Miller',
    status: 'rejected',
    submittedAt: new Date('2025-04-06T11:10:00'),
    category: 'School News',
    priority: 'low'
  },
  {
    id: '6',
    title: 'How Plants Communicate',
    author: 'Jordan Lee',
    status: 'published',
    submittedAt: new Date('2025-04-05T13:40:00'),
    category: 'Learning',
    priority: 'medium'
  }
];

const ApprovalQueue = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  
  const filteredArticles = MOCK_ARTICLES.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         article.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || article.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || article.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleStatusChange = (articleId: string, newStatus: 'published' | 'rejected' | 'draft') => {
    // In a real app, this would update the database
    console.log(`Article ${articleId} status changed to ${newStatus}`);
    // For the mock data, we'd update the state here
  };

  return (
    <AdminPortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Review</h1>
          <p className="text-muted-foreground">
            Review and approve articles submitted by authors
          </p>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles or authors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Headliners">Headliners</SelectItem>
                <SelectItem value="Debates">Debates</SelectItem>
                <SelectItem value="Spice It Up">Spice It Up</SelectItem>
                <SelectItem value="Storyboard">Storyboard</SelectItem>
                <SelectItem value="School News">School News</SelectItem>
                <SelectItem value="Learning">Learning</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Tabs defaultValue="pending" onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="pending">Pending Review</TabsTrigger>
              <TabsTrigger value="published">Published</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
            
            <TabsContent value={statusFilter} className="mt-4">
              <ApprovalQueueList 
                articles={filteredArticles} 
                onStatusChange={handleStatusChange} 
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminPortalLayout>
  );
};

export default ApprovalQueue;
