import { useActiveAccount } from "thirdweb/react";
import { useEffect, useState } from "react";
import { TOKEN_CONTRACT_ADDRESS } from "./reward-system-rules";
import { polygon } from "viem/chains";
import { createPublicClient, http } from "viem";
import ERC20_ABI from "./ERC20_ABI.json";

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(),
});

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

export function useKanaCoinBalance(walletAddress?: string) {
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) {
      setBalance(null);
      return;
    }
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    async function fetchBalance() {
      try {
        const functionAbi = (ERC20_ABI as any[]).filter((item) => item.type === "function");
        const rawBalance = await publicClient.readContract({
          abi: functionAbi,
          address: TOKEN_CONTRACT_ADDRESS as `0x${string}`,
          functionName: "balanceOf",
          args: [walletAddress as `0x${string}`],
        });
        const decimals = await publicClient.readContract({
          abi: functionAbi,
          address: TOKEN_CONTRACT_ADDRESS as `0x${string}`,
          functionName: "decimals",
          args: [],
        });
        const formatted = (Number(rawBalance) / 10 ** Number(decimals)).toString();
        if (isMounted) setBalance(formatted);
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to fetch balance");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchBalance();
    return () => {
      isMounted = false;
    };
  }, [walletAddress]);

  return { balance, isLoading, error };
} 