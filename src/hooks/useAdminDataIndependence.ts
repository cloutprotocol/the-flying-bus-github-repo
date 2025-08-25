import { useDataLoadingIndependence } from './useDataLoadingIndependence';
import { queryExecutor } from '@/services/queryExecutor';
import { useCallback } from 'react';

/**
 * Hook for admin dashboard metrics with independent data loading
 */
export function useAdminDashboardMetrics() {
  return useDataLoadingIndependence({
    table: 'articles',
    select: `
      id,
      title,
      status,
      created_at,
      updated_at,
      categories (
        id,
        name
      ),
      profiles (
        id,
        display_name
      )
    `,
    orderBy: { column: 'updated_at', ascending: false },
    limit: 20,
    priority: 'high',
    enabled: true,
    refetchOnAuthChange: true, // Admin data should refetch on auth change
    staleTime: 2 * 60 * 1000 // 2 minutes for admin data
  });
}

/**
 * Hook for admin approval queue with independent data loading
 */
export function useAdminApprovalQueue(
  status = 'pending',
  categoryFilter = 'all',
  searchTerm = ''
) {
  const filters: Record<string, any> = {};
  
  // Apply status filter
  if (status !== 'all') {
    if (status === 'pending') {
      filters.status = 'pending'; // Only pending, not draft
    } else {
      filters.status = status;
    }
  }
  
  // Note: Category and search filtering will be handled in the component
  // since they require more complex query logic
  
  return useDataLoadingIndependence({
    table: 'articles',
    select: `
      id,
      title,
      status,
      created_at,
      updated_at,
      categories (
        id,
        name
      ),
      profiles (
        id,
        display_name
      )
    `,
    filters,
    orderBy: { column: 'updated_at', ascending: false },
    limit: 50,
    priority: 'high',
    enabled: true,
    refetchOnAuthChange: true,
    staleTime: 1 * 60 * 1000 // 1 minute for approval queue
  });
}

/**
 * Hook for admin invitation requests with independent data loading
 */
export function useAdminInvitationRequests(filterStatus: 'all' | 'pending' | 'approved' | 'denied' = 'all') {
  const filters: Record<string, any> = {};
  
  if (filterStatus !== 'all') {
    filters.status = filterStatus;
  }
  
  return useDataLoadingIndependence({
    table: 'invitation_requests',
    select: '*',
    filters,
    orderBy: { column: 'created_at', ascending: false },
    priority: 'high',
    enabled: true,
    refetchOnAuthChange: true,
    staleTime: 30 * 1000 // 30 seconds for invitation requests
  });
}

/**
 * Hook for admin activity feed with independent data loading
 */
export function useAdminActivityFeed(limit = 10) {
  return useDataLoadingIndependence({
    table: 'activity_logs',
    select: `
      id,
      activity_type,
      description,
      created_at,
      metadata,
      profiles (
        id,
        display_name
      )
    `,
    orderBy: { column: 'created_at', ascending: false },
    limit,
    priority: 'normal',
    enabled: true,
    refetchOnAuthChange: true,
    staleTime: 1 * 60 * 1000 // 1 minute for activity feed
  });
}

/**
 * Hook for admin user management with independent data loading
 */
export function useAdminUserManagement() {
  return useDataLoadingIndependence({
    table: 'profiles',
    select: `
      id,
      username,
      display_name,
      email,
      created_at,
      updated_at,
      user_roles (
        role
      )
    `,
    orderBy: { column: 'created_at', ascending: false },
    priority: 'normal',
    enabled: true,
    refetchOnAuthChange: true,
    staleTime: 5 * 60 * 1000 // 5 minutes for user management
  });
}

/**
 * Custom hook for executing admin-specific queries with fallback
 */
export function useAdminQueryExecutor() {
  const executeAdminQuery = useCallback(async (options: any) => {
    return queryExecutor.executeQuery({
      ...options,
      requireAuth: true, // Admin queries always require auth
      priority: 'high',
      retryCount: 3,
      timeout: 15000 // 15 seconds timeout for admin queries
    });
  }, []);

  const getInvitationRequests = useCallback(async (status?: string) => {
    const filters: Record<string, any> = {};
    if (status && status !== 'all') {
      filters.status = status;
    }

    return executeAdminQuery({
      table: 'invitation_requests',
      select: '*',
      filters,
      orderBy: { column: 'created_at', ascending: false }
    });
  }, [executeAdminQuery]);

  const getArticlesForApproval = useCallback(async (
    status = 'pending',
    categoryFilter = 'all',
    searchTerm = ''
  ) => {
    const filters: Record<string, any> = {};
    
    if (status !== 'all') {
      if (status === 'pending') {
        filters.status = ['draft', 'pending'];
      } else {
        filters.status = status;
      }
    }

    return executeAdminQuery({
      table: 'articles',
      select: `
        id,
        title,
        status,
        created_at,
        updated_at,
        categories (
          id,
          name
        ),
        profiles (
          id,
          display_name
        )
      `,
      filters,
      orderBy: { column: 'updated_at', ascending: false }
    });
  }, [executeAdminQuery]);

  const getDashboardMetrics = useCallback(async () => {
    // Execute multiple queries concurrently for dashboard metrics
    const queries = [
      {
        table: 'articles',
        select: 'id, status',
        filters: { status: ['draft', 'pending'] }
      },
      {
        table: 'flagged_content',
        select: 'id',
        filters: { status: 'pending', content_type: 'comment' }
      },
      {
        table: 'invitation_requests',
        select: 'id',
        filters: { status: 'pending' }
      }
    ];

    return queryExecutor.executeQueries(queries);
  }, []);

  return {
    executeAdminQuery,
    getInvitationRequests,
    getArticlesForApproval,
    getDashboardMetrics
  };
}