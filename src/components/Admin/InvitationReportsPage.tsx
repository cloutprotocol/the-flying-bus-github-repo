import React, { useState, useEffect } from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Download, 
  RefreshCw, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { 
  invitationAnalyticsService, 
  type InvitationReport,
  type InvitationTrendData 
} from '@/services/invitationAnalyticsService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const InvitationReportsPage: React.FC = () => {
  const [report, setReport] = useState<InvitationReport | null>(null);
  const [trends, setTrends] = useState<InvitationTrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90'>('30');
  const { toast } = useToast();

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod]);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const [reportResult, trendsResult] = await Promise.all([
        invitationAnalyticsService.generateInvitationReport(),
        invitationAnalyticsService.getInvitationTrends(parseInt(selectedPeriod))
      ]);

      if (reportResult.error) {
        throw new Error(reportResult.error.message || 'Failed to load report');
      }

      if (trendsResult.error) {
        console.warn('Failed to load trends:', trendsResult.error);
      }

      setReport(reportResult.data);
      setTrends(trendsResult.data || []);
    } catch (error) {
      console.error('Error loading report data:', error);
      toast({
        title: "Error loading report",
        description: error instanceof Error ? error.message : 'Failed to load invitation report',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadReportData();
    setIsRefreshing(false);
    toast({
      title: "Report refreshed",
      description: "Invitation report data has been updated.",
    });
  };

  const handleExportReport = async () => {
    if (!report) return;
    
    try {
      const reportData = {
        generatedAt: new Date().toISOString(),
        period: `${selectedPeriod} days`,
        ...report,
        trends
      };
      
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invitation-report-${selectedPeriod}days-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Report exported",
        description: "Invitation report has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export invitation report.",
        variant: "destructive",
      });
    }
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const calculateTrendPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Prepare data for charts
  const statusData = report ? [
    { name: 'Approved', value: report.metrics.approvedRequests, color: '#10b981' },
    { name: 'Denied', value: report.metrics.deniedRequests, color: '#ef4444' },
    { name: 'Pending', value: report.metrics.pendingRequests, color: '#f59e0b' }
  ] : [];

  const conversionData = report ? [
    { name: 'Claimed', value: report.metrics.claimedInvitations, color: '#3b82f6' },
    { name: 'Unclaimed', value: report.metrics.unclaimedInvitations, color: '#6b7280' }
  ] : [];

  if (isLoading) {
    return (
      <AdminPortalLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Invitation Reports</h1>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
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
      </AdminPortalLayout>
    );
  }

  if (!report) {
    return (
      <AdminPortalLayout>
        <div className="text-center py-8">
          <p className="text-gray-600">Failed to load invitation report</p>
          <Button onClick={loadReportData} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </AdminPortalLayout>
    );
  }

  return (
    <AdminPortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Invitation Reports</h1>
            <p className="text-gray-600 mt-1">Comprehensive analytics and insights for invitation management</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedPeriod} onValueChange={(value: typeof selectedPeriod) => setSelectedPeriod(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
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
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Performance Alerts */}
        {report.performanceAlerts.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-orange-800 flex items-center gap-2">
                <Activity className="w-5 h-5" />
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

        {/* Key Metrics Summary */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                  <p className="text-3xl font-bold">{report.metrics.totalRequests}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(report.metrics.totalRequests, 0)}
                    <span className="text-xs text-muted-foreground">
                      Last {selectedPeriod} days
                    </span>
                  </div>
                </div>
                <div className="bg-blue-100 p-2 rounded-full">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                  <p className="text-3xl font-bold">{report.metrics.conversionRate}%</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant={report.metrics.conversionRate >= 50 ? "default" : "destructive"}>
                      {report.metrics.conversionRate >= 50 ? "Good" : "Needs Attention"}
                    </Badge>
                  </div>
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
                  <p className="text-sm font-medium text-muted-foreground">Avg Processing Time</p>
                  <p className="text-3xl font-bold">{report.metrics.averageProcessingTime}h</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant={report.metrics.averageProcessingTime <= 24 ? "default" : "destructive"}>
                      {report.metrics.averageProcessingTime <= 24 ? "Fast" : "Slow"}
                    </Badge>
                  </div>
                </div>
                <div className="bg-purple-100 p-2 rounded-full">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email Success Rate</p>
                  <p className="text-3xl font-bold">{report.metrics.emailDeliveryRate}%</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant={report.metrics.emailDeliveryRate >= 90 ? "default" : "destructive"}>
                      {report.metrics.emailDeliveryRate >= 90 ? "Excellent" : "Issues"}
                    </Badge>
                  </div>
                </div>
                <div className="bg-orange-100 p-2 rounded-full">
                  <Activity className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Trends Chart */}
          {trends.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Invitation Trends ({selectedPeriod} days)
                </CardTitle>
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

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Request Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Tooltip />
                    <RechartsPieChart data={statusData} cx="50%" cy="50%" outerRadius={80}>
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </RechartsPieChart>
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {statusData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Conversion Funnel */}
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
        </div>

        {/* Detailed Metrics Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">REQUEST METRICS</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Requests</span>
                    <span className="text-sm font-medium">{report.metrics.totalRequests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Pending</span>
                    <span className="text-sm font-medium">{report.metrics.pendingRequests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Approved</span>
                    <span className="text-sm font-medium">{report.metrics.approvedRequests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Denied</span>
                    <span className="text-sm font-medium">{report.metrics.deniedRequests}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">CONVERSION METRICS</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm">Claimed Invitations</span>
                    <span className="text-sm font-medium">{report.metrics.claimedInvitations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Unclaimed</span>
                    <span className="text-sm font-medium">{report.metrics.unclaimedInvitations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Conversion Rate</span>
                    <span className="text-sm font-medium">{report.metrics.conversionRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Token Expiry Rate</span>
                    <span className="text-sm font-medium">{report.metrics.tokenExpiryRate}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">PERFORMANCE METRICS</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Processing Time</span>
                    <span className="text-sm font-medium">{report.metrics.averageProcessingTime}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Email Delivery Rate</span>
                    <span className="text-sm font-medium">{report.metrics.emailDeliveryRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPortalLayout>
  );
};

export default InvitationReportsPage;