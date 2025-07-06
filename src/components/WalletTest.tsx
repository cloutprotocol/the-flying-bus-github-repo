import React from 'react';
import { useWalletHook } from '../../wallet/useWalletHook.ts';
import { WalletConnectButton } from '../../wallet/ConnectButton';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { useWalletIntegration } from '@/hooks/useWalletIntegration';
import { sendReward } from '@/services/rewardService';

export function WalletTest() {
  const { walletAddress, isConnected, isProviderReady } = useWalletHook();
  const { toast } = useToast();
  const { currentUser, isLoading: userLoading } = useAuth();
  const { 
    createWalletForUser, 
    linkWalletToUser, 
    hasWallet, 
    walletAddress: userWalletAddress,
    isCreatingWallet 
  } = useWalletIntegration();

  if (userLoading) {
    return <div>Loading user...</div>;
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

  const handleCreateWallet = async () => {
    const result = await createWalletForUser();
    if (result.success) {
      toast({
        title: 'Wallet Created Successfully!',
        description: 'Your wallet has been created and linked to your account.',
      });
    }
  };

  const handleLinkWallet = async () => {
    if (!walletAddress) {
      toast({
        title: 'No Wallet Connected',
        description: 'Please connect a wallet first to link it to your account.',
        variant: 'destructive',
      });
      return;
    }

    const result = await linkWalletToUser(walletAddress);
    if (result.success) {
      toast({
        title: 'Wallet Linked Successfully!',
        description: 'Your connected wallet has been linked to your account.',
      });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Wallet Integration Test</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Account Status</CardTitle>
            <CardDescription>Your account and wallet integration status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>User:</strong> {currentUser.display_name}</p>
              <p><strong>Email:</strong> {currentUser.email}</p>
              <p><strong>Has Linked Wallet:</strong> {hasWallet ? "Yes" : "No"}</p>
              {hasWallet && (
                <p><strong>Linked Wallet:</strong> {userWalletAddress?.slice(0, 6)}...{userWalletAddress?.slice(-4)}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wallet Connection Status</CardTitle>
            <CardDescription>Current Thirdweb wallet connection</CardDescription>
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
            <CardTitle>Connect Thirdweb Wallet</CardTitle>
            <CardDescription>Connect your wallet using Thirdweb</CardDescription>
          </CardHeader>
          <CardContent>
            <WalletConnectButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wallet Integration Actions</CardTitle>
            <CardDescription>Link your wallet to your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleCreateWallet}
              disabled={isCreatingWallet || hasWallet}
              variant="default"
              className="w-full"
            >
              {isCreatingWallet ? "Creating..." : hasWallet ? "Wallet Already Created" : "Create Wallet for Account"}
            </Button>
            
            <Button
              onClick={handleLinkWallet}
              disabled={!isConnected || hasWallet}
              variant="outline"
              className="w-full"
            >
              {hasWallet ? "Wallet Already Linked" : "Link Connected Wallet"}
            </Button>
          </CardContent>
        </Card>

        {isConnected && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-green-800">Wallet Connected Successfully!</CardTitle>
              <CardDescription>Your Thirdweb wallet is now connected</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm">
                  <span className="font-semibold">Connected Wallet Address:</span>
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

        {hasWallet && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-blue-800">Account Wallet Linked!</CardTitle>
              <CardDescription>Your account has a linked wallet</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm">
                  <span className="font-semibold">Linked Wallet Address:</span>
                  <p className="text-xs break-all mt-1 bg-blue-50 p-2 rounded">{userWalletAddress}</p>
                </div>
                <p className="text-sm text-gray-600">
                  This wallet is automatically linked to your account and will be used for rewards and transactions.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 