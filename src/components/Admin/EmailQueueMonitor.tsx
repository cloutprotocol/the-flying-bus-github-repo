import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Mail,
  Activity,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { emailQueueManager } from '@/services/emailQueueManager';
import { EmailQueueService } from '@/services/emailQueueService';

interface QueueStatus {
  isInitialized: boolean;
  health: {
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    stats: any;
  };
  stats: any;
  recentFailures: any[];
}

const EmailQueueMonitor: React.FC = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const queueStatus = await emailQueueManager.getStatus();
      setStatus(queueStatus);
    } catch (error) {
      console.error('Error loading queue status:', error);
      toast({
        title: "Error",
        description: "Failed to load email queue status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualProcessing = async () => {
    setIsProcessing(true);
    try {
      const result = await emailQueueManager.triggerProcessing();
      toast({
        title: "Processing Complete",
        description: `Processed ${result.processed} jobs, ${result.failed} failed`,
      });
      await loadStatus(); // Refresh status
    } catch (error) {
      console.error('Error triggering processing:', error);
      toast({
        title: "Error",
        description: "Failed to trigger email processing",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetryFailedJobs = async () => {
    setIsProcessing(true);
    try {
      const result = await emailQueueManager.retryAllFailedJobs();
      toast({
        title: "Retry Complete",
        description: `Retried ${result.retried} jobs, ${result.successful} successful, ${result.failed} failed`,
      });
      await loadStatus(); // Refresh status
    } catch (error) {
      console.error('Error retrying failed jobs:', error);
      toast({
        title: "Error",
        description: "Failed to retry failed jobs",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCleanupOldJobs = async () => {
    setIsProcessing(true);
    try {
      const result = await EmailQueueService.cleanupOldJobs(7);
      toast({
        title: "Cleanup Complete",
        description: `Cleaned up ${result.deleted} old jobs`,
      });
      await loadStatus(); // Refresh status
    } catch (error) {
      console.error('Error cleaning up jobs:', error);
      toast({
        title: "Error",
        description: "Failed to cleanup old jobs",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getHealthBadge = (healthStatus: string) => {
    switch (healthStatus) {
      case 'healthy':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" />Healthy</Badge>;
      case 'warning':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><AlertTriangle className="w-3 h-3 mr-1" />Warning</Badge>;
      case 'critical':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" />Critical</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading email queue status...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-600">Failed to load email queue status</p>
          <Button onClick={loadStatus} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Queue Health Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Email Queue Health
            </CardTitle>
            <div className="flex items-center gap-2">
              {getHealthBadge(status.health.status)}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={loadStatus}
                disabled={isLoading}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-medium">{status.health.message}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Queue Initialized</p>
                <p className="font-medium">{status.isInitialized ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Statistics */}
      {status.stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Queue Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{status.stats.pending}</div>
                <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  Pending
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{status.stats.processing}</div>
                <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Processing
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{status.stats.completed}</div>
                <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Completed
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{status.stats.failed}</div>
                <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Failed
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{status.stats.retrying}</div>
                <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                  <RotateCcw className="w-3 h-3" />
                  Retrying
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t text-center">
              <div className="text-lg font-semibold">Total Jobs: {status.stats.totalJobs}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleManualProcessing}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
              Process Queue
            </Button>
            
            <Button 
              onClick={handleRetryFailedJobs}
              disabled={isProcessing || status.stats?.failed === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Retry Failed Jobs
            </Button>
            
            <Button 
              onClick={handleCleanupOldJobs}
              disabled={isProcessing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Cleanup Old Jobs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Failures */}
      {status.recentFailures && status.recentFailures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Recent Failures ({status.recentFailures.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.recentFailures.slice(0, 5).map((failure: any) => (
                <div key={failure.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {failure.email_type}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          to {failure.recipient_email}
                        </span>
                      </div>
                      <p className="text-sm text-red-600">
                        {failure.error_message || 'Unknown error'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Failed: {formatDate(failure.updated_at)} 
                        (Attempt {failure.attempts}/{failure.max_attempts})
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => EmailQueueService.retryJob(failure.id)}
                      disabled={isProcessing}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmailQueueMonitor;