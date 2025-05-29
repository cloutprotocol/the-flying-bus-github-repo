
import { useState, useEffect, useCallback } from 'react';
import { ReaderProfile } from '@/types/ReaderProfile';
import { fetchAllUsers, UserSearchFilters, updateUserProfile, updateUserRole } from '@/services/userService';
import { supabase } from '@/integrations/supabase/client';

export function useUserManagement() {
  const [users, setUsers] = useState<ReaderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: UserSearchFilters = {
        searchTerm: searchTerm || undefined,
        role: roleFilter || undefined,
        limit: pageSize,
        offset: currentPage * pageSize,
      };

      const { users: fetchedUsers, totalCount } = await fetchAllUsers(filters);
      setUsers(fetchedUsers);
      setTotalCount(totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter, currentPage]);

  // Load users on mount and when filters change
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Set up real-time subscription for profile changes
  useEffect(() => {
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('Profile change detected:', payload);
          // Reload users when any profile changes
          loadUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadUsers]);

  const handleUpdateUser = async (userId: string, data: Partial<ReaderProfile>) => {
    try {
      const updateData = {
        username: data.username,
        display_name: data.displayName,
        email: data.email,
        bio: data.bio,
        avatar_url: data.avatar,
      };

      await updateUserProfile(userId, updateData);
      await loadUsers(); // Refresh the list
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
      return false;
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await updateUserRole(userId, role);
      await loadUsers(); // Refresh the list
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role');
      return false;
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(0); // Reset to first page when searching
  };

  const handleRoleFilter = (role: string) => {
    setRoleFilter(role);
    setCurrentPage(0); // Reset to first page when filtering
  };

  return {
    users,
    loading,
    error,
    searchTerm,
    roleFilter,
    totalCount,
    currentPage,
    pageSize,
    setCurrentPage,
    handleSearch,
    handleRoleFilter,
    handleUpdateUser,
    handleUpdateRole,
    refreshUsers: loadUsers,
  };
}
