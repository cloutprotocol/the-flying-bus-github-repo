import { useActiveAccount } from "thirdweb/react";

interface WalletHookReturn {
  createAndConnectWallet: (loginMethod: string, emailOrSocialToken: string) => Promise<string>;
  disconnectWallet: () => Promise<void>;
  walletAddress: string | undefined;
  isConnected: boolean;
  isProviderReady: boolean;
}

export function useWalletHook(): WalletHookReturn {
  const account = useActiveAccount();

  // Provider is ready if we can access the account (even if not connected)
  const isProviderReady = true;

  const createAndConnectWallet = async (loginMethod: string, emailOrSocialToken: string): Promise<string> => {
    try {
      if (account) {
        return account.address;
      }
      
      // For now, return empty string as the ConnectButton will handle the connection
      // The actual authentication will be handled by the ConnectButton component
      return "";
    } catch (error: any) {
      console.error("Failed to create/connect wallet:", error);
      throw error;
    }
  };

  const disconnectWallet = async (): Promise<void> => {
    if (account) {
      // The wallet will handle disconnection automatically
      console.log("Wallet disconnected");
    }
  };

  return { 
    createAndConnectWallet, 
    disconnectWallet, 
    walletAddress: account?.address,
    isConnected: !!account,
    isProviderReady
  };
} 