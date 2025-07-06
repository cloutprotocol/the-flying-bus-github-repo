import React from 'react';
import { useWalletIntegration } from '@/hooks/useWalletIntegration';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { WalletConnectButton } from '../../wallet/ConnectButton';

export function WalletSettings() {
  const { 
    createWalletForUser, 
    linkWalletToUser, 
    disconnectUserWalletFromAccount,
    hasWallet, 
    walletAddress, 
    isCreatingWallet 
  } = useWalletIntegration();
  const { toast } = useToast();

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
    // This would need to get the connected wallet address from the Thirdweb hook
    // For now, we'll show a message to connect first
    toast({
      title: 'Connect Wallet First',
      description: 'Please connect your wallet using the button above, then click "Link Wallet" again.',
    });
  };

  const handleDisconnectWallet = async () => {
    const result = await disconnectUserWalletFromAccount();
    if (result.success) {
      toast({
        title: 'Wallet Disconnected',
        description: 'Your wallet has been disconnected from your account.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Wallet Settings</h2>
        <p className="text-gray-600">
          Manage your linked wallet for receiving rewards and participating in the platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wallet Status</CardTitle>
          <CardDescription>Current wallet connection and account linking status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Account Wallet:</span>
            <div className="flex items-center gap-2">
              {hasWallet ? (
                <>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Linked
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                  </span>
                </>
              ) : (
                <Badge variant="secondary">Not Linked</Badge>
              )}
            </div>
          </div>

          {hasWallet && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ Your wallet is linked to your account and ready to receive rewards!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connect Thirdweb Wallet</CardTitle>
          <CardDescription>Connect a wallet to link it to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <WalletConnectButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wallet Actions</CardTitle>
          <CardDescription>Create or manage your linked wallet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasWallet ? (
            <>
              <Button
                onClick={handleCreateWallet}
                disabled={isCreatingWallet}
                className="w-full"
              >
                {isCreatingWallet ? "Creating..." : "Create New Wallet for Account"}
              </Button>
              
              <Button
                onClick={handleLinkWallet}
                variant="outline"
                className="w-full"
              >
                Link Connected Wallet
              </Button>
            </>
          ) : (
            <Button
              onClick={handleDisconnectWallet}
              variant="destructive"
              className="w-full"
            >
              Disconnect Wallet from Account
            </Button>
          )}
        </CardContent>
      </Card>

      {hasWallet && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Wallet Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="text-blue-800">Your linked wallet enables:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Automatic reward distribution</li>
                <li>Participation in community activities</li>
                <li>Storage of achievements and badges</li>
                <li>Seamless integration with the platform</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 