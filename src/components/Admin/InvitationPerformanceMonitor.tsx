import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Mail, 
  Shield, 
  RefreshCw,
  X,
  TrendingUp,
  TrendingDown,
  Zap
} from 'lucide-react';
import { 
  invitationPerformanceMonitor, 
  type PerformanceStats,
  type PerformanceAlert 
} from '@/services/invitationPerformanceMonitor';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InvitationPerformanceMonitorProps {
  className?: string;
}

const InvitationPerformanceMonitor: React.FC<InvitationPerformanceMonitorProps> = ({ className }) => {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    setIsLoading(true);
    try {
      const [statsResult, alertsResult] = await Promise.all([
        invitationPerformanceMonitor.getPerformanceStats(24),
        invitationPerformanceMonitor.getActiveAlerts()
      ]);

      if (statsResult.error) {
        throw new Error(statsResult.error.message || 'Failed to load performance stats');
      }

      if (alertsResult.error) {
        console.warn('Failed to load alerts:', alertsResult.error);
      }

      setStats(statsResult.data);
      setAlerts(alertsResult.data || []);
    } catch (error) {
      console.error('Error loading performance data:', error);
      toast({
        title: "Error loading performance data",
        description: error instanceof Error ? error.message : 'Failed to load performance monitoring data',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPerformanceData();
    setIsRefreshing(false);
    toast({
      title: "Performance data refreshed",
      description: "Performance monitoring data has been updated.",
    });
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const { error } = await invitationPerformanceMonitor.resolveAlert(alertId);
      
      if (error) {
        throw new Error(error.message || 'Failed to resolve alert');
      }

      // Remove the alert from the local state
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      
      toast({
        title: "Alert resolved",
        description: "The performance alert has been marked as resolved.",
      });
    } catch (error) {
      toast({
        title: "Error resolving alert",
        description: error instanceof Error ? error.message : 'Failed to resolve alert',
        variant: "destructive",
      });
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-blue-600 border-blue-600';
      case 'medium': return 'text-yellow-600 border-yellow-600';
      case 'high': return 'text-orange-600 border-orange-600';
      case 'critical': return 'text-red-600 border-red-600';
      default: return 'text-gray-600 border-gray-600';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Performance Monitor</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
    );
  }

  if (!stats) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-600">Failed to load performance monitoring data</p>
        <Button onClick={loadPerformanceData} className="mt-4">
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
          <h2 className="text-2xl font-semibold">Performance Monitor</h2>
          <p className="text-gray-600 text-sm">Real-time performance metrics for invitation system</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Active Performance Alerts ({alerts.length})
          </h3>
          {alerts.map((alert) => (
            <Alert key={alert.id} className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={getAlertSeverityColor(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {alert.timestamp.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-orange-800">{alert.message}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResolveAlert(alert.id)}
                  className="text-orange-600 hover:text-orange-800"
                >
                  <X className="w-4 h-4" />
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getHealthStatusColor(stats.systemHealth.overallPerformance)}`}>
                {stats.systemHealth.overallPerformance === 'excellent' && <CheckCircle className="w-4 h-4 mr-1" />}
                {stats.systemHealth.overallPerformance === 'good' && <TrendingUp className="w-4 h-4 mr-1" />}
                {stats.systemHealth.overallPerformance === 'degraded' && <TrendingDown className="w-4 h-4 mr-1" />}
                {stats.systemHealth.overallPerformance === 'critical' && <AlertTriangle className="w-4 h-4 mr-1" />}
                {stats.systemHealth.overallPerformance.charAt(0).toUpperCase() + stats.systemHealth.overallPerformance.slice(1)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Overall Performance</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.systemHealth.uptime}%</div>
              <p className="text-xs text-muted-foreground">System Uptime</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.systemHealth.activeAlerts}</div>
              <p className="text-xs text-muted-foreground">Active Alerts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Email Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Success Rate</span>
              <span className="font-semibold">{stats.emailDeliveryStats.successRate}%</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg Delivery Time</span>
              <span className="font-semibold">{formatDuration(stats.emailDeliveryStats.averageDeliveryTime)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Emails</span>
              <span className="font-semibold">{stats.emailDeliveryStats.totalEmails}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Failed</span>
              <span className="font-semibold text-red-600">{stats.emailDeliveryStats.failedEmails}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Slow Deliveries</span>
              <span className="font-semibold text-yellow-600">{stats.emailDeliveryStats.slowDeliveries}</span>
            </div>
          </CardContent>
        </Card>

        {/* Token Operations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Token Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg Generation Time</span>
              <span className="font-semibold">{formatDuration(stats.tokenOperationStats.averageGenerationTime)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Avg Validation Time</span>
              <span className="font-semibold">{formatDuration(stats.tokenOperationStats.averageValidationTime)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Generations</span>
              <span className="font-semibold">{stats.tokenOperationStats.totalGenerations}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Validations</span>
              <span className="font-semibold">{stats.tokenOperationStats.totalValidations}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Failed Operations</span>
              <span className="font-semibold text-red-600">{stats.tokenOperationStats.failedOperations}</span>
            </div>
          </CardContent>
        </Card>

        {/* Performance Thresholds */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Performance Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Email Delivery</span>
                <Badge variant={stats.emailDeliveryStats.averageDeliveryTime <= 30000 ? "default" : "destructive"}>
                  {stats.emailDeliveryStats.averageDeliveryTime <= 30000 ? "Good" : "Slow"}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Token Generation</span>
                <Badge variant={stats.tokenOperationStats.averageGenerationTime <= 1000 ? "default" : "destructive"}>
                  {stats.tokenOperationStats.averageGenerationTime <= 1000 ? "Fast" : "Slow"}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Token Validation</span>
                <Badge variant={stats.tokenOperationStats.averageValidationTime <= 500 ? "default" : "destructive"}>
                  {stats.tokenOperationStats.averageValidationTime <= 500 ? "Fast" : "Slow"}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Email Success Rate</span>
                <Badge variant={stats.emailDeliveryStats.successRate >= 90 ? "default" : "destructive"}>
                  {stats.emailDeliveryStats.successRate >= 90 ? "Excellent" : "Poor"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Recommendations */}
      {(stats.emailDeliveryStats.successRate < 90 || 
        stats.emailDeliveryStats.averageDeliveryTime > 30000 ||
        stats.tokenOperationStats.averageGenerationTime > 1000) && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Performance Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.emailDeliveryStats.successRate < 90 && (
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-blue-800">
                    Email success rate is below 90%. Consider reviewing email service configuration and bounce handling.
                  </p>
                </div>
              )}
              
              {stats.emailDeliveryStats.averageDeliveryTime > 30000 && (
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-blue-800">
                    Email delivery time is above 30 seconds. Consider optimizing email service or implementing async processing.
                  </p>
                </div>
              )}
              
              {stats.tokenOperationStats.averageGenerationTime > 1000 && (
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-blue-800">
                    Token generation is taking longer than expected. Consider optimizing database queries or token generation logic.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InvitationPerformanceMonitor;