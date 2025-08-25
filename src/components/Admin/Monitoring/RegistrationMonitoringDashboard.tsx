import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  AlertTriangle, 
  Clock, 
  Shield,
  RefreshCw,
  Download
} from 'lucide-react';
import { registrationMonitoring, type RegistrationMetrics } from '@/services/registrationMonitoringService';
import { logger } from '@/utils/logger';

interface TimeRange {
  label: string;
  hours: number;
}

const TIME_RANGES: TimeRange[] = [
  { label: 'Last Hour', hours: 1 },
  { label: 'Last 24 Hours', hours: 24 },
  { label: 'Last 7 Days', hours: 168 },
  { label: 'Last 30 Days', hours: 720 }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const RegistrationMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<RegistrationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(TIME_RANGES[1]);
  const [currentSuccessRate, setCurrentSuccessRate] = useState<number>(0);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - selectedTimeRange.hours * 60 * 60 * 1000).toISOString();

      const [metricsData, successRate] = await Promise.all([
        registrationMonitoring.getRegistrationMetrics(startDate, endDate),
        registrationMonitoring.getCurrentSuccessRate(selectedTimeRange.hours)
      ]);

      setMetrics(metricsData);
      setCurrentSuccessRate(successRate);
    } catch (err) {
      logger.error('Failed to fetch registration metrics', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [selectedTimeRange]);

  const exportMetrics = () => {
    if (!metrics) return;

    const data = {
      timeRange: selectedTimeRange.label,
      exportedAt: new Date().toISOString(),
      metrics
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registration-metrics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessRateIcon = (rate: number) => {
    if (rate >= 90) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (rate >= 75) return <Clock className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading registration metrics...
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load registration metrics: {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchMetrics}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertDescription>
          No registration data available for the selected time range.
        </AlertDescription>
      </Alert>
    );
  }

  const errorBreakdownData = Object.entries(metrics.error_breakdown).map(([type, count]) => ({
    name: type.replace(/_/g, ' '),
    value: count
  }));

  const registrationTypeData = [
    { name: 'Standard', value: metrics.by_type.standard.attempts, successRate: metrics.by_type.standard.success_rate },
    { name: 'Invitation', value: metrics.by_type.invitation.attempts, successRate: metrics.by_type.invitation.success_rate }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Registration Monitoring</h2>
          <p className="text-muted-foreground">
            Monitor registration flows, success rates, and system performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportMetrics}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={fetchMetrics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {TIME_RANGES.map((range) => (
          <Button
            key={range.label}
            variant={selectedTimeRange.label === range.label ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTimeRange(range)}
          >
            {range.label}
          </Button>
        ))}
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_attempts}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.successful_registrations} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            {getSuccessRateIcon(metrics.success_rate)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSuccessRateColor(metrics.success_rate)}`}>
              {metrics.success_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Current: {currentSuccessRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(metrics.average_completion_time_ms)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RLS Issues</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics.rls_violations}
            </div>
            <p className="text-xs text-muted-foreground">
              Service role: {metrics.service_role_usage}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Registration Types</CardTitle>
                <CardDescription>
                  Breakdown by registration method
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={registrationTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Success Rates by Type</CardTitle>
                <CardDescription>
                  Performance comparison
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {registrationTypeData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index] }}
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{item.successRate.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">
                        {item.value} attempts
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Error Breakdown</CardTitle>
                <CardDescription>
                  Distribution of error types
                </CardDescription>
              </CardHeader>
              <CardContent>
                {errorBreakdownData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={errorBreakdownData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {errorBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No errors in selected time range
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Details</CardTitle>
                <CardDescription>
                  Specific error counts and descriptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {errorBreakdownData.length > 0 ? (
                    errorBreakdownData.map((error, index) => (
                      <div key={error.name} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">{error.name}</Badge>
                        </div>
                        <span className="font-medium">{error.value}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No errors recorded</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Registration completion times and system performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">
                    {Math.round(metrics.by_type.standard.avg_completion_time)}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Standard Registration</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">
                    {Math.round(metrics.by_type.invitation.avg_completion_time)}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Invitation Registration</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">
                    {Math.round(metrics.average_completion_time_ms)}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Average</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Events</CardTitle>
                <CardDescription>
                  RLS violations and service role usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span>RLS Policy Violations</span>
                    </div>
                    <Badge variant={metrics.rls_violations > 0 ? 'destructive' : 'secondary'}>
                      {metrics.rls_violations}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span>Service Role Usage</span>
                    </div>
                    <Badge variant="outline">
                      {metrics.service_role_usage}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Recommendations</CardTitle>
                <CardDescription>
                  Based on current metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.rls_violations > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        RLS violations detected. Review profile creation policies.
                      </AlertDescription>
                    </Alert>
                  )}
                  {metrics.success_rate < 90 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Success rate below 90%. Investigate error patterns.
                      </AlertDescription>
                    </Alert>
                  )}
                  {metrics.rls_violations === 0 && metrics.success_rate >= 90 && (
                    <Alert>
                      <AlertDescription>
                        All security metrics are within acceptable ranges.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};