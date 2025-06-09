import { useConnect, useEmbeddedWallet } from "@thirdweb-dev/react";

interface WalletHookReturn {
  createAndConnectWallet: (loginMethod: string, emailOrSocialToken: string) => Promise<string>;
  disconnectWallet: () => Promise<void>;
  walletAddress: string | undefined;
  isConnected: boolean;
}

export function useWalletHook(): WalletHookReturn {
  const connect = useConnect();
  const embeddedWallet = useEmbeddedWallet();

  const createAndConnectWallet = async (loginMethod: string, emailOrSocialToken: string): Promise<string> => {
    try {
      // Check if wallet is already connected
      if (embeddedWallet.isConnected) {
        console.log("Wallet already connected.");
        return embeddedWallet.address || '';
      }

      // Connect using the specified method
      const walletInstance = await connect(embeddedWallet, {
        email: loginMethod === "email" ? emailOrSocialToken : undefined,
      });

      const address = await walletInstance.getAddress();
      console.log("Wallet created/connected:", address);
      return address;
    } catch (error) {
      console.error("Failed to create/connect wallet:", error);
      throw error;
    }
  };

  const disconnectWallet = async (): Promise<void> => {
    if (embeddedWallet.isConnected) {
      await embeddedWallet.disconnect();
      console.log("Wallet disconnected.");
    }
  };

  return { 
    createAndConnectWallet, 
    disconnectWallet, 
    walletAddress: embeddedWallet.address,
    isConnected: embeddedWallet.isConnected 
  };
} 