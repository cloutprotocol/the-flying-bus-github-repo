import React, { useEffect, useState } from 'react';
import { useWalletIntegration } from '@/hooks/useWalletIntegration';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface AutoWalletCreationProps {
  onWalletCreated?: (walletAddress: string) => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

export function AutoWalletCreation({ 
  onWalletCreated, 
  onSkip, 
  showSkip = true 
}: AutoWalletCreationProps) {
  const { currentUser } = useAuth();
  const { createWalletForUser, hasWallet, walletAddress, isCreatingWallet } = useWalletIntegration();
  const { toast } = useToast();
  const [hasAttemptedCreation, setHasAttemptedCreation] = useState(false);

  useEffect(() => {
    // Automatically attempt to create wallet for new users
    if (currentUser && !hasWallet && !hasAttemptedCreation) {
      setHasAttemptedCreation(true);
      handleCreateWallet();
    }
  }, [currentUser, hasWallet, hasAttemptedCreation]);

  const handleCreateWallet = async () => {
    if (!currentUser) return;

    const result = await createWalletForUser();
    
    if (result.success && result.walletAddress) {
      onWalletCreated?.(result.walletAddress);
      toast({
        title: "Wallet Created Successfully!",
        description: "Your wallet has been automatically created and linked to your account.",
      });
    } else {
      toast({
        title: "Wallet Creation Failed",
        description: "We couldn't create your wallet automatically. You can try again or skip for now.",
        variant: "destructive",
      });
    }
  };

  const handleSkip = () => {
    onSkip?.();
    toast({
      title: "Wallet Creation Skipped",
      description: "You can create your wallet later from your profile settings.",
    });
  };

  if (hasWallet) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">✅ Wallet Ready!</CardTitle>
          <CardDescription>Your wallet is already linked to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <p><strong>Wallet Address:</strong> {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</p>
            <p className="text-green-700 mt-2">
              Your wallet is ready to receive rewards and participate in the platform!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🎁 Create Your Wallet</CardTitle>
        <CardDescription>
          Get your free wallet to start earning rewards and participating in the platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          <p>We'll create a secure wallet for you that's automatically linked to your account.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Receive rewards for reading articles</li>
            <li>Participate in community activities</li>
            <li>Store your achievements and badges</li>
            <li>Secure and easy to use</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleCreateWallet}
            disabled={isCreatingWallet}
            className="flex-1"
          >
            {isCreatingWallet ? "Creating Wallet..." : "Create My Wallet"}
          </Button>
          
          {showSkip && (
            <Button
              onClick={handleSkip}
              variant="outline"
              disabled={isCreatingWallet}
            >
              Skip for Now
            </Button>
          )}
        </div>

        {isCreatingWallet && (
          <div className="text-sm text-blue-600">
            <p>Creating your wallet... This may take a few moments.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 