import { useConnect, useActiveWallet } from "thirdweb/react";
import { inAppWallet } from "thirdweb/wallets";

interface WalletHookReturn {
  createAndConnectWallet: (loginMethod: string, emailOrSocialToken: string) => Promise<string>;
  disconnectWallet: () => Promise<void>;
  walletAddress: string | undefined;
  isConnected: boolean;
  isProviderReady: boolean;
}

export function useWalletHook(): WalletHookReturn {
  const { connect } = useConnect();
  const activeWallet = useActiveWallet();

  const isInAppWallet = (wallet: any): wallet is {
    authenticate: Function;
    isConnected: boolean;
    address?: string;
    disconnect: () => Promise<void>;
  } => !!wallet && typeof wallet.authenticate === "function";

  // Consider provider ready if active wallet instance is available
  const isProviderReady = !!activeWallet;

  const createAndConnectWallet = async (loginMethod: string, emailOrSocialToken: string): Promise<string> => {
    try {
      if (!isInAppWallet(activeWallet)) {
        throw new Error("In-app wallet is not available.");
      }
      if (activeWallet.isConnected) {
        return activeWallet.address || '';
      }

      let authData;
      if (loginMethod === "email") {
        // Step 1: Send code
        await activeWallet.authenticate({ strategy: "email_verification", email: emailOrSocialToken });
        // Step 2: Prompt user for code
        const verificationCode = window.prompt("Enter the verification code sent to your email:");
        if (!verificationCode) throw new Error("Verification code is required.");
        authData = await activeWallet.authenticate({
          strategy: "email_verification",
          email: emailOrSocialToken,
          verificationCode,
        });
      } else if (loginMethod === "google") {
        authData = await activeWallet.authenticate({ strategy: "google" });
      } else if (loginMethod === "apple") {
        authData = await activeWallet.authenticate({ strategy: "apple" });
      } else {
        throw new Error("Unsupported login method");
      }

      const walletInstance = await connect(inAppWallet(), authData);

      const address = await walletInstance.getAddress();
      return address;
    } catch (error: any) {
      console.error("Failed to create/connect wallet:", error);
      throw error;
    }
  };

  const disconnectWallet = async (): Promise<void> => {
    if (isInAppWallet(activeWallet) && activeWallet.isConnected) {
      await activeWallet.disconnect();
    }
  };

  return { 
    createAndConnectWallet, 
    disconnectWallet, 
    walletAddress: isInAppWallet(activeWallet) ? activeWallet.address : undefined,
    isConnected: isInAppWallet(activeWallet) ? !!activeWallet.isConnected : false,
    isProviderReady
  };
} 