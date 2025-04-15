
import React, { useState } from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Calendar,
  BarChart,
  LineChart,
  Users,
  Activity,
  TrendingUp,
  Award,
  Eye
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import OverviewMetrics from '@/components/Admin/Analytics/OverviewMetrics';
import ContentPerformanceChart from '@/components/Admin/Analytics/ContentPerformanceChart';
import EngagementChart from '@/components/Admin/Analytics/EngagementChart';
import PopularContentTable from '@/components/Admin/Analytics/PopularContentTable';
import UserActivityChart from '@/components/Admin/Analytics/UserActivityChart';

const AnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState('7d');
  
  return (
    <AdminPortalLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              View reader engagement and content performance metrics
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select
              value={dateRange}
              onValueChange={setDateRange}
            >
              <SelectTrigger className="w-[180px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 3 months</SelectItem>
                <SelectItem value="365d">Last 12 months</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Custom Range
            </Button>
          </div>
        </div>
        
        <OverviewMetrics dateRange={dateRange} />
        
        <Tabs defaultValue="engagement" className="space-y-4">
          <TabsList>
            <TabsTrigger value="engagement">
              <Activity className="h-4 w-4 mr-2" />
              User Engagement
            </TabsTrigger>
            <TabsTrigger value="content">
              <BarChart className="h-4 w-4 mr-2" />
              Content Performance
            </TabsTrigger>
            <TabsTrigger value="audience">
              <Users className="h-4 w-4 mr-2" />
              Audience
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="engagement" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Engagement Overview</CardTitle>
                  <CardDescription>
                    Total reader engagement over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EngagementChart dateRange={dateRange} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>User Activity</CardTitle>
                  <CardDescription>
                    Active readers by time of day
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserActivityChart dateRange={dateRange} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Top Users</CardTitle>
                  <CardDescription>
                    Most active readers and contributors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-xs font-medium">{i}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">User Name {i}</p>
                            <p className="text-xs text-muted-foreground">
                              {15 - i} comments • {30 - i * 2} votes
                            </p>
                          </div>
                        </div>
                        <Award className="h-4 w-4 text-amber-500" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="content" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Content Performance</CardTitle>
                  <CardDescription>
                    Views and engagement by content category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ContentPerformanceChart dateRange={dateRange} />
                </CardContent>
              </Card>
              
              <Card className="col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Top Performing Content</CardTitle>
                    <CardDescription>
                      Articles with highest engagement rates
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <PopularContentTable dateRange={dateRange} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="audience" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Reader Demographics</CardTitle>
                  <CardDescription>
                    Age groups and interests
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground text-center">
                      Demographics data visualization will appear here
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Geographic Distribution</CardTitle>
                  <CardDescription>
                    Reader locations
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground text-center">
                      Geographic distribution map will appear here
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Reader Growth</CardTitle>
                  <CardDescription>
                    New and returning readers
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <div className="flex flex-col items-center justify-center h-full">
                    <LineChart className="h-10 w-10 text-gray-300 mb-2" />
                    <p className="text-muted-foreground text-center">
                      Reader growth chart will appear here
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminPortalLayout>
  );
};

export default AnalyticsDashboard;
