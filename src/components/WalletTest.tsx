import React from 'react';
import { useWalletHook } from '../../wallet/useWalletHook.ts';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export function WalletTest() {
  const { createAndConnectWallet, disconnectWallet, walletAddress, isConnected } = useWalletHook();
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      const address = await createAndConnectWallet("email", "test@example.com");
      toast({
        title: "Wallet Connected",
        description: `Connected to: ${address}`,
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      toast({
        title: "Wallet Disconnected",
        description: "Successfully disconnected wallet",
      });
    } catch (error) {
      toast({
        title: "Disconnect Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Wallet Test</CardTitle>
        <CardDescription>Test your Thirdweb wallet connection</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isConnected ? (
            <>
              <div className="text-sm">
                <span className="font-semibold">Connected Address:</span>
                <p className="text-xs break-all mt-1">{walletAddress}</p>
              </div>
              <Button 
                onClick={handleDisconnect}
                variant="destructive"
                className="w-full"
              >
                Disconnect Wallet
              </Button>
            </>
          ) : (
            <Button 
              onClick={handleConnect}
              className="w-full"
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 