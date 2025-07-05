import React, { useEffect, useState } from 'react';
import { useWalletHook } from '../../wallet/useWalletHook.ts';
import { WalletConnectButton } from '../../wallet/ConnectButton';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { sendReward } from '@/services/rewardService';

export function WalletTest() {
  const { walletAddress, isConnected, isProviderReady } = useWalletHook();
  const { toast } = useToast();
  const { currentUser, isLoading: userLoading } = useAuth();
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    // Debug log for diagnosing loading state
    console.log('WalletTest debug:', { userLoading, isProviderReady, currentUser });
    const timer = setTimeout(() => setWaited(true), 10000);
    return () => clearTimeout(timer);
  }, [userLoading, isProviderReady, currentUser]);

  if (userLoading || !isProviderReady) {
    if (waited) {
      return (
        <div className="p-8 max-w-4xl mx-auto">
          <div className="p-6 border rounded-lg bg-red-50">
            <h2 className="text-xl font-semibold mb-4 text-red-800">Wallet Provider Error</h2>
            <div className="space-y-2 text-red-700">
              <p>Wallet provider failed to initialize. Please check:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Your .env file has VITE_THIRDWEB_CLIENT_ID set</li>
                <li>Your network connection</li>
                <li>Your Thirdweb Client ID is valid</li>
              </ul>
              <p className="mt-4">
                <strong>Setup Steps:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Create a .env file in the root directory</li>
                <li>Add: <code>VITE_THIRDWEB_CLIENT_ID=your_client_id_here</code></li>
                <li>Get your Client ID from: <a href="https://portal.thirdweb.com/typescript/v5/client" target="_blank" rel="noopener noreferrer" className="underline">Thirdweb Portal</a></li>
                <li>Restart your development server</li>
              </ol>
            </div>
          </div>
        </div>
      );
    }
    return <div>Loading...</div>;
  }
  if (!currentUser) return <div>Please log in to use the wallet.</div>;

  const handleDemoReward = async () => {
    try {
      if (!walletAddress) throw new Error('No wallet connected');
      const result = await sendReward(walletAddress, 'TASK_COMPLETION');
      toast({
        title: 'Reward Sent',
        description: `Tx: ${result.txHash}`,
      });
    } catch (error: any) {
      toast({
        title: 'Reward Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Wallet Test</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Wallet Status</CardTitle>
            <CardDescription>Current wallet connection status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Provider Ready:</strong> {isProviderReady ? "Yes" : "No"}</p>
              <p><strong>Connected:</strong> {isConnected ? "Yes" : "No"}</p>
              <p><strong>Address:</strong> {walletAddress || "Not connected"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>Connect your wallet using Thirdweb</CardDescription>
          </CardHeader>
          <CardContent>
            <WalletConnectButton />
          </CardContent>
        </Card>

        {isConnected && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-green-800">Connected Successfully!</CardTitle>
              <CardDescription>Your wallet is now connected</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm">
                  <span className="font-semibold">Wallet Address:</span>
                  <p className="text-xs break-all mt-1 bg-gray-100 p-2 rounded">{walletAddress}</p>
                </div>
                <Button
                  onClick={handleDemoReward}
                  variant="default"
                  className="w-full"
                >
                  Send Demo Reward
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 