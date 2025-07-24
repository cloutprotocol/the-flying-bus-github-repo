import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  Mail, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  Download,
  BarChart3
} from 'lucide-react';
import { 
  invitationAnalyticsService, 
  type InvitationMetrics, 
  type InvitationTrendData,
  type InvitationReport 
} from '@/services/invitationAnalyticsService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface InvitationAnalyticsDashboardProps {
  className?: string;
}

const InvitationAnalyticsDashboard: React.FC<InvitationAnalyticsDashboardProps> = ({ className }) => {
  const [metrics, setMetrics] = useState<InvitationMetrics | null>(null);
  const [trends, setTrends] = useState<InvitationTrendData[]>([]);
  const [report, setReport] = useState<InvitationReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const [metricsResult, trendsResult, reportResult] = await Promise.all([
        invitationAnalyticsService.getInvitationMetrics(),
        invitationAnalyticsService.getInvitationTrends(30),
        invitationAnalyticsService.generateInvitationReport()
      ]);

      if (metricsResult.error) {
        throw new Error(metricsResult.error.message || 'Failed to load metrics');
      }

      if (trendsResult.error) {
        console.warn('Failed to load trends:', trendsResult.error);
      }

      if (reportResult.error) {
        console.warn('Failed to load report:', reportResult.error);
      }

      setMetrics(metricsResult.data);
      setTrends(trendsResult.data || []);
      setReport(reportResult.data);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast({
        title: "Error loading analytics",
        description: error instanceof Error ? error.message : 'Failed to load invitation analytics',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAnalyticsData();
    setIsRefreshing(false);
    toast({
      title: "Analytics refreshed",
      description: "Invitation analytics data has been updated.",
    });
  };

  const handleExportReport = async () => {
    if (!report) return;
    
    try {
      const reportData = {
        generatedAt: new Date().toISOString(),
        ...report
      };
      
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invitation-analytics-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Report exported",
        description: "Analytics report has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export analytics report.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Invitation Analytics</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-600">Failed to load invitation analytics</p>
        <Button onClick={loadAnalyticsData} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Invitation Analytics</h2>
          <p className="text-gray-600 text-sm">Track invitation lifecycle and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportReport}
            disabled={!report}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Performance Alerts */}
      {report?.performanceAlerts && report.performanceAlerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Performance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.performanceAlerts.map((alert, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-orange-800">{alert}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-3xl font-bold">{metrics.totalRequests}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.pendingRequests} pending
                </p>
              </div>
              <div className="bg-blue-100 p-2 rounded-full">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <p className="text-3xl font-bold">{metrics.conversionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.claimedInvitations} of {metrics.approvedRequests} claimed
                </p>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email Delivery</p>
                <p className="text-3xl font-bold">{metrics.emailDeliveryRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Success rate
                </p>
              </div>
              <div className="bg-purple-100 p-2 rounded-full">
                <Mail className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Processing</p>
                <p className="text-3xl font-bold">{metrics.averageProcessingTime}h</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Review time
                </p>
              </div>
              <div className="bg-orange-100 p-2 rounded-full">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Request Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <UserCheck className="w-3 h-3 mr-1" />
                    Approved
                  </Badge>
                </div>
                <span className="font-semibold">{metrics.approvedRequests}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    <UserX className="w-3 h-3 mr-1" />
                    Denied
                  </Badge>
                </div>
                <span className="font-semibold">{metrics.deniedRequests}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </Badge>
                </div>
                <span className="font-semibold">{metrics.pendingRequests}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-blue-600 border-blue-600">
                    <UserCheck className="w-3 h-3 mr-1" />
                    Claimed
                  </Badge>
                </div>
                <span className="font-semibold">{metrics.claimedInvitations}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        {report?.conversionFunnel && (
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.conversionFunnel.map((stage, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{stage.stage}</span>
                      <span className="text-sm text-muted-foreground">
                        {stage.count} ({stage.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stage.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Trends Chart */}
      {trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>30-Day Invitation Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="requests" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Requests"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="approvals" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Approvals"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="claims" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="Claims"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InvitationAnalyticsDashboard;