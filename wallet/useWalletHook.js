import { useConnect, useEmbeddedWallet } from "@thirdweb-dev/react";

export function useWalletHook() {
  const connect = useConnect();
  const embeddedWallet = useEmbeddedWallet();

  const createAndConnectWallet = async (loginMethod, emailOrSocialToken) => {
    try {
      // Check if wallet is already connected
      if (embeddedWallet.isConnected) {
        console.log("Wallet already connected.");
        return embeddedWallet.address;
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

  const disconnectWallet = async () => {
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