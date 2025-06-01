
import { useState, useEffect, useCallback } from 'react';
import { ReaderProfile } from '@/types/ReaderProfile';
import { fetchAllUsers, UserSearchFilters, updateUserProfile, updateUserRole } from '@/services/userService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export function useUserManagement() {
  const [users, setUsers] = useState<ReaderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const { toast } = useToast();
  const pageSize = 10;

  const loadUsers = useCallback(async () => {
    try {
      console.log('Loading users...');
      setLoading(true);
      setError(null);
      
      const filters: UserSearchFilters = {
        searchTerm: searchTerm || undefined,
        role: roleFilter || undefined,
        limit: pageSize,
        offset: currentPage * pageSize,
      };

      const { users: fetchedUsers, totalCount } = await fetchAllUsers(filters);
      console.log('Users loaded successfully:', fetchedUsers.length);
      
      setUsers(fetchedUsers);
      setTotalCount(totalCount);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      console.error('Error in loadUsers:', errorMessage);
      setError(errorMessage);
      
      // Show error toast
      toast({
        title: "Error Loading Users",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter, currentPage, toast]);

  // Load users on mount and when filters change
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Set up real-time subscription for profile changes
  useEffect(() => {
    console.log('Setting up real-time subscription for profiles');
    
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
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [loadUsers]);

  const handleUpdateUser = async (userId: string, data: Partial<ReaderProfile>) => {
    try {
      console.log('Updating user:', userId);
      
      const updateData = {
        username: data.username,
        display_name: data.displayName,
        email: data.email,
        bio: data.bio,
        avatar_url: data.avatar,
      };

      await updateUserProfile(userId, updateData);
      await loadUsers(); // Refresh the list
      
      toast({
        title: "User Updated",
        description: "User profile has been updated successfully.",
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user';
      console.error('Error updating user:', errorMessage);
      setError(errorMessage);
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      console.log('Updating user role:', userId, role);
      
      await updateUserRole(userId, role);
      await loadUsers(); // Refresh the list
      
      toast({
        title: "Role Updated",
        description: "User role has been updated successfully.",
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user role';
      console.error('Error updating role:', errorMessage);
      setError(errorMessage);
      
      toast({
        title: "Role Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    }
  };

  const handleSearch = (term: string) => {
    console.log('Search term changed:', term);
    setSearchTerm(term);
    setCurrentPage(0); // Reset to first page when searching
  };

  const handleRoleFilter = (role: string) => {
    console.log('Role filter changed:', role);
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
