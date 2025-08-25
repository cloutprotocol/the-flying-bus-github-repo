/**
 * Audit Log Viewer Component
 * 
 * Provides admin interface to view audit logs and role change history.
 * Implements requirements 4.3, 4.4.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RoleAuditService, AuditLogQuery } from '@/services/roleAuditService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  user_email?: string;
  user_id?: string;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

interface AuditStatistics {
  totalEvents: number;
  roleChanges: number;
  articleOwnershipChanges: number;
  articleReviews: number;
  successfulEvents: number;
  failedEvents: number;
  uniqueUsers: number;
  eventsByDay: Record<string, number>;
}

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState<AuditLogQuery>({
    limit: 50,
    offset: 0
  });
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    resourceType: '',
    startDate: '',
    endDate: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadAuditLogs();
    loadStatistics();
  }, []);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const auditQuery: AuditLogQuery = {
        ...query,
        userId: filters.userId || undefined,
        action: filters.action || undefined,
        resourceType: filters.resourceType || undefined,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined
      };

      const data = await RoleAuditService.queryAuditLogs(auditQuery);
      setLogs(data);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load audit logs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await RoleAuditService.getAuditStatistics(30);
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load audit statistics:', error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setQuery(prev => ({ ...prev, offset: 0 }));
    loadAuditLogs();
  };

  const clearFilters = () => {
    setFilters({
      userId: '',
      action: '',
      resourceType: '',
      startDate: '',
      endDate: ''
    });
    setQuery({ limit: 50, offset: 0 });
    loadAuditLogs();
  };

  const loadMore = () => {
    setQuery(prev => ({
      ...prev,
      offset: (prev.offset || 0) + (prev.limit || 50)
    }));
    loadAuditLogs();
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('role_change')) return 'default';
    if (action.includes('article_ownership')) return 'secondary';
    if (action.includes('article_review')) return 'outline';
    return 'default';
  };

  const getSuccessBadgeVariant = (success: boolean) => {
    return success ? 'default' : 'destructive';
  };

  const formatMetadata = (metadata: Record<string, any> | undefined) => {
    if (!metadata) return 'No additional data';
    
    const important = ['old_role', 'new_role', 'reason', 'previous_status', 'new_status'];
    const filtered = Object.entries(metadata)
      .filter(([key]) => important.includes(key))
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    return filtered || 'No important metadata';
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalEvents}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Role Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.roleChanges}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.totalEvents > 0 
                  ? Math.round((statistics.successfulEvents / statistics.totalEvents) * 100)
                  : 0}%
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.uniqueUsers}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Input
              placeholder="User ID"
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
            />
            
            <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                <SelectItem value="role_change">Role Change</SelectItem>
                <SelectItem value="article_ownership_created">Article Created</SelectItem>
                <SelectItem value="article_review_approved">Review Approved</SelectItem>
                <SelectItem value="article_review_rejected">Review Rejected</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.resourceType} onValueChange={(value) => handleFilterChange('resourceType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Resource Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Resources</SelectItem>
                <SelectItem value="profile">Profile</SelectItem>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="article_review">Article Review</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              type="date"
              placeholder="Start Date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
            
            <Input
              type="date"
              placeholder="End Date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button onClick={applyFilters} disabled={loading}>
              Apply Filters
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && logs.length === 0 ? (
            <div className="text-center py-8">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found matching your criteria.
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                        <Badge variant={getSuccessBadgeVariant(log.success)}>
                          {log.success ? 'Success' : 'Failed'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {log.resource_type}
                        </span>
                      </div>
                      
                      <div className="text-sm">
                        <strong>Resource:</strong> {log.resource_id}
                        {log.user_email && (
                          <>
                            <br />
                            <strong>User:</strong> {log.user_email}
                          </>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        {formatMetadata(log.metadata)}
                      </div>
                      
                      {log.error_message && (
                        <div className="text-sm text-red-600">
                          <strong>Error:</strong> {log.error_message}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right text-sm text-muted-foreground">
                      {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      {log.ip_address && (
                        <div className="text-xs">IP: {log.ip_address}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {logs.length >= (query.limit || 50) && (
                <div className="text-center pt-4">
                  <Button variant="outline" onClick={loadMore} disabled={loading}>
                    {loading ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogViewer;