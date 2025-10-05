import { useState, useEffect, useCallback } from 'react';
import { emailMonitoringService, EmailMetrics, TokenAnalytics } from '@/services/emailMonitoringService';
import { securityMonitoringService, SecurityMetrics } from '@/services/securityMonitoringService';
import { alertingService, Alert } from '@/services/alertingService';
import { interval } from 'date-fns';

export interface MonitoringData {
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
  activeAlerts: Alert[];
}

export interface UseMonitoringOptions {
  timeRange: '1h' | '24h' | '7d' | '30d';
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export const useMonitoring = (options: UseMonitoringOptions) => {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Separate time range calculation to avoid dependencies
  const getTimeRange = (timeRange: string) => {
    const now = new Date();
    const ranges = {
      '1h': new Date(now.getTime() - 60 * 60 * 1000),
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    };
    return { start: ranges[timeRange], end: now };
  };

  // Separate fetch logic to avoid circular dependencies
  const performFetch = async (currentTimeRange = options.timeRange) => {
    try {
      setError(null);
      const { start, end } = getTimeRange(currentTimeRange);
      
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
        alertingService.getActiveAlerts(50)
      ]);

      setData({
        emailMetrics,
        tokenAnalytics,
        securityMetrics,
        systemHealth,
        activeAlerts
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching monitoring data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch monitoring data');
    } finally {
      setLoading(false);
    }
  };

  // Create stable callbacks for external use
  const fetchData = useCallback(async () => {
    await performFetch();
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await performFetch();
  }, []);

  // Initial data fetch
  useEffect(() => {
    performFetch();
  }, []);

  // Fetch when time range changes
  useEffect(() => {
    performFetch(options.timeRange);
  }, [options.timeRange]);

  // Auto-refresh functionality - DISABLED to prevent infinite loops
  useEffect(() => {
    if (!options.autoRefresh) return;

    // Disabled to prevent infinite loops and admin dashboard flashing
    // const interval = setInterval(
    //   () => performFetch(),
    //   options.refreshInterval || 30000 // Default 30 seconds
    // );

    // return () => clearInterval(interval);
  }, [options.autoRefresh, options.refreshInterval]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh
  };
};

export const useEmailMetrics = (timeRange: '1h' | '24h' | '7d' | '30d') => {
  const [metrics, setMetrics] = useState<EmailMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const now = new Date();
        const ranges = {
          '1h': new Date(now.getTime() - 60 * 60 * 1000),
          '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
          '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        };
        
        const startDate = ranges[timeRange];
        const emailMetrics = await emailMonitoringService.getEmailMetrics(startDate, now);
        
        setMetrics(emailMetrics);
      } catch (err) {
        console.error('Error fetching email metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch email metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [timeRange]);

  return { metrics, loading, error };
};

export const useSecurityMetrics = (timeRange: '1h' | '24h' | '7d' | '30d') => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const now = new Date();
        const ranges = {
          '1h': new Date(now.getTime() - 60 * 60 * 1000),
          '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
          '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        };
        
        const startDate = ranges[timeRange];
        const securityMetrics = await securityMonitoringService.getSecurityMetrics(startDate, now);
        
        setMetrics(securityMetrics);
      } catch (err) {
        console.error('Error fetching security metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch security metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [timeRange]);

  return { metrics, loading, error };
};

export const useActiveAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Separate fetch logic to avoid circular dependencies
  const performAlertsFetch = async () => {
    try {
      setError(null);
      const activeAlerts = await alertingService.getActiveAlerts(50);
      setAlerts(activeAlerts);
    } catch (err) {
      console.error('Error fetching active alerts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch active alerts');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = useCallback(async () => {
    await performAlertsFetch();
  }, []);

  const acknowledgeAlert = useCallback(async (alertId: string, userId: string) => {
    try {
      await alertingService.acknowledgeAlert(alertId, userId);
      await performAlertsFetch(); // Refresh alerts after acknowledging
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    performAlertsFetch();
  }, []);

  return {
    alerts,
    loading,
    error,
    refresh: fetchAlerts,
    acknowledgeAlert
  };
};

export const useSystemHealth = () => {
  const [health, setHealth] = useState<{
    status: 'healthy' | 'warning' | 'critical';
    metrics: {
      emailSuccessRate: number;
      tokenSecurityEvents: number;
      recentErrors: number;
    };
    alerts: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Separate health check logic to avoid circular dependencies
  const performHealthCheck = async () => {
    try {
      setError(null);
      const systemHealth = await emailMonitoringService.getSystemHealth();
      setHealth(systemHealth);
    } catch (err) {
      console.error('Error checking system health:', err);
      setError(err instanceof Error ? err.message : 'Failed to check system health');
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = useCallback(async () => {
    await performHealthCheck();
  }, []);

  useEffect(() => {
    performHealthCheck();
    
    // Check health every 5 minutes - DISABLED to prevent infinite loops
    // const interval = setInterval(() => performHealthCheck(), 5 * 60 * 1000);
    
    // return () => clearInterval(interval);
  }, []);

  return {
    health,
    loading,
    error,
    refresh: checkHealth
  };
};