import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  createUserWallet, 
  linkExistingWallet, 
  getUserWalletAddress, 
  hasLinkedWallet,
  disconnectUserWallet,
  WalletCreationResult 
} from '@/services/walletIntegrationService';

export function useWalletIntegration() {
  const { currentUser, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);

  /**
   * Creates a wallet for the current user automatically
   */
  const createWalletForUser = async (): Promise<WalletCreationResult> => {
    if (!currentUser) {
      return {
        success: false,
        error: 'No user logged in'
      };
    }

    setIsCreatingWallet(true);

    try {
      const result = await createUserWallet(currentUser.id, currentUser.email);
      
      if (result.success) {
        // Refresh the user profile to get the updated wallet address
        await refreshUserProfile();
        
        toast({
          title: "Wallet Created!",
          description: `Your wallet has been created and linked to your account. Address: ${result.walletAddress?.slice(0, 6)}...${result.walletAddress?.slice(-4)}`,
        });
      } else {
        toast({
          title: "Wallet Creation Failed",
          description: result.error || "Failed to create wallet",
          variant: "destructive",
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Wallet Creation Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsCreatingWallet(false);
    }
  };

  /**
   * Links an existing wallet to the current user
   */
  const linkWalletToUser = async (walletAddress: string): Promise<WalletCreationResult> => {
    if (!currentUser) {
      return {
        success: false,
        error: 'No user logged in'
      };
    }

    try {
      const result = await linkExistingWallet(currentUser.id, walletAddress);
      
      if (result.success) {
        await refreshUserProfile();
        
        toast({
          title: "Wallet Linked!",
          description: "Your wallet has been successfully linked to your account.",
        });
      } else {
        toast({
          title: "Wallet Linking Failed",
          description: result.error || "Failed to link wallet",
          variant: "destructive",
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Wallet Linking Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  /**
   * Gets the current user's wallet address
   */
  const getUserWallet = async (): Promise<string | null> => {
    if (!currentUser) {
      return null;
    }

    return await getUserWalletAddress(currentUser.id);
  };

  /**
   * Checks if the current user has a linked wallet
   */
  const checkUserHasWallet = async (): Promise<boolean> => {
    if (!currentUser) {
      return false;
    }

    return await hasLinkedWallet(currentUser.id);
  };

  /**
   * Disconnects the wallet from the current user
   */
  const disconnectUserWalletFromAccount = async (): Promise<WalletCreationResult> => {
    if (!currentUser) {
      return {
        success: false,
        error: 'No user logged in'
      };
    }

    try {
      const result = await disconnectUserWallet(currentUser.id);
      
      if (result.success) {
        await refreshUserProfile();
        
        toast({
          title: "Wallet Disconnected",
          description: "Your wallet has been disconnected from your account.",
        });
      } else {
        toast({
          title: "Wallet Disconnection Failed",
          description: result.error || "Failed to disconnect wallet",
          variant: "destructive",
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Wallet Disconnection Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  return {
    createWalletForUser,
    linkWalletToUser,
    getUserWallet,
    checkUserHasWallet,
    disconnectUserWalletFromAccount,
    isCreatingWallet,
    hasWallet: !!currentUser?.crypto_wallet_address,
    walletAddress: currentUser?.crypto_wallet_address
  };
} 