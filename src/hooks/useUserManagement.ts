
import { useState, useEffect } from 'react';
import { ReaderProfile } from '@/types/ReaderProfile';
import { fetchAllUsers, updateUserProfile, UserSearchFilters } from '@/services/userService';
import { useToast } from '@/hooks/use-toast';

export const useUserManagement = () => {
  const [users, setUsers] = useState<ReaderProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const loadUsers = async (filters: UserSearchFilters = {}) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading users with filters:', filters);
      
      const result = await fetchAllUsers(filters);
      console.log('Users loaded successfully:', result.users.length);
      
      setUsers(result.users);
      setTotalCount(result.totalCount);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      console.error('Error loading users:', errorMessage);
      setError(errorMessage);
      toast({
        title: "Error loading users",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId: string, updates: Partial<ReaderProfile>) => {
    try {
      console.log('Updating user:', userId, updates);
      
      // Convert ReaderProfile format to database format
      const dbUpdates: any = {};
      if (updates.username) dbUpdates.username = updates.username;
      if (updates.display_name) dbUpdates.display_name = updates.display_name;
      if (updates.email) dbUpdates.email = updates.email;
      if (updates.bio) dbUpdates.bio = updates.bio;
      if (updates.avatar_url) dbUpdates.avatar_url = updates.avatar_url;
      if (updates.role) dbUpdates.role = updates.role;
      
      await updateUserProfile(userId, dbUpdates);
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, ...updates } : user
        )
      );
      
      toast({
        title: "User updated",
        description: "User information has been updated successfully.",
      });
      
      console.log('User updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user';
      console.error('Error updating user:', errorMessage);
      toast({
        title: "Error updating user",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  return {
    users,
    loading,
    error,
    totalCount,
    loadUsers,
    updateUser,
    refreshUsers: () => loadUsers(),
  };
};
