/**
 * Performance Monitoring Dashboard
 * 
 * Admin component for viewing performance metrics, memory usage, and cache statistics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Clock, 
  Database, 
  Memory, 
  RefreshCw, 
  Trash2,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMonitoring';

interface PerformanceMetric {
  id: string;
  operation: string;
  component: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'started' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

interface MemoryMetric {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  component?: string;
  operation?: string;
}

const PerformanceDashboard: React.FC = () => {
  const { getPerformanceSummary, clearPerformanceData } = usePerformanceMetrics();
  const [summary, setSummary] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const refreshData = () => {
    const newSummary = getPerformanceSummary();
    setSummary(newSummary);
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refreshData, 5000); // Refresh every 5 seconds
      setRefreshInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]);

  const handleClearData = () => {
    clearPerformanceData();
    refreshData();
  };

  const formatDuration = (duration: number) => {
    if (duration < 1000) {
      return `${duration.toFixed(2)}ms`;
    }
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      started: 'secondary'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  if (!summary) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading performance data...
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentMetrics = summary.metrics
    .sort((a: PerformanceMetric, b: PerformanceMetric) => (b.startTime || 0) - (a.startTime || 0))
    .slice(0, 20);

  const completedMetrics = summary.metrics.filter((m: PerformanceMetric) => m.status === 'completed');
  const failedMetrics = summary.metrics.filter((m: PerformanceMetric) => m.status === 'failed');
  
  const avgDuration = completedMetrics.length > 0 
    ? completedMetrics.reduce((sum: number, m: PerformanceMetric) => sum + (m.duration || 0), 0) / completedMetrics.length
    : 0;

  const recentMemoryMetrics = summary.memoryMetrics
    .sort((a: MemoryMetric, b: MemoryMetric) => b.timestamp - a.timestamp)
    .slice(0, 10);

  const currentMemoryUsage = recentMemoryMetrics.length > 0 ? recentMemoryMetrics[0] : null;
  const memoryUsagePercent = currentMemoryUsage 
    ? (currentMemoryUsage.usedJSHeapSize / currentMemoryUsage.jsHeapSizeLimit) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
          <p className="text-gray-600">Monitor application performance and resource usage</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="destructive" size="sm" onClick={handleClearData}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Data
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.metrics.length}</div>
            <p className="text-xs text-muted-foreground">
              {completedMetrics.length} completed, {failedMetrics.length} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(avgDuration)}</div>
            <p className="text-xs text-muted-foreground">
              Across {completedMetrics.length} operations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Memory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMemoryUsage ? formatBytes(currentMemoryUsage.usedJSHeapSize) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {memoryUsagePercent.toFixed(1)}% of limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Stats</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.cacheStats.totalEntries}</div>
            <p className="text-xs text-muted-foreground">
              {summary.cacheStats.hitRate.toFixed(1)}% hit rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentMetrics.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No operations recorded</p>
                ) : (
                  recentMetrics.map((metric: PerformanceMetric) => (
                    <div key={metric.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(metric.status)}
                        <div>
                          <div className="font-medium">{metric.operation}</div>
                          <div className="text-sm text-gray-500">{metric.component}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {metric.duration && (
                          <span className="text-sm font-mono">{formatDuration(metric.duration)}</span>
                        )}
                        {getStatusBadge(metric.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Memory Usage History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentMemoryMetrics.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No memory metrics recorded</p>
                ) : (
                  recentMemoryMetrics.map((metric: MemoryMetric, index: number) => {
                    const usagePercent = (metric.usedJSHeapSize / metric.jsHeapSizeLimit) * 100;
                    const isHighUsage = usagePercent > 80;
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {isHighUsage ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : (
                            <Memory className="h-4 w-4 text-green-500" />
                          )}
                          <div>
                            <div className="font-medium">
                              {formatBytes(metric.usedJSHeapSize)} / {formatBytes(metric.jsHeapSizeLimit)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {metric.component && `${metric.component} - `}
                              {new Date(metric.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-mono ${isHighUsage ? 'text-red-600' : 'text-green-600'}`}>
                            {usagePercent.toFixed(1)}%
                          </span>
                          {isHighUsage && (
                            <Badge variant="destructive">High</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cache Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{summary.cacheStats.totalEntries}</div>
                  <div className="text-sm text-gray-500">Total Entries</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{summary.cacheStats.hitRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-500">Hit Rate</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{formatBytes(summary.cacheStats.memoryUsage)}</div>
                  <div className="text-sm text-gray-500">Memory Usage</div>
                </div>
              </div>
              
              {summary.pendingRequests > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">
                      {summary.pendingRequests} pending request{summary.pendingRequests !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceDashboard;