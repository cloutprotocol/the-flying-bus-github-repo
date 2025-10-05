import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { emailMonitoringService, EmailMetrics, TokenAnalytics } from '@/services/emailMonitoringService';
import { securityMonitoringService, SecurityMetrics } from '@/services/securityMonitoringService';
import { alertingService, Alert as SystemAlert } from '@/services/alertingService';
import { AlertTriangle, CheckCircle, XCircle, Clock, Shield, Mail, Activity } from 'lucide-react';

interface DashboardData {
  emailMetrics: EmailMetrics;
  tokenAnalytics: TokenAnalytics;
  securityMetrics: SecurityMetrics;
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    metrics: {
      emailSuccessRate: number;
      tokenSecurityEvents: number;
      recentErrors: number;
    };
    alerts: string[];
  };
  activeAlerts: SystemAlert[];
}

export const EmailSystemDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [refreshing, setRefreshing] = useState(false);

  const getTimeRange = () => {
    const now = new Date();
    const ranges = {
      '1h': new Date(now.getTime() - 60 * 60 * 1000),
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    };
    return { start: ranges[timeRange], end: now };
  };

  const loadDashboardData = async () => {
    try {
      const { start, end } = getTimeRange();
      
      const [
        emailMetrics,
        tokenAnalytics,
        securityMetrics,
        systemHealth,
        activeAlerts
      ] = await Promise.all([
        emailMonitoringService.getEmailMetrics(start, end),
        emailMonitoringService.getTokenAnalytics(start, end),
        securityMonitoringService.getSecurityMetrics(start, end),
        emailMonitoringService.getSystemHealth(),
        alertingService.getActiveAlerts(20)
      ]);

      setData({
        emailMetrics,
        tokenAnalytics,
        securityMetrics,
        systemHealth,
        activeAlerts
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      // In a real implementation, you'd get the current user ID
      await alertingService.acknowledgeAlert(alertId, 'current-user-id');
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load dashboard data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Email System Monitoring</h1>
          <p className="text-gray-600">Monitor email delivery, security, and system health</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getStatusIcon(data.systemHealth.status)}
            <span>System Health</span>
            <Badge className={getStatusColor(data.systemHealth.status)}>
              {data.systemHealth.status.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.systemHealth.alerts.length > 0 && (
            <div className="space-y-2">
              {data.systemHealth.alerts.map((alert, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{alert}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
          {data.systemHealth.alerts.length === 0 && (
            <p className="text-green-600">All systems operating normally</p>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Success Rate</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.emailMetrics.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {data.emailMetrics.sent} emails sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Token Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tokenAnalytics.used}</div>
            <p className="text-xs text-muted-foreground">
              {data.tokenAnalytics.generated} generated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.securityMetrics.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              {data.securityMetrics.criticalEvents} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="email" className="space-y-4">
        <TabsList>
          <TabsTrigger value="email">Email Metrics</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="tokens">Token Analytics</TabsTrigger>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Delivery Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Sent:</span>
                  <span className="font-semibold">{data.emailMetrics.sent}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivered:</span>
                  <span className="font-semibold text-green-600">{data.emailMetrics.delivered}</span>
                </div>
                <div className="flex justify-between">
                  <span>Failed:</span>
                  <span className="font-semibold text-red-600">{data.emailMetrics.failed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bounced:</span>
                  <span className="font-semibold text-orange-600">{data.emailMetrics.bounced}</span>
                </div>
                <div className="flex justify-between">
                  <span>Opened:</span>
                  <span className="font-semibold">{data.emailMetrics.opened}</span>
                </div>
                <div className="flex justify-between">
                  <span>Clicked:</span>
                  <span className="font-semibold">{data.emailMetrics.clicked}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Success Rate:</span>
                  <span className="font-semibold">{data.emailMetrics.successRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Rate:</span>
                  <span className="font-semibold">{data.emailMetrics.deliveryRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Open Rate:</span>
                  <span className="font-semibold">
                    {data.emailMetrics.delivered > 0 
                      ? Math.round((data.emailMetrics.opened / data.emailMetrics.delivered) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Click Rate:</span>
                  <span className="font-semibold">
                    {data.emailMetrics.opened > 0 
                      ? Math.round((data.emailMetrics.clicked / data.emailMetrics.opened) * 100)
                      : 0}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Events:</span>
                  <span className="font-semibold">{data.securityMetrics.totalEvents}</span>
                </div>
                <div className="flex justify-between">
                  <span>Critical:</span>
                  <span className="font-semibold text-red-600">{data.securityMetrics.criticalEvents}</span>
                </div>
                <div className="flex justify-between">
                  <span>High:</span>
                  <span className="font-semibold text-orange-600">{data.securityMetrics.highEvents}</span>
                </div>
                <div className="flex justify-between">
                  <span>Medium:</span>
                  <span className="font-semibold text-yellow-600">{data.securityMetrics.mediumEvents}</span>
                </div>
                <div className="flex justify-between">
                  <span>Low:</span>
                  <span className="font-semibold text-blue-600">{data.securityMetrics.lowEvents}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Token Failures:</span>
                  <span className="font-semibold">{data.securityMetrics.tokenValidationFailures}</span>
                </div>
                <div className="flex justify-between">
                  <span>Suspicious Activity:</span>
                  <span className="font-semibold">{data.securityMetrics.suspiciousActivity}</span>
                </div>
                <div className="flex justify-between">
                  <span>Recent Threats:</span>
                  <span className="font-semibold">{data.securityMetrics.recentThreats.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tokens" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Token Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.tokenAnalytics.generated}</div>
                  <div className="text-sm text-gray-600">Generated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{data.tokenAnalytics.used}</div>
                  <div className="text-sm text-gray-600">Used</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{data.tokenAnalytics.expired}</div>
                  <div className="text-sm text-gray-600">Expired</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.tokenAnalytics.averageTimeToUse.toFixed(1)}h</div>
                  <div className="text-sm text-gray-600">Avg. Time to Use</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts ({data.activeAlerts.length})</CardTitle>
              <CardDescription>
                Alerts that require attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.activeAlerts.length === 0 ? (
                <p className="text-gray-600">No active alerts</p>
              ) : (
                <div className="space-y-4">
                  {data.activeAlerts.map((alert) => (
                    <div key={alert.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            <span className="font-semibold">{alert.title}</span>
                          </div>
                          <p className="text-gray-600 mt-1">{alert.message}</p>
                          <p className="text-sm text-gray-500 mt-2">
                            {new Date(alert.created_at!).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledgeAlert(alert.id!)}
                        >
                          Acknowledge
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};