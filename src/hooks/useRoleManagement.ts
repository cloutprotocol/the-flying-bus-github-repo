import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  grantAuthorRole, 
  createAuthorAccount, 
  activateExistingUserAccount,
  RoleUpgradeResult,
  AccountActivationResult 
} from '@/services/roleService';

export interface UseRoleManagementReturn {
  isLoading: boolean;
  grantAuthor: (userId: string) => Promise<RoleUpgradeResult>;
  createAuthor: (
    email: string, 
    password: string, 
    displayName: string, 
    username?: string
  ) => Promise<AccountActivationResult>;
  activateAccount: (userId: string) => Promise<AccountActivationResult>;
}

/**
 * Hook for managing user roles and account activation
 */
export function useRoleManagement(): UseRoleManagementReturn {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { refreshUserProfile } = useAuth();

  const grantAuthor = async (userId: string): Promise<RoleUpgradeResult> => {
    setIsLoading(true);
    
    try {
      const result = await grantAuthorRole(userId);
      
      if (result.success) {
        toast({
          title: "Role Updated",
          description: "Author privileges have been granted successfully.",
        });
        
        // Refresh current user profile if it's the same user
        await refreshUserProfile();
      } else {
        toast({
          title: "Role Update Failed",
          description: result.error || "Failed to grant author privileges.",
          variant: "destructive",
        });
      }
      
      return result;
    } catch (error) {
      const errorMessage = "An unexpected error occurred while updating the role.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const createAuthor = async (
    email: string, 
    password: string, 
    displayName: string, 
    username?: string
  ): Promise<AccountActivationResult> => {
    setIsLoading(true);
    
    try {
      const result = await createAuthorAccount(email, password, displayName, username);
      
      if (result.success) {
        toast({
          title: "Account Created",
          description: "Author account has been created successfully.",
        });
      } else {
        toast({
          title: "Account Creation Failed",
          description: result.error || "Failed to create author account.",
          variant: "destructive",
        });
      }
      
      return result;
    } catch (error) {
      const errorMessage = "An unexpected error occurred while creating the account.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const activateAccount = async (userId: string): Promise<AccountActivationResult> => {
    setIsLoading(true);
    
    try {
      const result = await activateExistingUserAccount(userId);
      
      if (result.success) {
        toast({
          title: "Account Activated",
          description: "Author privileges have been activated successfully.",
        });
        
        // Refresh current user profile if it's the same user
        await refreshUserProfile();
      } else {
        toast({
          title: "Account Activation Failed",
          description: result.error || "Failed to activate author privileges.",
          variant: "destructive",
        });
      }
      
      return result;
    } catch (error) {
      const errorMessage = "An unexpected error occurred while activating the account.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    grantAuthor,
    createAuthor,
    activateAccount
  };
}