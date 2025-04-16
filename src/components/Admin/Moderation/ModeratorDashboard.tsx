
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Clock, 
  Flag, 
  ShieldCheck, 
  Users, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Eye
} from 'lucide-react';
import { getModerationMetrics } from '@/services/moderationService';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

const ModeratorDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        logger.info(LogSource.MODERATION, 'Fetching moderation metrics', { timeframe });
        const { stats, error } = await getModerationMetrics();
        
        if (error) {
          console.error('Error fetching moderation metrics:', error);
          toast({
            title: "Error",
            description: "Could not load moderation metrics",
            variant: "destructive"
          });
        } else {
          setMetrics(stats);
        }
      } catch (err) {
        console.error('Exception fetching moderation metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
  }, [timeframe, toast]);
  
  // Prepare data for charts
  const prepareActionChartData = () => {
    if (!metrics?.byAction) return [];
    
    return metrics.byAction.map((item: any) => ({
      name: item.action.charAt(0).toUpperCase() + item.action.slice(1),
      count: item.count
    }));
  };
  
  const prepareContentTypeChartData = () => {
    if (!metrics?.byContentType) return [];
    
    return metrics.byContentType.map((item: any) => ({
      name: item.content_type.charAt(0).toUpperCase() + item.content_type.slice(1),
      count: item.count
    }));
  };
  
  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'approve':
        return '#16C47F'; // green
      case 'reject':
        return '#F93827'; // red
      case 'flag':
        return '#FFCA58'; // yellow
      case 'report':
        return '#4FB9D0'; // blue
      default:
        return '#315057'; // dark blue
    }
  };
  
  const getContentTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'article':
        return '#4FB9D0'; // blue
      case 'comment':
        return '#FFCA58'; // yellow
      case 'debate':
        return '#16C47F'; // green
      case 'profile':
        return '#F93827'; // red
      default:
        return '#315057'; // dark blue
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Moderation Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of moderation activities and metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={timeframe === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('day')}
          >
            <Clock className="h-4 w-4 mr-2" />
            Today
          </Button>
          <Button
            variant={timeframe === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('week')}
          >
            <Clock className="h-4 w-4 mr-2" />
            This Week
          </Button>
          <Button
            variant={timeframe === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('month')}
          >
            <Clock className="h-4 w-4 mr-2" />
            This Month
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Reviews</p>
                <p className="text-3xl font-bold">{loading ? '-' : metrics?.pendingCount || 0}</p>
              </div>
              <div className="bg-orange-100 p-2 rounded-full">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reported Items</p>
                <p className="text-3xl font-bold">{loading ? '-' : metrics?.reportedCount || 0}</p>
              </div>
              <div className="bg-red-100 p-2 rounded-full">
                <Flag className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Moderators</p>
                <p className="text-3xl font-bold">{loading ? '-' : metrics?.moderatorsCount || 0}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-full">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Flagged Users</p>
                <p className="text-3xl font-bold">{loading ? '-' : metrics?.flaggedUsersCount || 0}</p>
              </div>
              <div className="bg-purple-100 p-2 rounded-full">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="actions">
        <TabsList>
          <TabsTrigger value="actions">
            <BarChart3 className="h-4 w-4 mr-2" />
            Actions
          </TabsTrigger>
          <TabsTrigger value="content-types">
            <Flag className="h-4 w-4 mr-2" />
            Content Types
          </TabsTrigger>
          <TabsTrigger value="moderators">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Top Moderators
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="actions" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Moderation Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <p>Loading chart data...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prepareActionChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" name="Count" fill="#315057">
                      {prepareActionChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getActionColor(entry.name)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="content-types" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Types Moderated</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <p>Loading chart data...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prepareContentTypeChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" name="Count" fill="#315057">
                      {prepareContentTypeChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getContentTypeColor(entry.name)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="moderators" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Moderators</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col gap-4 animate-pulse">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center justify-between border-b pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="w-32 h-5 bg-gray-200 rounded"></div>
                      </div>
                      <div className="w-16 h-5 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {metrics?.topModerators?.length > 0 ? (
                    metrics.topModerators.map((mod: any, index: number) => (
                      <div key={index} className="flex items-center justify-between border-b pb-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={mod.avatar_url} alt={mod.display_name} />
                            <AvatarFallback>{mod.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{mod.display_name}</span>
                        </div>
                        <Badge variant="outline">
                          {mod.action_count} actions
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      No moderator activity in this time period
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <CardTitle>Recent Moderation Actions</CardTitle>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center justify-between border-b pb-4">
                  <div className="flex-1">
                    <div className="w-3/4 h-5 bg-gray-200 rounded mb-2"></div>
                    <div className="w-1/4 h-4 bg-gray-200 rounded"></div>
                  </div>
                  <div className="w-24 h-6 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {metrics?.recentActions?.length > 0 ? (
                metrics.recentActions.map((action: any, index: number) => (
                  <div key={index} className="flex items-center justify-between border-b pb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {action.action === 'approve' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        {action.action === 'reject' && <XCircle className="h-4 w-4 text-red-600" />}
                        {action.action === 'flag' && <Flag className="h-4 w-4 text-amber-600" />}
                        {action.action === 'report' && <AlertTriangle className="h-4 w-4 text-orange-600" />}
                        <span className="font-medium">{action.action.charAt(0).toUpperCase() + action.action.slice(1)}</span>
                        <span className="text-muted-foreground">by {action.moderator_name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {action.content_type.charAt(0).toUpperCase() + action.content_type.slice(1)} ID: {action.content_id}
                      </p>
                    </div>
                    <Badge variant={
                      action.action === 'approve' ? 'outline' :
                      action.action === 'reject' ? 'destructive' : 'secondary'
                    }>
                      {new Date(action.created_at).toLocaleTimeString()} 
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  No recent moderation actions
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModeratorDashboard;
